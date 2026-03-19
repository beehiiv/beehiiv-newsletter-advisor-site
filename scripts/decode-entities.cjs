const fs = require('fs');
const path = require('path');
const dataDir = 'public/data';
const pageFiles = fs.readdirSync(dataDir).filter(f => f.startsWith('page-') && f.endsWith('.json')).sort();

function decodeEntities(str) {
  if (!str) return str;
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

let fixed = 0;
for (const pf of pageFiles) {
  const fp = path.join(dataDir, pf);
  const items = JSON.parse(fs.readFileSync(fp, 'utf8'));
  let changed = false;
  for (const item of items) {
    const origT = item.title;
    const origD = item.description;
    if (item.title) item.title = decodeEntities(item.title);
    if (item.description) item.description = decodeEntities(item.description);
    if (item.title !== origT || item.description !== origD) {
      fixed++;
      changed = true;
      console.log('Fixed:', item.title.substring(0, 80));
    }
  }
  if (changed) fs.writeFileSync(fp, JSON.stringify(items));
}
console.log('Total fixed:', fixed);
