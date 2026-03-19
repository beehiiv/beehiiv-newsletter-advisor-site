/**
 * Pre-build per-advertiser JSON files so advertiser detail pages
 * load with a single request instead of scanning 531 page files.
 *
 * Output: public/data/adv/{Advertiser-Name}.json
 * Each file contains up to 500 ProductItems for that advertiser.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const ADV_DIR = path.join(DATA_DIR, 'adv');
const MAX_ITEMS = 500;

// Ensure output dir exists
if (!fs.existsSync(ADV_DIR)) fs.mkdirSync(ADV_DIR, { recursive: true });

// Load advertiser details to know which advertisers exist
const advDetails = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'advertiser-details.json'), 'utf8'));
const advNames = new Set(advDetails.map(a => a.name));
console.log(`Building pages for ${advNames.size} advertisers...`);

// Collect items per advertiser
const buckets = new Map();
for (const name of advNames) buckets.set(name, []);

const pageFiles = fs.readdirSync(DATA_DIR)
  .filter(f => f.startsWith('page-') && f.endsWith('.json'))
  .sort();

console.log(`Scanning ${pageFiles.length} page files...`);

let scanned = 0;
const fullBuckets = new Set();

for (const file of pageFiles) {
  if (fullBuckets.size === advNames.size) break;
  const items = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
  scanned += items.length;

  for (const item of items) {
    if (!item.advertisers) continue;
    for (const a of item.advertisers) {
      if (fullBuckets.has(a.name)) continue;
      const bucket = buckets.get(a.name);
      if (bucket) {
        bucket.push(item);
        if (bucket.length >= MAX_ITEMS) fullBuckets.add(a.name);
      }
    }
  }

  if (scanned % 50000 < 500) {
    console.log(`  Scanned ${scanned} items, ${fullBuckets.size}/${advNames.size} advertisers full`);
  }
}

// Write per-advertiser JSON files
let written = 0;
let totalItems = 0;
for (const [name, items] of buckets) {
  if (items.length === 0) continue;
  const slug = name.replace(/\s+/g, '-');
  const outPath = path.join(ADV_DIR, `${slug}.json`);
  fs.writeFileSync(outPath, JSON.stringify(items));
  written++;
  totalItems += items.length;
}

console.log(`\nWrote ${written} advertiser files to ${ADV_DIR}`);
console.log(`Total items across all files: ${totalItems}`);

// Show sizes of largest files
const files = fs.readdirSync(ADV_DIR).map(f => ({
  name: f,
  size: fs.statSync(path.join(ADV_DIR, f)).size
})).sort((a, b) => b.size - a.size);

console.log(`\nLargest files:`);
for (const f of files.slice(0, 10)) {
  console.log(`  ${f.name}: ${(f.size / 1024).toFixed(0)} KB`);
}
