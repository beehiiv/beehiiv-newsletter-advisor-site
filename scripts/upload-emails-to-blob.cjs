const { put, list } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');

const EMAILS_DIR = path.join(__dirname, '..', 'public', 'emails');
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN || process.env.emails_READ_WRITE_TOKEN;
const CONCURRENCY = 10;

if (!TOKEN) { console.error('No token'); process.exit(1); }

async function uploadWithRetry(blobPath, content, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const { url } = await put(blobPath, content, {
        access: 'public', token: TOKEN, addRandomSuffix: false, contentType: 'text/html', allowOverwrite: true,
      });
      return url;
    } catch (e) {
      if (attempt === retries - 1) throw e;
      const wait = Math.min(2000 * Math.pow(2, attempt), 30000);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

async function getExistingFiles() {
  const existing = new Set();
  let cursor;
  console.log('Checking already-uploaded files...');
  do {
    const result = await list({ token: TOKEN, prefix: 'emails/', limit: 1000, cursor });
    for (const blob of result.blobs) {
      const name = blob.pathname.replace('emails/', '');
      existing.add(name);
    }
    cursor = result.hasMore ? result.cursor : null;
    if (existing.size % 5000 < 1000) console.log(`  Found ${existing.size} existing...`);
  } while (cursor);
  console.log(`Found ${existing.size} already uploaded`);
  return existing;
}

async function main() {
  const allFiles = fs.readdirSync(EMAILS_DIR).filter(f => f.endsWith('.html'));
  console.log(`Found ${allFiles.length} local email files`);

  const existing = await getExistingFiles();
  const files = allFiles.filter(f => !existing.has(f));
  console.log(`${files.length} files need uploading (${existing.size} already done)`);

  if (files.length === 0) {
    console.log('All files already uploaded!');
    return;
  }

  let uploaded = 0;
  let failed = 0;
  const startTime = Date.now();

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (file) => {
        const content = fs.readFileSync(path.join(EMAILS_DIR, file));
        return uploadWithRetry(`emails/${file}`, content);
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') uploaded++;
      else { failed++; console.error(`FAIL: ${r.reason?.message}`); }
    }

    const total = uploaded + existing.size;
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = uploaded > 0 ? (uploaded / elapsed).toFixed(0) : 0;
    const eta = rate > 0 ? (((files.length - uploaded - failed) / rate) / 60).toFixed(1) : '?';
    if ((uploaded + failed) % 200 < CONCURRENCY || i + CONCURRENCY >= files.length) {
      console.log(`${total}/${allFiles.length} total | +${uploaded} new | ${failed} failed | ${rate}/s | ETA: ${eta}min`);
    }
  }

  console.log(`\nDone! ${uploaded} new uploads, ${failed} failed in ${((Date.now() - startTime) / 1000 / 60).toFixed(1)} min`);
  console.log(`Total in blob: ${uploaded + existing.size}/${allFiles.length}`);
}

main().catch(console.error);
