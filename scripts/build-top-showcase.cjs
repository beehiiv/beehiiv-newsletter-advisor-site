const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const ITEMS_PER_ADVERTISER = 10;
const CANDIDATES_PER_ADVERTISER = 50; // collect more, then pick best

// Load advertiser details
const advDetails = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'advertiser-details.json'), 'utf8'));
const advMap = new Map(advDetails.map(a => [a.name, a]));

// Read TOP_ADVERTISERS from data.ts
const dataTs = fs.readFileSync(path.join(__dirname, '..', 'src', 'data.ts'), 'utf8');
const topMatch = dataTs.match(/export const TOP_ADVERTISERS:\s*string\[\]\s*=\s*\[([\s\S]*?)\];/);
if (!topMatch) { console.error('Could not parse TOP_ADVERTISERS'); process.exit(1); }

const TOP_ADVERTISERS = [];
for (const m of topMatch[1].matchAll(/'([^']+)'|"([^"]+)"/g)) {
  TOP_ADVERTISERS.push(m[1] || m[2]);
}
console.log(`Parsed ${TOP_ADVERTISERS.length} TOP_ADVERTISERS`);

// Pick top 20 that exist in advertiser-details
const topNames = TOP_ADVERTISERS.filter(n => advMap.has(n)).slice(0, 20);
console.log(`Using top ${topNames.length} advertisers:`, topNames);

// Collect candidate items per advertiser (more than we need, then rank)
const buckets = new Map(topNames.map(n => [n, []]));
const pageFiles = fs.readdirSync(DATA_DIR)
  .filter(f => f.startsWith('page-') && f.endsWith('.json'))
  .sort();

console.log(`Scanning ${pageFiles.length} page files...`);

let scanned = 0;
let allFull = false;

for (const file of pageFiles) {
  if (allFull) break;
  const items = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
  scanned += items.length;

  for (const item of items) {
    if (!item.advertisers) continue;
    for (const a of item.advertisers) {
      const bucket = buckets.get(a.name);
      if (bucket && bucket.length < CANDIDATES_PER_ADVERTISER) {
        bucket.push(item);
      }
    }
  }

  // Check if all buckets have enough candidates
  allFull = [...buckets.values()].every(b => b.length >= CANDIDATES_PER_ADVERTISER);
  if (scanned % 10000 < 500) {
    const filled = [...buckets.entries()].map(([n, b]) => `${n}:${b.length}`).join(', ');
    console.log(`  Scanned ${scanned} items... ${filled}`);
  }
}

// For each advertiser, pick the best items:
// - Prefer items with fewer total advertisers (more focused/dedicated ads)
// - Prefer items with htmlFile
function scoreItem(item) {
  const advCount = (item.advertisers || []).length;
  let score = 0;
  // Strongly prefer items with 1-2 advertisers (dedicated ads)
  if (advCount <= 1) score += 100;
  else if (advCount <= 2) score += 50;
  else if (advCount <= 3) score += 20;
  // Bonus for having HTML preview
  if (item.htmlFile) score += 10;
  return score;
}

// Build output
const output = topNames.map(name => {
  const adv = advMap.get(name);
  const candidates = buckets.get(name) || [];

  // Sort by score (best first), pick top N
  const items = candidates
    .sort((a, b) => scoreItem(b) - scoreItem(a))
    .slice(0, ITEMS_PER_ADVERTISER);

  const avgAdvCount = items.length > 0
    ? (items.reduce((sum, i) => sum + (i.advertisers || []).length, 0) / items.length).toFixed(1)
    : 0;

  return {
    name: adv.name,
    count: adv.count,
    logoUrl: adv.logoUrl || '',
    url: adv.url || '',
    items,
    _avgAdvCount: avgAdvCount,
  };
}).filter(row => row.items.length > 0);

const outPath = path.join(DATA_DIR, 'top-showcase.json');
// Strip internal _avgAdvCount before writing
const outputClean = output.map(({ _avgAdvCount, ...rest }) => rest);
fs.writeFileSync(outPath, JSON.stringify(outputClean));
const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);

console.log(`\nWrote ${outPath} (${sizeMB} MB)`);
console.log(`${output.length} advertisers with items:`);
for (const row of output) {
  console.log(`  ${row.name}: ${row.items.length} items (avg ${row._avgAdvCount} advertisers per item)`);
}
