#!/usr/bin/env node
/**
 * Fetch industry/category data from Metabase for advertisers
 * and update advertiser-details.json with proper tags.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SESSION = 'c1d959f2-5e24-41c8-be07-4e3c65d54c4e';
const METABASE_URL = 'https://beehiiv.metabaseapp.com/api/dataset';

function queryMetabase(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ database: 2, type: 'native', native: { query: sql } });
    const url = new URL(METABASE_URL);
    const req = https.request({
      hostname: url.hostname, path: url.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Metabase-Session': SESSION, 'Content-Length': Buffer.byteLength(body) },
      timeout: 600000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data).data?.rows || []); }
        catch (e) { reject(new Error('Parse error: ' + data.slice(0, 500))); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

// Map Metabase industry groups -> site tags
const GROUP_TO_TAG = {
  'SaaS': 'SaaS',
  'Finance & Investing': 'Finance',
  'Newsletter': 'Newsletter',
  'Health & Personal Care': 'Health',
  'Education / Career': 'Education',
  'Consumer Tech': 'Technology',
  'Media & Entertainment': 'Entertainment',
  'Food & Beverage': 'Lifestyle',
  'Fashion': 'Lifestyle',
  'Retail / E-Commerce': 'E-commerce',
  'Travel': 'Travel',
  'Crypto': 'Crypto',
  'Tech': 'Technology',
  'Gaming': 'Entertainment',
};

// Map specific sub-industries to more specific tags
const INDUSTRY_TO_TAG = {
  'AI': 'AI',
  'Newsletters': 'Newsletter',
  'Artificial Intelligence': 'AI',
  'News': 'News',
  'General News': 'News',
  'Business News': 'Business',
  'Finance News': 'News',
  'Omni-channel Marketing': 'Marketing',
  'Email Marketing': 'Marketing',
  'Marketing': 'Marketing',
  'SEO': 'Marketing',
  'Social Media Marketing': 'Marketing',
  'Content Marketing': 'Marketing',
  'Real Estate': 'Real Estate',
  'Productivity': 'Productivity',
  'Project Management': 'Productivity',
  'E-commerce': 'E-commerce',
  'Online Store': 'E-commerce',
  'Marketplace': 'E-commerce',
  'Startup': 'Startups',
  'Startups': 'Startups',
  'VC / Angel Investors': 'Startups',
  'Education': 'Education',
  'Online Services': 'Education',
  'HR': 'Business',
  'Sales': 'Business',
  'CRM': 'Business',
  'Business Intelligence': 'Business',
  'Accounting': 'Business',
  'Legal': 'Business',
  'Analytics': 'Technology',
  'Cloud': 'Technology',
  'DevOps': 'Technology',
  'Developer Tools': 'Technology',
  'Cybersecurity': 'Technology',
  'Mobile App': 'Technology',
  'Supplements': 'Health',
  'Fitness': 'Health',
  'Mental Health': 'Health',
  'Wellness': 'Health',
  'Alternative Investments': 'Finance',
  'Insurance': 'Finance',
  'Banking': 'Finance',
  'Credit Card': 'Finance',
  'Personal Finance': 'Finance',
  'Investing': 'Finance',
  'Coins/Currency': 'Crypto',
  'Digital Assets': 'Crypto',
  'Exchange': 'Crypto',
  'Wallet': 'Crypto',
  'NFT': 'Crypto',
  'Podcast': 'Media',
  'Streaming': 'Entertainment',
  'Music': 'Entertainment',
  'Film': 'Entertainment',
  'Sports': 'Entertainment',
  'Travel': 'Travel',
  'Hospitality': 'Travel',
  'Fashion': 'Lifestyle',
  'Beauty': 'Lifestyle',
  'Home': 'Lifestyle',
  'Pet': 'Lifestyle',
  'Apparel': 'Lifestyle',
  'Accessories': 'Lifestyle',
  'Luxury': 'Lifestyle',
};

async function main() {
  console.log('Fetching advertiser industry data from Metabase...');

  // Query 1: Get all advertisers with their industry groups and industries
  // Metabase has a 2000 row limit, so we paginate
  let allRows = [];
  let cursor = '';
  while (true) {
    const rows = await queryMetabase(`
      SELECT
        ana.name AS advertiser_name,
        COALESCE(anig.name, '') AS industry_group,
        COALESCE(ani.name, '') AS industry_name
      FROM ad_network_advertisers ana
      JOIN ad_network_advertiser_industries anai ON anai.advertiser_id = ana.id
      JOIN ad_network_industries ani ON ani.id = anai.industry_id
      LEFT JOIN ad_network_industry_groups anig ON anig.id = ani.industry_group_id
      WHERE ana.name > '${cursor.replace(/'/g, "''")}'
      ORDER BY ana.name
      LIMIT 2000
    `);
    if (rows.length === 0) break;
    allRows = allRows.concat(rows);
    cursor = rows[rows.length - 1][0];
    console.log(`  Fetched ${rows.length} rows (cursor: ${cursor}), total: ${allRows.length}`);
    if (rows.length < 2000) break;
  }

  console.log(`Got ${allRows.length} advertiser-industry rows from Metabase`);

  // Build advertiser -> tags map
  const advTags = new Map();
  for (const [advName, groupName, industryName] of allRows) {
    if (!advTags.has(advName)) advTags.set(advName, new Set());
    const tags = advTags.get(advName);

    // Add tag from industry group
    if (groupName && GROUP_TO_TAG[groupName]) {
      tags.add(GROUP_TO_TAG[groupName]);
    }

    // Add tag from specific industry
    if (industryName && INDUSTRY_TO_TAG[industryName]) {
      tags.add(INDUSTRY_TO_TAG[industryName]);
    }
  }

  const allAdvRows = [...advTags.keys()];

  console.log(`Total advertisers in Metabase: ${allAdvRows.length}`);
  const withTags = [...advTags.entries()].filter(([, t]) => t.size > 0).length;
  console.log(`Advertisers with industry tags: ${withTags}`);
  console.log(`Advertisers without tags: ${allAdvRows.length - withTags}`);

  // Print tag distribution
  const tagCounts = {};
  for (const [, tags] of advTags) {
    for (const t of tags) {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
  }
  console.log('\nTag distribution:');
  Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).forEach(([tag, count]) => {
    console.log(`  ${tag}: ${count} advertisers`);
  });

  // Now load advertiser-details.json and update tags
  const detailsPath = path.join('public', 'data', 'advertiser-details.json');
  const details = JSON.parse(fs.readFileSync(detailsPath, 'utf8'));
  console.log(`\nLoaded ${details.length} advertisers from advertiser-details.json`);

  let updated = 0;
  let alreadyTagged = 0;
  let noMatch = 0;

  for (const adv of details) {
    const metabaseTags = advTags.get(adv.name);
    if (metabaseTags && metabaseTags.size > 0) {
      const existingTags = new Set(adv.tags || []);
      const newTags = new Set([...existingTags, ...metabaseTags]);
      if (newTags.size > existingTags.size) {
        adv.tags = Array.from(newTags).sort();
        updated++;
      } else {
        alreadyTagged++;
      }
    } else {
      if (!adv.tags || adv.tags.length === 0) noMatch++;
    }
  }

  console.log(`\nResults:`);
  console.log(`  Updated with new tags: ${updated}`);
  console.log(`  Already had all tags: ${alreadyTagged}`);
  console.log(`  No Metabase match (still untagged): ${noMatch}`);

  // Save updated file
  fs.writeFileSync(detailsPath, JSON.stringify(details, null, 2));
  console.log(`\nSaved updated advertiser-details.json`);

  // Also update tags.json to reflect new tag counts from page data
  // Count tags across all page data
  const manifest = JSON.parse(fs.readFileSync(path.join('public', 'data', 'manifest.json'), 'utf8'));
  const tagCountsFromPosts = {};
  for (let i = 1; i <= manifest.totalPages; i++) {
    try {
      const page = JSON.parse(fs.readFileSync(path.join('public', 'data', `page-${String(i).padStart(4, '0')}.json`), 'utf8'));
      for (const item of page) {
        for (const tag of (item.tags || [])) {
          tagCountsFromPosts[tag] = (tagCountsFromPosts[tag] || 0) + 1;
        }
      }
    } catch {}
  }

  // Merge advertiser tags into tags.json (advertiser tags reflect on the advertisers page, not posts)
  // tags.json should reflect post tag counts, so we don't need to change it
  // But let's make sure any new tags from advertisers are represented
  const tagsPath = path.join('public', 'data', 'tags.json');
  const existingTagsJson = JSON.parse(fs.readFileSync(tagsPath, 'utf8'));

  // Add any new tag keys that don't exist yet
  for (const [, tags] of advTags) {
    for (const t of tags) {
      if (!(t in existingTagsJson)) {
        existingTagsJson[t] = 0;
        console.log(`Added new tag to tags.json: ${t}`);
      }
    }
  }
  fs.writeFileSync(tagsPath, JSON.stringify(existingTagsJson, null, 2));

  // List still-untagged advertisers
  const untagged = details.filter(a => !a.tags || a.tags.length === 0);
  if (untagged.length > 0) {
    console.log(`\nStill untagged advertisers (${untagged.length}):`);
    untagged.forEach(a => console.log(`  - ${a.name}`));
  }
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
