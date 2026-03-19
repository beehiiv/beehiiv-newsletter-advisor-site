const fs = require('fs');
const path = require('path');
const dataDir = 'public/data';
const BAD_URL = 'https://d10baati43jr8c.cloudfront.net/_next/static/images/android-chrome-512x512.png';
const GOOD_URL = 'https://www.google.com/s2/favicons?domain=www.startengine.com&sz=128';

const pageFiles = fs.readdirSync(dataDir).filter(f => f.startsWith('page-') && f.endsWith('.json')).sort();
let fixed = 0;
for (const pf of pageFiles) {
  const fp = path.join(dataDir, pf);
  const items = JSON.parse(fs.readFileSync(fp, 'utf8'));
  let changed = false;
  for (const item of items) {
    for (const adv of (item.advertisers || [])) {
      if (adv.logo === BAD_URL) {
        adv.logo = GOOD_URL;
        fixed++;
        changed = true;
      }
    }
  }
  if (changed) fs.writeFileSync(fp, JSON.stringify(items));
}
console.log('Fixed', fixed, 'logo references');
