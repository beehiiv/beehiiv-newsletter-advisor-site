#!/usr/bin/env node
/**
 * Fetch email HTML from Metabase post_previews table.
 * Only for posts: platform=2 (web+email), have ad placements, have a read online URL.
 * Uses cursor-based pagination on slug.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const METABASE_BASE = 'https://beehiiv.metabaseapp.com';
const METABASE_URL = `${METABASE_BASE}/api/dataset`;
const EMAILS_DIR = 'public/emails';
const DATA_DIR = 'public/data';
const BATCH_SIZE = 100;

let SESSION = null;

async function getSessionToken() {
  const email = process.env.METABASE_EMAIL;
  const password = process.env.METABASE_PASSWORD;
  if (!email || !password) throw new Error('METABASE_EMAIL and METABASE_PASSWORD env vars are required');
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ username: email, password });
    const url = new URL(`${METABASE_BASE}/api/session`);
    const req = https.request({
      hostname: url.hostname, path: url.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 30000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data).id); }
        catch (e) { reject(new Error('Auth parse error: ' + data.slice(0, 300))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function queryMetabase(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ database: 2, type: 'native', native: { query: sql } });
    const url = new URL(METABASE_URL);
    const req = https.request({
      hostname: url.hostname, path: url.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Metabase-Session': SESSION, 'Content-Length': Buffer.byteLength(body) },
      timeout: 600000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data).data?.rows || []); }
        catch (e) { reject(new Error('Parse error: ' + data.slice(0, 300))); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

function cleanHtml(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\{\{[A-Z_]+\}\}/g, '');
}

async function main() {
  SESSION = await getSessionToken();
  console.log('Authenticated with Metabase');

  const existing = new Set(fs.readdirSync(EMAILS_DIR).filter(f => f.endsWith('.html')).map(f => f.slice(0, -5)));
  console.log(`Existing HTML files: ${existing.size}`);

  let fetched = 0, skipped = 0, errors = 0;
  let cursor = '';

  while (true) {
    const sql = `SELECT p.slug, pp.html
FROM posts p
JOIN post_previews pp ON pp.post_id = p.id
WHERE p.platform = 2
AND p.slug > '${cursor.replace(/'/g, "''")}'
AND EXISTS (SELECT 1 FROM ad_network_placements anp WHERE anp.post_id = p.id)
ORDER BY p.slug
LIMIT ${BATCH_SIZE}`;

    let rows;
    try {
      rows = await queryMetabase(sql);
    } catch (e) {
      console.error(`Error at cursor '${cursor}': ${e.message}`);
      errors++;
      if (errors > 20) { console.error('Too many errors, stopping.'); break; }
      // Wait and retry
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }

    if (!rows.length) break;

    for (const [slug, html] of rows) {
      cursor = slug;
      if (existing.has(slug)) { skipped++; continue; }
      if (html) {
        fs.writeFileSync(path.join(EMAILS_DIR, `${slug}.html`), cleanHtml(html), 'utf8');
        existing.add(slug);
        fetched++;
      }
    }

    console.log(`Progress: fetched=${fetched}, skipped=${skipped}, cursor='${cursor.slice(0, 50)}' (${rows.length} rows)`);

    if (rows.length < BATCH_SIZE) break;
  }

  console.log(`\nFetch done! ${fetched} new HTML files. ${skipped} already existed.`);
  console.log(`Total HTML files: ${existing.size}`);

  // Update page JSON
  console.log('\nUpdating page JSON...');
  let added = 0, removed = 0;
  const pages = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('page-') && f.endsWith('.json')).sort();
  for (const pf of pages) {
    const fp = path.join(DATA_DIR, pf);
    const items = JSON.parse(fs.readFileSync(fp, 'utf8'));
    let changed = false;
    for (const item of items) {
      if (!item.htmlFile && existing.has(item.id)) {
        item.htmlFile = `/emails/${item.id}.html`;
        changed = true;
        added++;
      } else if (item.htmlFile && !existing.has(item.id)) {
        delete item.htmlFile;
        changed = true;
        removed++;
      }
    }
    if (changed) fs.writeFileSync(fp, JSON.stringify(items));
  }
  console.log(`Added htmlFile: ${added}, Removed broken: ${removed}`);

  // Final count
  let withHtml = 0, without = 0;
  for (const pf of pages) {
    const items = JSON.parse(fs.readFileSync(path.join(DATA_DIR, pf), 'utf8'));
    for (const i of items) { if (i.htmlFile) withHtml++; else without++; }
  }
  console.log(`Final: ${withHtml} with HTML, ${without} without`);
}

main().catch(console.error);
