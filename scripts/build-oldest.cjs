#!/usr/bin/env node
/**
 * Build a separate oldest-first JSON file for the "oldest" sort.
 * Contains the 5000 oldest items.
 */
const fs = require('fs');
const path = require('path');

const dataDir = 'public/data';
const pageFiles = fs.readdirSync(dataDir).filter(f => f.startsWith('page-') && f.endsWith('.json')).sort();

// Collect all items with dates
const allItems = [];
for (const pf of pageFiles) {
  const items = JSON.parse(fs.readFileSync(path.join(dataDir, pf), 'utf8'));
  for (const item of items) {
    if (item.date) allItems.push(item);
  }
}

console.log('Total items with dates:', allItems.length);

// Sort oldest first
allItems.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

// Write oldest 5000
const oldest = allItems.slice(0, 5000);
fs.writeFileSync(path.join(dataDir, 'oldest.json'), JSON.stringify(oldest));
console.log('Wrote oldest.json with', oldest.length, 'items');
console.log('Date range:', oldest[0]?.date?.slice(0, 10), 'to', oldest[oldest.length - 1]?.date?.slice(0, 10));
