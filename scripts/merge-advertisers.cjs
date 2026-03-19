/**
 * merge-advertisers.cjs
 *
 * Performs two advertiser operations:
 *   1. Merge "Indy AI" into "Contra" (combine counts, merge tags, remove Indy AI entry)
 *   2. Rename "AIR" to "Vincent" (no existing Vincent entry, so pure rename)
 *
 * Affected files:
 *   - public/data/advertiser-details.json  (keyed by numeric index, values have name/count/tags/etc.)
 *   - public/data/advertisers.json         (name → count map)
 *   - public/data/page-XXXX.json           (arrays of posts, each with an advertisers[] array)
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');

// --- helpers ---

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function mergeTags(tagsA, tagsB) {
  return [...new Set([...(tagsA || []), ...(tagsB || [])])].sort();
}

// --- Operation definitions ---

const operations = [
  { from: 'Indy AI', to: 'Contra' },
  { from: 'AIR', to: 'Vincent' },
];

// ============================================================
// 1. advertiser-details.json
// ============================================================

const detailsPath = path.join(DATA_DIR, 'advertiser-details.json');
const details = readJSON(detailsPath);

for (const op of operations) {
  // Find keys for source and target by scanning values
  let fromKey = null;
  let toKey = null;
  for (const [k, v] of Object.entries(details)) {
    if (v.name === op.from) fromKey = k;
    if (v.name === op.to) toKey = k;
  }

  if (fromKey === null) {
    console.log(`[advertiser-details] "${op.from}" not found — skipping.`);
    continue;
  }

  const fromEntry = details[fromKey];

  if (toKey !== null) {
    // Merge into existing target
    const toEntry = details[toKey];
    console.log(`[advertiser-details] Merging "${op.from}" (count=${fromEntry.count}) into "${op.to}" (count=${toEntry.count})`);

    toEntry.count += fromEntry.count;
    toEntry.tags = mergeTags(toEntry.tags, fromEntry.tags);

    // Keep the more recent latestDate
    if (fromEntry.latestDate && (!toEntry.latestDate || fromEntry.latestDate > toEntry.latestDate)) {
      toEntry.latestDate = fromEntry.latestDate;
    }

    // Remove the source entry
    delete details[fromKey];
  } else {
    // No existing target — just rename the source entry
    console.log(`[advertiser-details] Renaming "${op.from}" (count=${fromEntry.count}) to "${op.to}"`);
    fromEntry.name = op.to;
    // Keep same key, just update the name
  }
}

// Re-index the details object so keys are sequential 0..N-1
const reindexed = {};
Object.values(details).forEach((v, i) => {
  reindexed[i] = v;
});

writeJSON(detailsPath, reindexed);
console.log(`[advertiser-details] Written with ${Object.keys(reindexed).length} entries.\n`);

// ============================================================
// 2. page-XXXX.json files
// ============================================================

const pageFiles = fs.readdirSync(DATA_DIR)
  .filter(f => /^page-\d+\.json$/.test(f))
  .sort();

let totalRenamed = {};
for (const op of operations) {
  totalRenamed[op.from] = 0;
}

for (const pageFile of pageFiles) {
  const pagePath = path.join(DATA_DIR, pageFile);
  const posts = readJSON(pagePath);
  let changed = false;

  for (const post of posts) {
    if (!post.advertisers) continue;
    for (const adv of post.advertisers) {
      for (const op of operations) {
        if (adv.name === op.from) {
          adv.name = op.to;
          totalRenamed[op.from]++;
          changed = true;
        }
      }
    }
  }

  if (changed) {
    writeJSON(pagePath, posts);
  }
}

for (const op of operations) {
  console.log(`[page files] Renamed ${totalRenamed[op.from]} "${op.from}" → "${op.to}" references.`);
}
console.log('');

// ============================================================
// 3. advertisers.json (name → count map)
// ============================================================

const advPath = path.join(DATA_DIR, 'advertisers.json');
const advertisers = readJSON(advPath);

for (const op of operations) {
  const fromCount = advertisers[op.from];
  if (fromCount === undefined) {
    console.log(`[advertisers] "${op.from}" not found — skipping.`);
    continue;
  }

  const toCount = advertisers[op.to] || 0;
  const merged = fromCount + toCount;

  if (toCount > 0) {
    console.log(`[advertisers] Merging "${op.from}" (${fromCount}) into "${op.to}" (${toCount}) → ${merged}`);
  } else {
    console.log(`[advertisers] Renaming "${op.from}" (${fromCount}) to "${op.to}" → ${merged}`);
  }

  advertisers[op.to] = merged;
  delete advertisers[op.from];
}

// Sort by count descending (same order as original file)
const sorted = Object.fromEntries(
  Object.entries(advertisers).sort(([, a], [, b]) => b - a)
);

writeJSON(advPath, sorted);
console.log(`[advertisers] Written with ${Object.keys(sorted).length} entries.\n`);

console.log('Done! All merges/renames applied.');
