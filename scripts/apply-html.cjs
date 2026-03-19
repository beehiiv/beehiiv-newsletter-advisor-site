#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const emailsDir = 'public/emails';
const dataDir = 'public/data';

// Build set of available HTML slugs
const htmlFiles = new Set(
  fs.readdirSync(emailsDir)
    .filter(f => f.endsWith('.html'))
    .map(f => f.slice(0, -5))
);
console.log('HTML files on disk:', htmlFiles.size);

// Update page JSON files
let totalAdded = 0;
let totalAlready = 0;
const pageFiles = fs.readdirSync(dataDir)
  .filter(f => f.startsWith('page-') && f.endsWith('.json'))
  .sort();

for (const pf of pageFiles) {
  const fp = path.join(dataDir, pf);
  const items = JSON.parse(fs.readFileSync(fp, 'utf8'));
  let changed = false;
  for (const item of items) {
    if (item.htmlFile) {
      totalAlready++;
    } else if (htmlFiles.has(item.id)) {
      item.htmlFile = '/emails/' + item.id + '.html';
      changed = true;
      totalAdded++;
    }
  }
  if (changed) {
    fs.writeFileSync(fp, JSON.stringify(items));
  }
}

console.log('Already had htmlFile:', totalAlready);
console.log('Newly applied:', totalAdded);
console.log('Total with htmlFile now:', totalAlready + totalAdded);

// Count items without htmlFile
let totalItems = 0;
let withoutHtml = 0;
for (const pf of pageFiles) {
  const fp = path.join(dataDir, pf);
  const items = JSON.parse(fs.readFileSync(fp, 'utf8'));
  for (const item of items) {
    totalItems++;
    if (!item.htmlFile) withoutHtml++;
  }
}
console.log('Total posts:', totalItems);
console.log('Still without htmlFile:', withoutHtml);
console.log('Coverage:', ((totalItems - withoutHtml) / totalItems * 100).toFixed(1) + '%');
