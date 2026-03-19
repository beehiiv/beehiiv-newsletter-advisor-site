const fs = require('fs');
const path = require('path');
const dataDir = 'public/data';

// Define all merges: canonical name -> list of names to merge into it
const MERGES = {
  'Masterworks': ['Masterworks (Archive)', 'Masterworks - December'],
  'Google AdSense': ['Google'],
  'Growth School': ['GrowthSchool.io'],
  'The Hustle': ['The Hustle Daily'],
  'Wall Street Prep': ['Wallstreet Prep'],
  'AE Studio': ['AEStudio'],
  'Vincent': ['AIR Insider (WithVincent)'],
  'ACTIVE': ['Active'],
  'Babbel': ['Babbel LATAM'],
  '2U': ['2U GetSmarter Online Ltd', '2U (The Economist)'],
  'Motion': ['Motion - November Campaign'],
  'Nucific': ['Pacific Health Supplements, LLC'],
};

// Also clean up dirty names (leave Naked Wines for now)
const RENAMES = {
  'Early Bird Publishing | Matt Paulson': 'Early Bird Publishing',
  'Date Night Dancing Q4 23': 'Date Night Dancing',
  'GURU 2025': 'GURU',
  'IM: Incogni': 'Incogni',
};

// Build a reverse map: oldName -> canonicalName
const renameMap = {};
for (const [canonical, aliases] of Object.entries(MERGES)) {
  for (const alias of aliases) {
    renameMap[alias] = canonical;
  }
}
for (const [oldName, newName] of Object.entries(RENAMES)) {
  renameMap[oldName] = newName;
}

console.log('Rename map:', Object.keys(renameMap).length, 'entries');

// 1. Update advertiser-details.json
const advPath = path.join(dataDir, 'advertiser-details.json');
const advDetails = JSON.parse(fs.readFileSync(advPath, 'utf8'));

// For merges: combine counts, merge tags, keep canonical entry
for (const [canonical, aliases] of Object.entries(MERGES)) {
  let canonEntry = advDetails.find(a => a.name === canonical);
  if (!canonEntry) {
    // If canonical doesn't exist yet, find first alias that does
    for (const alias of aliases) {
      const idx = advDetails.findIndex(a => a.name === alias);
      if (idx !== -1) {
        advDetails[idx].name = canonical;
        canonEntry = advDetails[idx];
        break;
      }
    }
  }
  if (!canonEntry) {
    console.log(`  SKIP: Neither ${canonical} nor aliases found`);
    continue;
  }

  for (const alias of aliases) {
    const aliasIdx = advDetails.findIndex(a => a.name === alias);
    if (aliasIdx === -1) continue;
    const aliasEntry = advDetails[aliasIdx];
    // Merge count
    canonEntry.count += aliasEntry.count;
    // Merge tags
    const tagSet = new Set([...(canonEntry.tags || []), ...(aliasEntry.tags || [])]);
    canonEntry.tags = Array.from(tagSet).sort();
    // Keep better URL if canonical has none
    if (!canonEntry.url && aliasEntry.url) canonEntry.url = aliasEntry.url;
    if (!canonEntry.logoUrl && aliasEntry.logoUrl) canonEntry.logoUrl = aliasEntry.logoUrl;
    // Keep more recent latestDate
    if ((aliasEntry.latestDate || '') > (canonEntry.latestDate || '')) {
      canonEntry.latestDate = aliasEntry.latestDate;
    }
    // Remove alias entry
    advDetails.splice(aliasIdx, 1);
    console.log(`  Merged "${alias}" (${aliasEntry.count}) into "${canonical}" -> ${canonEntry.count}`);
  }
}

// For simple renames
for (const [oldName, newName] of Object.entries(RENAMES)) {
  const entry = advDetails.find(a => a.name === oldName);
  if (!entry) {
    console.log(`  SKIP rename: "${oldName}" not found`);
    continue;
  }
  // Check if newName already exists (need to merge)
  const existing = advDetails.find(a => a.name === newName);
  if (existing) {
    existing.count += entry.count;
    const tagSet = new Set([...(existing.tags || []), ...(entry.tags || [])]);
    existing.tags = Array.from(tagSet).sort();
    if (!existing.url && entry.url) existing.url = entry.url;
    if (!existing.logoUrl && entry.logoUrl) existing.logoUrl = entry.logoUrl;
    if ((entry.latestDate || '') > (existing.latestDate || '')) existing.latestDate = entry.latestDate;
    const idx = advDetails.indexOf(entry);
    advDetails.splice(idx, 1);
    console.log(`  Merged rename "${oldName}" (${entry.count}) into existing "${newName}" -> ${existing.count}`);
  } else {
    entry.name = newName;
    console.log(`  Renamed "${oldName}" to "${newName}"`);
  }
}

fs.writeFileSync(advPath, JSON.stringify(advDetails));
console.log(`\nAdvertiser details: ${advDetails.length} entries`);

// 2. Update all page-XXXX.json files
const pageFiles = fs.readdirSync(dataDir).filter(f => f.startsWith('page-') && f.endsWith('.json')).sort();
let totalRenamed = 0;
let filesChanged = 0;

for (const pf of pageFiles) {
  const fp = path.join(dataDir, pf);
  const items = JSON.parse(fs.readFileSync(fp, 'utf8'));
  let changed = false;
  for (const item of items) {
    if (!item.advertisers) continue;
    for (const adv of item.advertisers) {
      const newName = renameMap[adv.name];
      if (newName) {
        adv.name = newName;
        totalRenamed++;
        changed = true;
      }
    }
    // Deduplicate advertisers after rename (in case both canonical and alias were on same post)
    if (changed) {
      const seen = new Set();
      item.advertisers = item.advertisers.filter(a => {
        if (seen.has(a.name)) return false;
        seen.add(a.name);
        return true;
      });
    }
  }
  if (changed) {
    fs.writeFileSync(fp, JSON.stringify(items));
    filesChanged++;
  }
}
console.log(`\nPage files: ${totalRenamed} advertiser references renamed across ${filesChanged} files`);

// 3. Update advertisers.json (name -> count map)
const advMapPath = path.join(dataDir, 'advertisers.json');
const advMap = JSON.parse(fs.readFileSync(advMapPath, 'utf8'));

for (const [oldName, newName] of Object.entries(renameMap)) {
  if (oldName in advMap) {
    advMap[newName] = (advMap[newName] || 0) + advMap[oldName];
    delete advMap[oldName];
    console.log(`  advertisers.json: "${oldName}" -> "${newName}" (${advMap[newName]})`);
  }
}

fs.writeFileSync(advMapPath, JSON.stringify(advMap));
console.log(`\nAdvertisers map: ${Object.keys(advMap).length} entries`);

// 4. Rebuild oldest.json since advertiser names changed
console.log('\nRebuilding oldest.json...');
const allItems = [];
for (const pf of pageFiles) {
  const items = JSON.parse(fs.readFileSync(path.join(dataDir, pf), 'utf8'));
  for (const item of items) {
    if (item.date) allItems.push(item);
  }
}
allItems.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
const oldest = allItems.slice(0, 5000);
fs.writeFileSync(path.join(dataDir, 'oldest.json'), JSON.stringify(oldest));
console.log('Rebuilt oldest.json with', oldest.length, 'items');

console.log('\nDone!');
