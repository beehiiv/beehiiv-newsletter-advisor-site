const fs = require('fs');
const path = require('path');
const dataDir = 'public/data';
const TARGET = 'https://d15repwykl7r2z.cloudfront.net/branding/favicon-196x196.png';

const pageFiles = fs.readdirSync(dataDir).filter(f => f.startsWith('page-') && f.endsWith('.json')).sort();
const advNames = new Set();
for (const pf of pageFiles) {
  const items = JSON.parse(fs.readFileSync(path.join(dataDir, pf), 'utf8'));
  for (const item of items) {
    for (const a of (item.advertisers || [])) {
      if (a.logo === TARGET) {
        advNames.add(a.name);
        if (advNames.size === 1) {
          console.log('Advertiser:', a.name, '| URL:', a.url);
        }
      }
    }
  }
}
console.log('All advertisers with this logo:', [...advNames].join(', '));
console.log('Count:', advNames.size);
