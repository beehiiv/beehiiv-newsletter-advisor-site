/**
 * Pre-build per-tag JSON files so category pages
 * load with a single request instead of scanning page files.
 *
 * Output: public/data/tag/{tag-slug}.json
 * Each file contains up to 500 items for that tag.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const TAG_DIR = path.join(DATA_DIR, 'tag');
const MAX_ITEMS = 500;

// Ensure output dir exists
if (!fs.existsSync(TAG_DIR)) fs.mkdirSync(TAG_DIR, { recursive: true });

// Load tags.json to know which tags exist
const tags = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'tags.json'), 'utf8'));
const tagNames = Object.keys(tags);
console.log(`Building pages for ${tagNames.length} tags...`);

// Collect items per tag
const buckets = new Map();
for (const name of tagNames) buckets.set(name, []);

const pageFiles = fs.readdirSync(DATA_DIR)
  .filter(f => f.startsWith('page-') && f.endsWith('.json'))
  .sort();

console.log(`Scanning ${pageFiles.length} page files...`);

const fullBuckets = new Set();

for (const file of pageFiles) {
  if (fullBuckets.size === tagNames.length) break;
  let items;
  try {
    items = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
  } catch { continue; }

  for (const item of items) {
    if (!item.tags) continue;
    for (const tag of item.tags) {
      if (fullBuckets.has(tag)) continue;
      const bucket = buckets.get(tag);
      if (bucket) {
        bucket.push(item);
        if (bucket.length >= MAX_ITEMS) fullBuckets.add(tag);
      }
    }
  }
}

// Write per-tag JSON files
let written = 0;
let totalItems = 0;
for (const [name, items] of buckets) {
  if (items.length === 0) continue;
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
  const outPath = path.join(TAG_DIR, `${slug}.json`);
  fs.writeFileSync(outPath, JSON.stringify(items));
  written++;
  totalItems += items.length;
}

console.log(`\nWrote ${written} tag files to ${TAG_DIR}`);
console.log(`Total items across all files: ${totalItems}`);

// Show sizes
const files = fs.readdirSync(TAG_DIR).map(f => ({
  name: f,
  size: fs.statSync(path.join(TAG_DIR, f)).size
})).sort((a, b) => b.size - a.size);

console.log(`\nLargest files:`);
for (const f of files.slice(0, 10)) {
  console.log(`  ${f.name}: ${(f.size / 1024).toFixed(0)} KB`);
}
