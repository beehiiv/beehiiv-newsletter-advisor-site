/**
 * Pre-build per-publisher JSON files so publisher pages
 * load with a single request instead of scanning all page files.
 *
 * Output: public/data/pub/{publisher-slug}.json
 * Each file contains up to 500 items for that publisher.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const PUB_DIR = path.join(DATA_DIR, 'pub');
const MAX_ITEMS = 500;

// Ensure output dir exists
if (!fs.existsSync(PUB_DIR)) fs.mkdirSync(PUB_DIR, { recursive: true });

// Collect items per publisher
const buckets = new Map();

const pageFiles = fs.readdirSync(DATA_DIR)
  .filter(f => f.startsWith('page-') && f.endsWith('.json'))
  .sort();

console.log(`Scanning ${pageFiles.length} page files...`);

for (const file of pageFiles) {
  let items;
  try {
    items = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
  } catch { continue; }

  for (const item of items) {
    const pubName = item.author || item.publisher?.name;
    if (!pubName) continue;

    if (!buckets.has(pubName)) buckets.set(pubName, []);
    const bucket = buckets.get(pubName);
    if (bucket.length < MAX_ITEMS) {
      bucket.push(item);
    }
  }
}

// Write per-publisher JSON files
let written = 0;
let totalItems = 0;
for (const [name, items] of buckets) {
  if (items.length === 0) continue;
  const slug = name.replace(/\s+/g, '-').replace(/[\/\\:*?"<>|]/g, '_');
  const outPath = path.join(PUB_DIR, `${slug}.json`);
  fs.writeFileSync(outPath, JSON.stringify(items));
  written++;
  totalItems += items.length;
}

console.log(`\nWrote ${written} publisher files to ${PUB_DIR}`);
console.log(`Total items across all files: ${totalItems}`);

// Show sizes
const files = fs.readdirSync(PUB_DIR).map(f => ({
  name: f,
  size: fs.statSync(path.join(PUB_DIR, f)).size
})).sort((a, b) => b.size - a.size);

console.log(`\nLargest files:`);
for (const f of files.slice(0, 10)) {
  console.log(`  ${f.name}: ${(f.size / 1024).toFixed(0)} KB`);
}
