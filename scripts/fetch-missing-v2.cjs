#!/usr/bin/env node
/**
 * Fetch ALL post_previews using post_previews.id as cursor.
 * Only saves HTML for slugs we're missing.
 * Much faster than querying by slug IN (...).
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const SESSION = 'c1d959f2-5e24-41c8-be07-4e3c65d54c4e';
const METABASE_URL = 'https://beehiiv.metabaseapp.com/api/dataset';
const EMAILS_DIR = 'public/emails';
const DATA_DIR = 'public/data';

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
        catch (e) { reject(new Error('Parse error: ' + data.slice(0, 500))); }
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
  // Build set of slugs we need
  const existingHtml = new Set(
    fs.readdirSync(EMAILS_DIR).filter(f => f.endsWith('.html')).map(f => f.slice(0, -5))
  );
  console.log('Existing HTML files:', existingHtml.size);

  const neededSlugs = new Set();
  const pageFiles = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('page-') && f.endsWith('.json')).sort();
  for (const pf of pageFiles) {
    const items = JSON.parse(fs.readFileSync(path.join(DATA_DIR, pf), 'utf8'));
    for (const item of items) {
      if (!existingHtml.has(item.id)) {
        neededSlugs.add(item.id);
      }
    }
  }
  console.log('Slugs we need:', neededSlugs.size);

  // Paginate through post_previews by ID
  let cursor = '00000000-0000-0000-0000-000000000000';
  let fetched = 0;
  let scanned = 0;
  let done = false;

  while (!done) {
    try {
      const rows = await queryMetabase(
        `SELECT pp.id, p.slug, pp.html
         FROM post_previews pp
         JOIN posts p ON p.id = pp.post_id
         WHERE pp.id > '${cursor}'
         ORDER BY pp.id
         LIMIT 2000`
      );

      if (rows.length === 0) { done = true; break; }
      scanned += rows.length;
      cursor = rows[rows.length - 1][0];

      for (const [, slug, html] of rows) {
        if (neededSlugs.has(slug) && html && html.length > 100) {
          const cleaned = cleanHtml(html);
          fs.writeFileSync(path.join(EMAILS_DIR, slug + '.html'), cleaned);
          neededSlugs.delete(slug);
          fetched++;
        }
      }

      console.log(`Scanned: ${scanned}, Fetched: ${fetched}, Still need: ${neededSlugs.size}, Cursor: ${cursor.slice(0, 8)}...`);

      if (neededSlugs.size === 0) {
        console.log('All needed slugs found!');
        done = true;
      }

      if (rows.length < 2000) done = true;
    } catch (err) {
      console.error('Error:', err.message.slice(0, 200));
      // Wait and retry
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  console.log('\nDone!');
  console.log('Total fetched:', fetched);
  console.log('Still missing:', neededSlugs.size);
  console.log('Total HTML files:', fs.readdirSync(EMAILS_DIR).filter(f => f.endsWith('.html')).length);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
