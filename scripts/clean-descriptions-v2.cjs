/**
 * clean-descriptions-v2.cjs
 *
 * Cleans up description fields in page-XXXX.json data files.
 *
 * Rules applied (in order):
 *   1. Strip trailing "..." (literal ellipsis from truncation)
 *   2. If description starts with the same text as the title (first 20+ chars), blank it
 *   3. Strip "In partnership with ..." phrases anywhere in text
 *   4. Strip boilerplate phrases (weekly resource drop, etc.)
 *   5. If result is < 20 chars, blank it (too short to be useful)
 *   6. Trim whitespace
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'public', 'data');
const pageFiles = fs.readdirSync(dataDir)
  .filter(f => f.startsWith('page-') && f.endsWith('.json'))
  .sort();

// --- Stats ---
let totalItems = 0;
let totalChanged = 0;
let totalBlanked = 0;
let trailingDotsStripped = 0;
let redundantBlanked = 0;
let partnershipStripped = 0;
let boilerplateStripped = 0;
let tooShortBlanked = 0;
let filesModified = 0;

// Boilerplate phrases to remove (case-insensitive).
// Each entry is removed wherever it appears in the description.
const boilerplatePhrases = [
  'Your weekly resource drop is here!',
  'Your weekly resource drop is here',
  'weekly resource drop is here',
  'Estimated Read Time',
  'View in browser',
  'Open in app',
  'Having trouble viewing this email',
  'Having trouble viewing',
  'Read Online',
];

for (const pf of pageFiles) {
  const fp = path.join(dataDir, pf);
  const items = JSON.parse(fs.readFileSync(fp, 'utf8'));
  let fileChanged = false;

  for (const item of items) {
    totalItems++;
    if (item.description == null) continue;

    let d = item.description;
    const orig = d;

    // --- Rule 1: Strip trailing "..." and variants ---
    // Handles "...", " ...", " ... ...", trailing dots with spaces
    const beforeDots = d;
    d = d.replace(/[\s.]*\.{3}[\s.]*$/, '');
    // Also handle trailing ".." left over (two dots)
    d = d.replace(/\.{2,}$/, '');
    if (d !== beforeDots) trailingDotsStripped++;

    // --- Rule 2: Redundant with title ---
    // Compare first 20+ characters of description vs title (normalized)
    const titleNorm = (item.title || '').trim();
    const descNorm = d.trim();
    if (titleNorm.length >= 20 && descNorm.length >= 20) {
      const prefixLen = Math.min(20, titleNorm.length, descNorm.length);
      if (titleNorm.substring(0, prefixLen) === descNorm.substring(0, prefixLen)) {
        d = '';
        redundantBlanked++;
      }
    }

    // --- Rule 3: Strip "In partnership with ..." phrases ---
    // This appears mid-text followed by ad copy. Remove from "In partnership with"
    // through the end of that sentence/phrase (up to the next sentence or end).
    if (d.includes('In partnership with')) {
      // Remove "In partnership with" and everything after it (it's always ad copy appended at the end)
      d = d.replace(/\s*In partnership with\s?.*/gi, '');
      partnershipStripped++;
    }

    // --- Rule 4: Strip boilerplate phrases ---
    for (const phrase of boilerplatePhrases) {
      const re = new RegExp(escapeRegex(phrase), 'gi');
      if (re.test(d)) {
        d = d.replace(re, '');
        boilerplateStripped++;
      }
    }

    // --- Rule 6: Trim whitespace (do before length check) ---
    d = d.trim();
    // Collapse internal runs of whitespace
    d = d.replace(/\s{2,}/g, ' ');

    // --- Rule 5: Too short after cleaning ---
    if (d.length > 0 && d.length < 20) {
      d = '';
      tooShortBlanked++;
    }

    // Commit changes
    if (d !== orig) {
      item.description = d;
      totalChanged++;
      if (d === '') totalBlanked++;
      fileChanged = true;
    }
  }

  if (fileChanged) {
    fs.writeFileSync(fp, JSON.stringify(items));
    filesModified++;
  }
}

console.log('=== Description Cleaning v2 - Summary ===');
console.log(`Total items scanned:        ${totalItems}`);
console.log(`Descriptions modified:      ${totalChanged}`);
console.log(`Descriptions blanked:       ${totalBlanked}`);
console.log(`Files modified:             ${filesModified} / ${pageFiles.length}`);
console.log('');
console.log('--- Breakdown ---');
console.log(`Trailing "..." stripped:     ${trailingDotsStripped}`);
console.log(`Redundant (same as title):  ${redundantBlanked}`);
console.log(`"In partnership with" cut:  ${partnershipStripped}`);
console.log(`Boilerplate phrases cut:    ${boilerplateStripped}`);
console.log(`Too short (< 20 chars):     ${tooShortBlanked}`);

// Helper: escape string for use in RegExp
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
