const fs = require('fs');
const details = JSON.parse(fs.readFileSync('public/data/advertiser-details.json', 'utf8'));

for (const adv of details) {
  if (adv.name === 'Metabase') adv.tags = ['Technology', 'SaaS'];
  if (adv.name === 'Pied Piper') adv.tags = ['Technology'];
  if (adv.name === 'Preeya - TEST') adv.tags = ['Technology'];
}

const untagged = details.filter(a => !a.tags || a.tags.length === 0);
console.log('Still untagged:', untagged.length);
if (untagged.length > 0) untagged.forEach(a => console.log('  -', a.name));

const tagged = details.filter(a => a.tags && a.tags.length > 0).length;
console.log('Total advertisers:', details.length);
console.log('Tagged:', tagged);
console.log('Coverage:', (tagged / details.length * 100).toFixed(1) + '%');

fs.writeFileSync('public/data/advertiser-details.json', JSON.stringify(details, null, 2));
console.log('Saved.');
