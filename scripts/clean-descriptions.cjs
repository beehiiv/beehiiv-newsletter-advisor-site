const fs = require('fs');
const path = require('path');
const dataDir = 'public/data';
const pageFiles = fs.readdirSync(dataDir).filter(f => f.startsWith('page-') && f.endsWith('.json')).sort();
let cleaned = 0;
for (const pf of pageFiles) {
  const fp = path.join(dataDir, pf);
  const items = JSON.parse(fs.readFileSync(fp, 'utf8'));
  let changed = false;
  for (const item of items) {
    if (!item.description) continue;
    let d = item.description;
    const orig = d;
    // Strip 'Month DD, YYYY   | Read Online' prefix
    d = d.replace(/^[A-Z][a-z]+ \d{1,2}, \d{4}\s*\|\s*Read Online\s*/i, '');
    // Strip standalone 'Read Online' at start
    d = d.replace(/^Read Online\s*/i, '');
    // Strip 'Unsubscribe' and surrounding text at end
    d = d.replace(/\s*Unsubscribe.*$/i, '');
    // Strip dates like 'Saturday, February 28, 2026' at the start
    d = d.replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+[A-Z][a-z]+ \d{1,2},? \d{4}\s*/i, '');
    // Strip 'In partnership with' at the very start if it's the first thing
    d = d.replace(/^\s*In partnership with\s+/, '');
    // Strip leftover template vars
    d = d.replace(/\{\{[A-Z_]+\}\}/g, '');
    d = d.trim();
    if (d !== orig) {
      item.description = d;
      changed = true;
      cleaned++;
    }
  }
  if (changed) fs.writeFileSync(fp, JSON.stringify(items));
}
console.log('Cleaned descriptions:', cleaned);
