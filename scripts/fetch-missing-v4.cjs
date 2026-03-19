#!/usr/bin/env node
/**
 * Fetch email HTML using post ID as cursor (not slug).
 * This avoids the duplicate-slug issue where cursor-by-slug skips posts.
 * Only fetches for slugs we're still missing.
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
  console.log('Slugs still needed:', neededSlugs.size);

  // Cursor on p.id (UUID), which is unique per post
  // Accept starting cursor from command line for resume
  const CURSOR_FILE = 'scripts/.fetch-cursor.txt';
  let cursor = process.argv[2] || '00000000-0000-0000-0000-000000000000';
  try { if (!process.argv[2] && fs.existsSync(CURSOR_FILE)) cursor = fs.readFileSync(CURSOR_FILE, 'utf8').trim(); } catch {}
  if (cursor !== '00000000-0000-0000-0000-000000000000') console.log('Resuming from cursor:', cursor.slice(0, 12) + '...');
  let fetched = 0;
  let scanned = 0;
  let skipped = 0;
  let retries = 0;

  while (true) {
    try {
      const rows = await queryMetabase(
        `SELECT p.id, p.slug, pp.html
         FROM posts p
         JOIN post_previews pp ON pp.post_id = p.id
         WHERE p.platform = 2
           AND p.id > '${cursor}'
           AND EXISTS (SELECT 1 FROM ad_network_placements anp WHERE anp.post_id = p.id)
         ORDER BY p.id
         LIMIT 100`
      );

      if (rows.length === 0) break;
      scanned += rows.length;
      cursor = rows[rows.length - 1][0]; // UUID of last post

      for (const [, slug, html] of rows) {
        if (existingHtml.has(slug)) {
          skipped++;
          continue;
        }
        if (neededSlugs.has(slug) && html && html.length > 100) {
          const cleaned = cleanHtml(html);
          fs.writeFileSync(path.join(EMAILS_DIR, slug + '.html'), cleaned);
          existingHtml.add(slug);
          neededSlugs.delete(slug);
          fetched++;
        }
      }

      retries = 0;
      // Save cursor for resume
      fs.writeFileSync(CURSOR_FILE, cursor);
      if (scanned % 5000 < 100) {
        console.log(`Scanned: ${scanned}, New: ${fetched}, Skipped: ${skipped}, Still need: ${neededSlugs.size}`);
      }

      if (rows.length < 100) break;
    } catch (err) {
      console.error('Error:', err.message.slice(0, 200));
      retries++;
      if (retries > 20) { console.error('Too many retries'); break; }
      const delay = Math.min(3000 * Math.pow(2, retries - 1), 30000);
      console.log(`Retrying in ${delay/1000}s (attempt ${retries})...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  console.log('\nDone!');
  console.log('Total scanned:', scanned);
  console.log('New files fetched:', fetched);
  console.log('Skipped (existed):', skipped);
  console.log('Still missing:', neededSlugs.size);
  console.log('Total HTML files:', fs.readdirSync(EMAILS_DIR).filter(f => f.endsWith('.html')).length);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
