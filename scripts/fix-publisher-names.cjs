#!/usr/bin/env node

/**
 * fix-publisher-names.cjs
 *
 * Fixes two kinds of bad publisher/author names in page-XXXX.json files:
 *   1. Names starting with "#" (beehiiv handles) -- strips the "#"
 *   2. Domain-style names (e.g. "morningbrew.com") -- converts to readable names
 *
 * Also updates publishers.json (author->count map) with the same renames.
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "public", "data");

// ---------------------------------------------------------------------------
// TLD list -- used to decide if a dotted string is really a domain
// ---------------------------------------------------------------------------
const KNOWN_TLDS = new Set([
  // Generic
  "com", "org", "net", "io", "co", "ai", "xyz", "app", "dev", "tech",
  "info", "biz", "club", "email", "fyi", "vc", "cc", "blog", "site",
  "online", "store", "live", "media", "news", "life", "space", "world",
  "academy", "tips", "money", "today", "day", "guide", "community",
  "report", "zone", "global", "digital", "works", "ventures", "pro",
  "coach", "link", "fun", "travel", "city", "exchange", "tools",
  "marketing", "finance", "vip", "cafe", "work", "food", "tours",
  "art", "health", "fm", "tv", "school", "aero", "careers", "quest",
  "audio", "plus", "rocks", "company", "inc", "so", "faith", "beauty",
  "love", "ing", "ceo", "lease", "eco", "meme", "dog", "tennis",
  "watch", "gg", "me", "nyc", "buzz", "institute", "ski",
  // Country codes (common ones seen in data)
  "us", "uk", "ca", "de", "fr", "at", "ro", "in", "it", "nl", "eu",
  "se", "lt", "dk", "ph", "au", "nz", "br", "pt", "jp", "kr", "pl",
  "cz", "fi", "no", "ng", "za", "ch", "be", "ie", "es", "mx", "cl",
  "ar", "mu", "mn", "al", "tf", "ac",
]);

// Multi-part TLDs (check longer patterns first)
const MULTI_PART_TLDS = [
  "co.uk", "co.nz", "co.za", "co.in", "co.kr", "co.jp",
  "com.au", "com.br", "com.ph", "com.ro",
];

// Common subdomains to strip when extracting the "main" part of a domain
const SUBDOMAINS = new Set([
  "newsletter", "mail", "news", "blog", "read", "join", "email",
  "weekly", "daily", "letter", "web", "write", "www",
]);

// Words that should stay uppercase (acronyms / brand fragments)
const UPPERCASE_WORDS = new Set([
  "ai", "ml", "vr", "ar", "xr", "nft", "api", "ceo", "cto", "cfo",
  "seo", "roi", "etf", "btc", "eth", "vc", "pr", "hr", "pm", "ui",
  "ux", "qa", "ip", "ev", "dc", "nyc", "usa", "uk", "eu", "diy",
  "saas", "defi", "b2b", "b2c", "llm",
]);

// Manual overrides for names the algorithm cannot handle well
const MANUAL_OVERRIDES = {
  "UGCcreator.com": "UGC Creator",
};

// ---------------------------------------------------------------------------
// Strip TLD from a cleaned domain string, returning the remaining parts
// Handles multi-part TLDs like .co.uk, .com.au
// ---------------------------------------------------------------------------
function stripTld(cleaned) {
  const lower = cleaned.toLowerCase();
  const parts = cleaned.split(".");

  // Check multi-part TLDs first
  for (const mTld of MULTI_PART_TLDS) {
    if (lower.endsWith("." + mTld)) {
      const tldPartCount = mTld.split(".").length;
      return parts.slice(0, parts.length - tldPartCount);
    }
  }

  // Single TLD
  return parts.slice(0, parts.length - 1);
}

// ---------------------------------------------------------------------------
// Check if a cleaned domain string has a known TLD
// ---------------------------------------------------------------------------
function hasKnownTld(cleaned) {
  const lower = cleaned.toLowerCase();

  // Check multi-part TLDs first
  for (const mTld of MULTI_PART_TLDS) {
    if (lower.endsWith("." + mTld)) return true;
  }

  // Check single TLD
  const parts = cleaned.split(".");
  const lastPart = parts[parts.length - 1].toLowerCase();
  return KNOWN_TLDS.has(lastPart);
}

// ---------------------------------------------------------------------------
// Detect if a name looks like a domain
// ---------------------------------------------------------------------------
function isDomainLike(name) {
  if (!name) return false;
  // Must contain a dot, no spaces
  if (!name.includes(".") || name.includes(" ")) return false;

  // Clean trailing special chars
  let cleaned = name.replace(/[®™]+$/, "");

  // Reject trailing possessives like "Tech.info's"
  if (/['\u2019]s$/.test(cleaned)) return false;

  // Remove trailing dot
  cleaned = cleaned.replace(/\.$/, "");

  // Must have at least 2 parts after splitting on "."
  const parts = cleaned.split(".");
  if (parts.length < 2) return false;

  // Must have a known TLD
  if (!hasKnownTld(cleaned)) return false;

  // Reject if it's just numbers (like "66.1")
  if (/^\d+(\.\d+)+$/.test(cleaned)) return false;

  // Get the domain name parts after stripping TLD
  const domainParts = stripTld(cleaned);
  if (domainParts.length === 0) return false;

  // The main domain part must not be too short
  const mainPart = domainParts[domainParts.length - 1];
  if (!mainPart || mainPart.length <= 1) return false;

  // Reject multi-dot names that look like brand names, not domains
  // e.g. "Here.Now.AI" -- if 3+ total parts and each is short and capitalized
  if (parts.length >= 3) {
    const allShort = parts.every(p => p.length <= 4);
    const allCapitalized = parts.every(p => /^[A-Z]/.test(p));
    if (allShort && allCapitalized) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Convert a domain name to a human-readable name
// ---------------------------------------------------------------------------
function domainToReadable(domain) {
  // Clean trailing special chars
  let cleaned = domain.replace(/[®™]+$/, "").replace(/\.$/, "");

  // Strip TLD (including multi-part TLDs)
  let parts = stripTld(cleaned);

  // Strip known subdomains from the front
  while (parts.length > 1) {
    const first = parts[0].toLowerCase();
    if (SUBDOMAINS.has(first)) {
      parts.shift();
    } else {
      break;
    }
  }

  // Use the last (most significant) part as the brand name
  let mainPart;
  if (parts.length > 1) {
    mainPart = parts[parts.length - 1];
  } else {
    mainPart = parts[0];
  }

  return expandName(mainPart);
}

// ---------------------------------------------------------------------------
// Split a string at camelCase boundaries
// Uses standard camelCase convention: last uppercase of a run starts new word
// "AINews" -> ["AI", "News"]
// "IHeartCraftyThings" -> ["I", "Heart", "Crafty", "Things"]
// "morningBrew" -> ["morning", "Brew"]
// All-lowercase stays as one word: "morningbrew" -> ["morningbrew"]
// ---------------------------------------------------------------------------
function splitCamelCaseWord(str) {
  if (!str || str.length <= 1) return [str];

  // Use standard regex-based camelCase splitting:
  // 1. Insert space between lowercase/digit and uppercase
  // 2. Insert space in uppercase run before final uppercase+lowercase
  const split = str
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(" ");

  return split.filter(Boolean);
}

// ---------------------------------------------------------------------------
// Expand a single domain-name segment into words
// e.g. "AINews" -> "AI News"
// e.g. "ai-revolution-hub" -> "AI Revolution Hub"
// e.g. "morningbrew" (all lower) -> "Morningbrew" (can't split without dictionary)
// ---------------------------------------------------------------------------
function expandName(segment) {
  if (!segment) return segment;

  // Split on hyphens first
  let words = segment.split("-").filter(Boolean);

  // For each word, split on camelCase boundaries
  let expanded = [];
  for (const word of words) {
    const parts = splitCamelCaseWord(word);
    expanded.push(...parts);
  }

  // Capitalize each word properly
  const result = expanded.map(w => {
    const lower = w.toLowerCase();
    if (UPPERCASE_WORDS.has(lower)) {
      return w.toUpperCase();
    }
    // Capitalize first letter
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });

  return result.join(" ");
}

// ---------------------------------------------------------------------------
// Fix a single name
// ---------------------------------------------------------------------------
function fixName(name) {
  if (!name || typeof name !== "string") return { fixed: name, changed: false };

  // Check manual overrides first
  if (MANUAL_OVERRIDES[name]) {
    return { fixed: MANUAL_OVERRIDES[name], changed: true, reason: "manual" };
  }

  let fixed = name;
  let reason = null;

  // 1. Strip "#" prefix
  if (fixed.startsWith("#")) {
    fixed = fixed.slice(1);
    reason = "hash-prefix";
  }

  // 2. Convert domain-style to readable
  if (isDomainLike(fixed)) {
    const readable = domainToReadable(fixed);
    if (readable && readable !== fixed) {
      fixed = readable;
      reason = reason ? reason + "+domain" : "domain";
    }
  }

  const changed = fixed !== name;
  return { fixed, changed, reason };
}

// ---------------------------------------------------------------------------
// Check for rename collisions
// ---------------------------------------------------------------------------
function checkCollisions(renameMap) {
  const reverseMap = new Map();
  for (const [old, newName] of renameMap) {
    if (!reverseMap.has(newName)) {
      reverseMap.set(newName, []);
    }
    reverseMap.get(newName).push(old);
  }

  const collisions = [];
  for (const [newName, oldNames] of reverseMap) {
    if (oldNames.length > 1) {
      collisions.push({ newName, oldNames });
    }
  }
  return collisions;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  console.log("=== Fix Publisher Names ===\n");

  const renameMap = new Map();
  const pageFiles = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith("page-") && f.endsWith(".json"))
    .sort();

  console.log(`Found ${pageFiles.length} page files to scan.\n`);

  // First pass: discover all names that need fixing
  const allAuthors = new Set();
  for (const file of pageFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8"));
    const items = Array.isArray(data) ? data : Object.values(data);
    for (const item of items) {
      if (item.author) allAuthors.add(item.author);
    }
  }

  console.log(`Total unique authors: ${allAuthors.size}\n`);

  // Compute renames
  let hashCount = 0;
  let domainCount = 0;
  for (const author of allAuthors) {
    const { fixed, changed, reason } = fixName(author);
    if (changed) {
      renameMap.set(author, fixed);
      if (reason && reason.includes("hash")) hashCount++;
      if (reason && reason.includes("domain")) domainCount++;
    }
  }

  console.log(`Authors starting with "#" to fix: ${hashCount}`);
  console.log(`Domain-style authors to fix: ${domainCount}`);
  console.log(`Total names to rename: ${renameMap.size}\n`);

  // Check for collisions
  const collisions = checkCollisions(renameMap);
  if (collisions.length > 0) {
    console.log(`WARNING: ${collisions.length} collision(s) (multiple old names -> same new name):`);
    for (const c of collisions) {
      console.log(`  "${c.newName}" <- ${c.oldNames.map(n => '"' + n + '"').join(", ")}`);
    }
    console.log("  (These will be merged in publishers.json)\n");
  }

  // Check if a new name already exists as an existing (unchanged) author
  let existingConflicts = 0;
  for (const [old, newName] of renameMap) {
    if (allAuthors.has(newName) && !renameMap.has(newName)) {
      existingConflicts++;
      if (existingConflicts <= 10) {
        console.log(`  NOTE: "${old}" -> "${newName}" (already exists as an author)`);
      }
    }
  }
  if (existingConflicts > 0) {
    console.log(`  ${existingConflicts} name(s) will merge with existing authors in publishers.json\n`);
  }

  // Print sample renames
  console.log("--- Sample renames ---");
  let shown = 0;
  for (const [old, newName] of renameMap) {
    if (shown >= 60) {
      console.log(`  ... and ${renameMap.size - shown} more`);
      break;
    }
    console.log(`  "${old}" -> "${newName}"`);
    shown++;
  }
  console.log();

  // Second pass: apply renames to all page files
  // Also fix items corrupted by bad multi-part TLD handling (author = "Co" or "Com")
  let totalItemsChanged = 0;
  let filesChanged = 0;
  let corruptedFixed = 0;

  for (const file of pageFiles) {
    const filePath = path.join(DATA_DIR, file);
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);
    const items = Array.isArray(data) ? data : Object.values(data);

    let fileChanged = false;
    for (const item of items) {
      // Fix standard renames
      if (item.author && renameMap.has(item.author)) {
        const newName = renameMap.get(item.author);
        item.author = newName;
        if (item.publisher && item.publisher.name) {
          item.publisher.name = newName;
        }
        totalItemsChanged++;
        fileChanged = true;
      }

      // Fix corrupted "Co" and "Com" names by extracting from publisher URL
      if ((item.author === "Co" || item.author === "Com") && item.publisher && item.publisher.url) {
        try {
          const host = new URL(item.publisher.url).hostname.replace(/^www\./, "");
          if (isDomainLike(host)) {
            const readable = domainToReadable(host);
            if (readable && readable !== "Co" && readable !== "Com") {
              item.author = readable;
              item.publisher.name = readable;
              corruptedFixed++;
              fileChanged = true;
            }
          }
        } catch (e) {
          // Invalid URL, skip
        }
      }
    }

    if (fileChanged) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      filesChanged++;
    }
  }

  console.log(`Updated ${totalItemsChanged} items across ${filesChanged} page files.`);
  if (corruptedFixed > 0) {
    console.log(`Fixed ${corruptedFixed} items corrupted by multi-part TLD bug (Co/Com).`);
  }
  console.log();

  // Rebuild publishers.json from page files (ensures consistency after fixes)
  const pubPath = path.join(DATA_DIR, "publishers.json");
  const oldPublishers = fs.existsSync(pubPath)
    ? JSON.parse(fs.readFileSync(pubPath, "utf8"))
    : {};
  const oldCount = Object.keys(oldPublishers).length;

  // Count all authors from page files
  const authorCounts = {};
  for (const file of pageFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8"));
    const items = Array.isArray(data) ? data : Object.values(data);
    for (const item of items) {
      if (item.author) {
        authorCounts[item.author] = (authorCounts[item.author] || 0) + 1;
      }
    }
  }

  // Sort by count descending
  const sorted = Object.entries(authorCounts).sort((a, b) => b[1] - a[1]);
  const sortedObj = {};
  for (const [k, v] of sorted) {
    sortedObj[k] = v;
  }

  fs.writeFileSync(pubPath, JSON.stringify(sortedObj, null, 2));
  const newCount = Object.keys(sortedObj).length;
  console.log(`Rebuilt publishers.json from page files.`);
  console.log(`Publishers.json: ${oldCount} entries -> ${newCount} entries.`);

  console.log("\nDone!");
}

main();
