const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const dataDir = 'public/data';

const advDetails = JSON.parse(fs.readFileSync(path.join(dataDir, 'advertiser-details.json'), 'utf8'));

// Find all advertisers with non-favicon logo URLs (custom logos that could be broken)
const customLogos = advDetails.filter(a =>
  a.logoUrl &&
  !a.logoUrl.includes('google.com/s2/favicons') &&
  a.logoUrl.startsWith('http')
);

console.log('Advertisers with custom (non-favicon) logos:', customLogos.length);
console.log('');

// Also scan page data for unique non-favicon logo URLs
const logoUrls = new Set();
const pageFiles = fs.readdirSync(dataDir).filter(f => f.startsWith('page-') && f.endsWith('.json')).sort();

for (const pf of pageFiles) {
  const items = JSON.parse(fs.readFileSync(path.join(dataDir, pf), 'utf8'));
  for (const item of items) {
    for (const a of (item.advertisers || [])) {
      if (a.logo && a.logo.startsWith('http') && !a.logo.includes('google.com/s2/favicons')) {
        logoUrls.add(a.logo);
      }
    }
  }
}

console.log('Unique custom logo URLs in page data:', logoUrls.size);
console.log('');

// Check each custom logo URL
function checkUrl(url) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 10000 }, (res) => {
      resolve({ url, status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 });
    });
    req.on('error', (err) => {
      resolve({ url, status: 0, ok: false, error: err.message });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ url, status: 0, ok: false, error: 'timeout' });
    });
  });
}

async function main() {
  // Combine all custom URLs
  const allUrls = new Set([...customLogos.map(a => a.logoUrl), ...logoUrls]);
  console.log('Total unique custom logo URLs to check:', allUrls.size);
  console.log('');

  const broken = [];
  const batches = [];
  const urlArr = [...allUrls];

  // Check in batches of 10
  for (let i = 0; i < urlArr.length; i += 10) {
    const batch = urlArr.slice(i, i + 10);
    const results = await Promise.all(batch.map(checkUrl));
    for (const r of results) {
      if (!r.ok) {
        broken.push(r);
      }
    }
    process.stdout.write(`Checked ${Math.min(i + 10, urlArr.length)}/${urlArr.length}\r`);
  }

  console.log('\n');
  if (broken.length === 0) {
    console.log('All custom logo URLs are accessible!');
  } else {
    console.log('BROKEN LOGOS (' + broken.length + '):');
    for (const b of broken) {
      // Find which advertisers use this URL
      const advs = advDetails.filter(a => a.logoUrl === b.url).map(a => a.name);
      console.log('  Status:', b.status || b.error);
      console.log('  URL:', b.url);
      if (advs.length > 0) console.log('  Advertisers:', advs.join(', '));
      console.log('');
    }
  }
}

main();
