#!/usr/bin/env node
/**
 * For posts without tags, inherit tags from their advertisers.
 */
const fs = require('fs');
const path = require('path');

const dataDir = 'public/data';

// Load advertiser details for tag lookup
const advDetails = JSON.parse(fs.readFileSync(path.join(dataDir, 'advertiser-details.json'), 'utf8'));
const advTagMap = new Map();
for (const adv of advDetails) {
  if (adv.tags && adv.tags.length > 0) {
    advTagMap.set(adv.name, adv.tags);
  }
}
console.log('Advertisers with tags:', advTagMap.size);

const pageFiles = fs.readdirSync(dataDir).filter(f => f.startsWith('page-') && f.endsWith('.json')).sort();
let updated = 0;
let alreadyTagged = 0;
let noAdvMatch = 0;

for (const pf of pageFiles) {
  const fp = path.join(dataDir, pf);
  const items = JSON.parse(fs.readFileSync(fp, 'utf8'));
  let changed = false;

  for (const item of items) {
    if (item.tags && item.tags.length > 0) {
      alreadyTagged++;
      continue;
    }

    // Collect tags from all advertisers on this post
    const tagSet = new Set();
    for (const adv of (item.advertisers || [])) {
      const tags = advTagMap.get(adv.name);
      if (tags) tags.forEach(t => tagSet.add(t));
    }

    if (tagSet.size > 0) {
      item.tags = Array.from(tagSet).sort();
      updated++;
      changed = true;
    } else {
      noAdvMatch++;
    }
  }

  if (changed) {
    fs.writeFileSync(fp, JSON.stringify(items));
  }
}

console.log('Already tagged:', alreadyTagged);
console.log('Updated from advertisers:', updated);
console.log('No advertiser tag match:', noAdvMatch);
console.log('Total coverage:', ((alreadyTagged + updated) / (alreadyTagged + updated + noAdvMatch) * 100).toFixed(1) + '%');
