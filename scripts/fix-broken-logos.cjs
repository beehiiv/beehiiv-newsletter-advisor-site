const fs = require('fs');
const path = require('path');
const dataDir = 'public/data';

// Map broken URLs to their replacement (Google favicon from their domain)
const BROKEN_LOGOS = {
  'https://skej.com/apple-touch-icon.png': 'https://www.google.com/s2/favicons?domain=skej.com&sz=128',
  'https://d10baati43jr8c.cloudfront.net/_next/static/images/android-chrome-512x512.png': 'https://www.google.com/s2/favicons?domain=www.startengine.com&sz=128',
  'https://www.babbel.com/apple-touch-icon.png': 'https://www.google.com/s2/favicons?domain=www.babbel.com&sz=128',
  'https://goldco.com/wp-content/uploads/2021/09/cropped-flame-152-192x192.png': 'https://www.google.com/s2/favicons?domain=goldco.com&sz=128',
  'https://upload.wikimedia.org/wikipedia/commons/0/07/ACTIVE_Logo.png': 'https://www.google.com/s2/favicons?domain=www.active.com&sz=128',
  'https://earningshub.com/images/apple-touch-icon.png': 'https://www.google.com/s2/favicons?domain=earningshub.com&sz=128',
  'https://www.shutterstock.com/apple-touch-icon.png': 'https://www.google.com/s2/favicons?domain=www.shutterstock.com&sz=128',
  'https://d15repwykl7r2z.cloudfront.net/branding/favicon-196x196.png': '', // unknown domain, will clear
  'https://www.queensboro.com/android-chrome-512x512.png': 'https://www.google.com/s2/favicons?domain=www.queensboro.com&sz=128',
};

// 1. Fix advertiser-details.json
const advPath = path.join(dataDir, 'advertiser-details.json');
const advDetails = JSON.parse(fs.readFileSync(advPath, 'utf8'));
let advFixed = 0;
for (const adv of advDetails) {
  if (BROKEN_LOGOS[adv.logoUrl] !== undefined) {
    console.log(`${adv.name}: ${adv.logoUrl} -> ${BROKEN_LOGOS[adv.logoUrl] || '(favicon fallback)'}`);
    adv.logoUrl = BROKEN_LOGOS[adv.logoUrl];
    advFixed++;
  }
}
fs.writeFileSync(advPath, JSON.stringify(advDetails));
console.log('\nFixed', advFixed, 'in advertiser-details.json');

// 2. Fix all page data
const pageFiles = fs.readdirSync(dataDir).filter(f => f.startsWith('page-') && f.endsWith('.json')).sort();
let pageFixed = 0;
for (const pf of pageFiles) {
  const fp = path.join(dataDir, pf);
  const items = JSON.parse(fs.readFileSync(fp, 'utf8'));
  let changed = false;
  for (const item of items) {
    for (const a of (item.advertisers || [])) {
      if (a.logo && BROKEN_LOGOS[a.logo] !== undefined) {
        a.logo = BROKEN_LOGOS[a.logo];
        pageFixed++;
        changed = true;
      }
    }
  }
  if (changed) fs.writeFileSync(fp, JSON.stringify(items));
}
console.log('Fixed', pageFixed, 'in page data');
