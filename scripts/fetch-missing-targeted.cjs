#!/usr/bin/env node
/**
 * Fetch email HTML for posts that are still missing, by querying in slug batches.
 * Uses simple IN query without DISTINCT ON.
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
  const existingHtml = new Set(
    fs.readdirSync(EMAILS_DIR).filter(f => f.endsWith('.html')).map(f => f.slice(0, -5))
  );
  console.log('Existing HTML files:', existingHtml.size);

  const missingSlugs = [];
  const pageFiles = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('page-') && f.endsWith('.json')).sort();
  for (const pf of pageFiles) {
    const items = JSON.parse(fs.readFileSync(path.join(DATA_DIR, pf), 'utf8'));
    for (const item of items) {
      if (!existingHtml.has(item.id)) {
        missingSlugs.push(item.id);
      }
    }
  }
  console.log('Missing slugs to fetch:', missingSlugs.length);

  const BATCH = 30;
  let fetched = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < missingSlugs.length; i += BATCH) {
    const batch = missingSlugs.slice(i, i + BATCH);
    const slugList = batch.map(s => "'" + s.replace(/'/g, "''") + "'").join(',');

    try {
      const rows = await queryMetabase(
        `SELECT p.slug, pp.html
         FROM posts p
         JOIN post_previews pp ON pp.post_id = p.id
         WHERE p.slug IN (${slugList})
         ORDER BY p.slug`
      );

      const found = new Set();
      for (const [slug, html] of rows) {
        if (found.has(slug)) continue; // skip dupes, take first
        found.add(slug);
        if (html && html.length > 100) {
          const cleaned = cleanHtml(html);
          fs.writeFileSync(path.join(EMAILS_DIR, slug + '.html'), cleaned);
          fetched++;
        }
      }
      notFound += batch.length - found.size;
    } catch (err) {
      console.error('Error at batch', i, ':', err.message.slice(0, 200));
      errors++;
      if (errors > 10) { console.error('Too many errors, stopping'); break; }
    }

    if ((i + BATCH) % 300 === 0 || i + BATCH >= missingSlugs.length) {
      console.log(`Progress: ${i + batch.length}/${missingSlugs.length} checked, ${fetched} fetched, ${notFound} not found`);
    }
  }

  console.log('\nDone!');
  console.log('Total fetched:', fetched);
  console.log('Not found in post_previews:', notFound);
  console.log('Total HTML files now:', fs.readdirSync(EMAILS_DIR).filter(f => f.endsWith('.html')).length);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
