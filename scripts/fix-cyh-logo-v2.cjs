const fs = require('fs');
const path = require('path');
const dataDir = 'public/data';
const ADV_NAME = 'Choose Your Horizon';
const NEW_LOGO = 'https://cdn.prod.website-files.com/62d56e6f57f0a6bc6871b4c0/64af3313e61f4cbac578d5cb_Logo%20blue.webp';

// 1. Update advertiser-details.json
const advPath = path.join(dataDir, 'advertiser-details.json');
const advDetails = JSON.parse(fs.readFileSync(advPath, 'utf8'));
const adv = advDetails.find(a => a.name === ADV_NAME);
if (adv) {
  console.log('Old logoUrl:', adv.logoUrl);
  adv.logoUrl = NEW_LOGO;
  console.log('New logoUrl:', adv.logoUrl);
  fs.writeFileSync(advPath, JSON.stringify(advDetails));
}

// 2. Update all page data
const pageFiles = fs.readdirSync(dataDir).filter(f => f.startsWith('page-') && f.endsWith('.json')).sort();
let fixed = 0;
for (const pf of pageFiles) {
  const fp = path.join(dataDir, pf);
  const items = JSON.parse(fs.readFileSync(fp, 'utf8'));
  let changed = false;
  for (const item of items) {
    for (const a of (item.advertisers || [])) {
      if (a.name === ADV_NAME && a.logo !== NEW_LOGO) {
        a.logo = NEW_LOGO;
        fixed++;
        changed = true;
      }
    }
  }
  if (changed) fs.writeFileSync(fp, JSON.stringify(items));
}
console.log('Fixed', fixed, 'page data references');
