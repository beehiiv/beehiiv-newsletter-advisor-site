const fs = require('fs');
const path = require('path');
const dataDir = 'public/data';

const OLD_NAME = 'Early Bird Publishing';
const NEW_NAME = 'The Early Bird';

// 1. advertiser-details.json
const advPath = path.join(dataDir, 'advertiser-details.json');
const advDetails = JSON.parse(fs.readFileSync(advPath, 'utf8'));
const entry = advDetails.find(a => a.name === OLD_NAME);
const existing = advDetails.find(a => a.name === NEW_NAME);
if (entry && existing) {
  // Merge into existing
  existing.count += entry.count;
  const tagSet = new Set([...(existing.tags || []), ...(entry.tags || [])]);
  existing.tags = Array.from(tagSet).sort();
  if (!existing.logoUrl && entry.logoUrl) existing.logoUrl = entry.logoUrl;
  if (!existing.url && entry.url) existing.url = entry.url;
  if ((entry.latestDate || '') > (existing.latestDate || '')) existing.latestDate = entry.latestDate;
  advDetails.splice(advDetails.indexOf(entry), 1);
  console.log('Merged into existing "The Early Bird":', existing.count);
} else if (entry) {
  entry.name = NEW_NAME;
  console.log('Renamed to "The Early Bird":', entry.count);
} else {
  console.log('"Early Bird Publishing" not found');
}
fs.writeFileSync(advPath, JSON.stringify(advDetails));

// 2. All page files
const pageFiles = fs.readdirSync(dataDir).filter(f => f.startsWith('page-') && f.endsWith('.json')).sort();
let renamed = 0;
for (const pf of pageFiles) {
  const fp = path.join(dataDir, pf);
  const items = JSON.parse(fs.readFileSync(fp, 'utf8'));
  let changed = false;
  for (const item of items) {
    if (!item.advertisers) continue;
    for (const adv of item.advertisers) {
      if (adv.name === OLD_NAME) {
        adv.name = NEW_NAME;
        renamed++;
        changed = true;
      }
    }
    // Dedupe
    if (changed) {
      const seen = new Set();
      item.advertisers = item.advertisers.filter(a => {
        if (seen.has(a.name)) return false;
        seen.add(a.name);
        return true;
      });
    }
  }
  if (changed) fs.writeFileSync(fp, JSON.stringify(items));
}
console.log('Renamed', renamed, 'references in page files');

// 3. advertisers.json
const mapPath = path.join(dataDir, 'advertisers.json');
const advMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
if (advMap[OLD_NAME]) {
  advMap[NEW_NAME] = (advMap[NEW_NAME] || 0) + advMap[OLD_NAME];
  delete advMap[OLD_NAME];
  console.log('advertisers.json updated:', advMap[NEW_NAME]);
}
fs.writeFileSync(mapPath, JSON.stringify(advMap));
