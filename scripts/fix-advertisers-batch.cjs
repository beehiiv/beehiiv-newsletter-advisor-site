/**
 * fix-advertisers-batch.cjs
 *
 * Batch advertiser fixes:
 *   1. Clean "Naked Wines.com Inc.  135 Gasser Dr A, Napa, CA 94559 roshni.gorur@nakedwines.com"
 *      → "Naked Wines"
 *   2. Rename "DubApp" → "Dub" (merge if "Dub" already exists)
 *
 * After all renames, deduplicates advertisers within each post.
 *
 * Affected files:
 *   - public/data/advertiser-details.json  (array of {name, count, logoUrl, url, tags, latestDate})
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
  fs.writeFileSync(filePath, JSON.stringify(data) + '\n', 'utf8');
}

function mergeTags(tagsA, tagsB) {
  return [...new Set([...(tagsA || []), ...(tagsB || [])])].sort();
}

function laterDate(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

// --- Operation definitions ---

const DIRTY_NAKED = 'Naked Wines.com Inc.  135 Gasser Dr A, Napa, CA 94559 roshni.gorur@nakedwines.com';

const operations = [
  { from: DIRTY_NAKED, to: 'Naked Wines' },
  { from: 'DubApp', to: 'Dub' },
];

// ============================================================
// 1. advertiser-details.json
// ============================================================

const detailsPath = path.join(DATA_DIR, 'advertiser-details.json');
const details = readJSON(detailsPath);

for (const op of operations) {
  let fromIdx = -1;
  let toIdx = -1;

  for (let i = 0; i < details.length; i++) {
    if (details[i].name === op.from) fromIdx = i;
    if (details[i].name === op.to) toIdx = i;
  }

  if (fromIdx === -1) {
    console.log(`[advertiser-details] "${op.from}" not found — skipping.`);
    continue;
  }

  const fromEntry = details[fromIdx];

  if (toIdx !== -1) {
    // Merge into existing target
    const toEntry = details[toIdx];
    console.log(`[advertiser-details] Merging "${op.from}" (count=${fromEntry.count}) into "${op.to}" (count=${toEntry.count})`);

    toEntry.count += fromEntry.count;
    toEntry.tags = mergeTags(toEntry.tags, fromEntry.tags);
    toEntry.latestDate = laterDate(toEntry.latestDate, fromEntry.latestDate);

    // Remove the source entry
    details.splice(fromIdx, 1);
  } else {
    // No existing target — just rename
    console.log(`[advertiser-details] Renaming "${op.from}" (count=${fromEntry.count}) → "${op.to}"`);
    fromEntry.name = op.to;
  }
}

writeJSON(detailsPath, details);
console.log(`[advertiser-details] Written with ${details.length} entries.\n`);

// ============================================================
// 2. page-XXXX.json files
// ============================================================

const pageFiles = fs.readdirSync(DATA_DIR)
  .filter(f => /^page-\d+\.json$/.test(f))
  .sort();

const totalRenamed = {};
let totalDeduped = 0;
for (const op of operations) {
  totalRenamed[op.from] = 0;
}

for (const pageFile of pageFiles) {
  const pagePath = path.join(DATA_DIR, pageFile);
  const posts = readJSON(pagePath);
  let changed = false;

  for (const post of posts) {
    if (!post.advertisers || !Array.isArray(post.advertisers)) continue;

    // Step 1: Rename
    for (const adv of post.advertisers) {
      for (const op of operations) {
        if (adv.name === op.from) {
          adv.name = op.to;
          totalRenamed[op.from]++;
          changed = true;
        }
      }
    }

    // Step 2: Deduplicate advertisers by name within this post
    const seen = new Set();
    const before = post.advertisers.length;
    post.advertisers = post.advertisers.filter(adv => {
      if (seen.has(adv.name)) return false;
      seen.add(adv.name);
      return true;
    });
    const removed = before - post.advertisers.length;
    if (removed > 0) {
      totalDeduped += removed;
      changed = true;
    }
  }

  if (changed) {
    writeJSON(pagePath, posts);
  }
}

for (const op of operations) {
  console.log(`[page files] Renamed ${totalRenamed[op.from]} "${op.from}" → "${op.to}" references.`);
}
if (totalDeduped > 0) {
  console.log(`[page files] Removed ${totalDeduped} duplicate advertiser entries within posts.`);
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
    console.log(`[advertisers] Renaming "${op.from}" (${fromCount}) → "${op.to}"`);
  }

  advertisers[op.to] = merged;
  delete advertisers[op.from];
}

// Sort by count descending
const sorted = Object.fromEntries(
  Object.entries(advertisers).sort(([, a], [, b]) => b - a)
);

writeJSON(advPath, sorted);
console.log(`[advertisers] Written with ${Object.keys(sorted).length} entries.\n`);

console.log('Done! All fixes applied.');
