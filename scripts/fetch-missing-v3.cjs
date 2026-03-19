#!/usr/bin/env node
/**
 * Two-pass approach:
 * 1. Scan post_previews for slugs (no HTML) to find which missing posts have previews
 * 2. Fetch HTML only for those slugs using cursor-based approach on slug
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

  // Use cursor-based approach on slug, but scan ALL posts with post_previews
  // (no platform or ad filter since we already know these posts are on our site)
  // Fetch HTML in small batches to avoid timeout
  let cursor = '';
  let fetched = 0;
  let scanned = 0;
  let retries = 0;

  while (true) {
    try {
      const rows = await queryMetabase(
        `SELECT p.slug, pp.html
         FROM posts p
         JOIN post_previews pp ON pp.post_id = p.id
         WHERE p.slug > '${cursor.replace(/'/g, "''")}'
         ORDER BY p.slug
         LIMIT 100`
      );

      if (rows.length === 0) break;
      scanned += rows.length;

      const lastSlug = rows[rows.length - 1][0];

      // Process rows - save HTML for slugs we need
      const seenInBatch = new Set();
      for (const [slug, html] of rows) {
        if (seenInBatch.has(slug)) continue;
        seenInBatch.add(slug);

        if (neededSlugs.has(slug) && html && html.length > 100) {
          const cleaned = cleanHtml(html);
          fs.writeFileSync(path.join(EMAILS_DIR, slug + '.html'), cleaned);
          neededSlugs.delete(slug);
          fetched++;
        }
      }

      // Advance cursor past all instances of lastSlug
      cursor = lastSlug;
      retries = 0;

      if (scanned % 5000 < 100) {
        console.log(`Scanned: ${scanned}, Fetched: ${fetched}, Still need: ${neededSlugs.size}, Cursor: ${cursor.slice(0, 50)}`);
      }

      if (rows.length < 100) break;
    } catch (err) {
      console.error('Error at cursor', cursor.slice(0, 30), ':', err.message.slice(0, 100));
      retries++;
      if (retries > 5) { console.error('Too many retries, stopping'); break; }
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log('\nDone!');
  console.log('Total scanned:', scanned);
  console.log('Total fetched:', fetched);
  console.log('Still missing:', neededSlugs.size);
  console.log('Total HTML files:', fs.readdirSync(EMAILS_DIR).filter(f => f.endsWith('.html')).length);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
