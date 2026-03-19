/**
 * Re-tag posts: each advertiser on a post contributes 1-2 of their most
 * specific tags. Posts with more advertisers naturally get more tags.
 * Also removes Adaptigo from all data.
 */
const fs = require('fs');
const path = require('path');
const dataDir = 'public/data';

const REMOVE_ADVERTISERS = ['Adaptigo'];

// Load advertiser details
const advPath = path.join(dataDir, 'advertiser-details.json');
let advDetails = JSON.parse(fs.readFileSync(advPath, 'utf8'));

// Count how many advertisers have each tag (for specificity)
const tagFrequency = {};
for (const adv of advDetails) {
  for (const tag of (adv.tags || [])) {
    tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
  }
}

// Specificity score: rarer tags are more specific (lower frequency = higher score)
function tagSpecificity(tag) {
  const freq = tagFrequency[tag] || 1;
  return 1 / freq;
}

// For a given advertiser, rank their tags by specificity
function getAdvTopTags(advName, count) {
  const adv = advDetails.find(a => a.name === advName);
  if (!adv || !adv.tags || adv.tags.length === 0) return [];
  const ranked = [...adv.tags].sort((a, b) => tagSpecificity(b) - tagSpecificity(a));
  return ranked.slice(0, count);
}

// Keyword boost: if a tag's keywords appear in the content, prefer it
const TAG_KEYWORDS = {
  'AI': ['ai', 'artificial intelligence', 'gpt', 'chatgpt', 'openai', 'llm', 'machine learning', 'copilot', 'claude', 'gemini'],
  'Business': ['business', 'entrepreneur', 'founder', 'ceo', 'revenue', 'growth', 'strategy', 'leadership'],
  'Careers': ['career', 'job', 'hire', 'hiring', 'resume', 'salary', 'freelance', 'remote work'],
  'Creativity': ['creative', 'design', 'art', 'writing', 'content creation', 'photography', 'video', 'branding'],
  'Crypto': ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'defi', 'nft', 'web3', 'token'],
  'E-commerce': ['ecommerce', 'e-commerce', 'shopify', 'amazon', 'store', 'retail', 'dropshipping', 'appsumo', 'deal'],
  'Education': ['education', 'learn', 'course', 'student', 'university', 'school', 'certification', 'training'],
  'Entertainment': ['entertainment', 'game', 'gaming', 'movie', 'tv', 'streaming', 'comedy', 'celebrity'],
  'Finance': ['finance', 'invest', 'stock', 'trading', 'fund', 'portfolio', 'wealth', 'money', 'dividend', 'banking', 'financial'],
  'Health': ['health', 'wellness', 'fitness', 'nutrition', 'supplement', 'sleep', 'meditation', 'workout', 'medical'],
  'Lifestyle': ['lifestyle', 'travel', 'food', 'recipe', 'fashion', 'beauty', 'home', 'parenting', 'family', 'coffee', 'wine'],
  'Marketing': ['marketing', 'seo', 'advertising', 'campaign', 'email marketing', 'social media', 'copywriting', 'funnel'],
  'Media': ['media', 'journalism', 'press', 'publication', 'editorial', 'broadcast'],
  'News': ['news', 'breaking', 'headline', 'daily brief', 'politics', 'election', 'government', 'world', 'economy'],
  'Newsletter': ['newsletter', 'subscribe', 'subscriber', 'inbox', 'beehiiv', 'substack', 'open rate', 'digest'],
  'Productivity': ['productivity', 'workflow', 'notion', 'calendar', 'efficiency', 'time management', 'focus', 'habit'],
  'Real Estate': ['real estate', 'property', 'housing', 'mortgage', 'rent', 'apartment', 'reit'],
  'SaaS': ['saas', 'platform', 'api', 'cloud', 'integration', 'dashboard', 'analytics', 'crm'],
  'Startups': ['startup', 'venture', 'vc', 'seed', 'fundraising', 'pitch', 'accelerator', 'valuation', 'bootstrapped'],
  'Technology': ['tech', 'engineering', 'developer', 'code', 'programming', 'hardware', 'cybersecurity', 'infrastructure'],
};

function contentMatchesTags(title, description, tags) {
  const text = ((title || '') + ' ' + (description || '')).toLowerCase();
  const matched = new Set();
  for (const tag of tags) {
    const keywords = TAG_KEYWORDS[tag];
    if (!keywords) continue;
    for (const kw of keywords) {
      if (text.includes(kw)) { matched.add(tag); break; }
    }
  }
  return matched;
}

// Process all page files
const pageFiles = fs.readdirSync(dataDir).filter(f => f.startsWith('page-') && f.endsWith('.json')).sort();
let removedAdvRefs = 0;
let removedPosts = 0;
let retagged = 0;

for (const pf of pageFiles) {
  const fp = path.join(dataDir, pf);
  const items = JSON.parse(fs.readFileSync(fp, 'utf8'));
  let changed = false;

  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];

    // Remove blacklisted advertisers from this post
    if (item.advertisers) {
      const before = item.advertisers.length;
      item.advertisers = item.advertisers.filter(a => !REMOVE_ADVERTISERS.includes(a.name));
      if (item.advertisers.length < before) {
        removedAdvRefs += (before - item.advertisers.length);
        changed = true;
      }
      // If post has no advertisers left, remove the post entirely
      if (item.advertisers.length === 0) {
        items.splice(i, 1);
        removedPosts++;
        changed = true;
        continue;
      }
    }

    // Re-tag: each advertiser contributes 1-2 tags
    const advNames = (item.advertisers || []).map(a => a.name);
    if (advNames.length === 0) continue;

    const tagSet = new Set();
    const contentMatches = contentMatchesTags(item.title, item.description, Object.keys(TAG_KEYWORDS));

    for (const advName of advNames) {
      const adv = advDetails.find(a => a.name === advName);
      if (!adv || !adv.tags || adv.tags.length === 0) continue;

      // Pick 2 tags per advertiser
      // Prefer tags that match the post content, then most specific
      const advTags = adv.tags;
      const contentRelevant = advTags.filter(t => contentMatches.has(t));
      const rest = advTags.filter(t => !contentMatches.has(t)).sort((a, b) => tagSpecificity(b) - tagSpecificity(a));

      // Take up to 2: content-relevant first, then most specific
      const picks = [...contentRelevant, ...rest].slice(0, 2);
      picks.forEach(t => tagSet.add(t));
    }

    const newTags = Array.from(tagSet).sort();
    const oldTags = (item.tags || []).sort();

    if (newTags.length > 0 && (newTags.length !== oldTags.length || newTags.some((t, i) => t !== oldTags[i]))) {
      item.tags = newTags;
      changed = true;
      retagged++;
    }
  }

  if (changed) fs.writeFileSync(fp, JSON.stringify(items));
}

// Remove from advertiser-details.json
for (const name of REMOVE_ADVERTISERS) {
  const idx = advDetails.findIndex(a => a.name === name);
  if (idx !== -1) {
    console.log('Removed advertiser:', advDetails[idx].name, '(' + advDetails[idx].count + ' ads)');
    advDetails.splice(idx, 1);
  }
}
fs.writeFileSync(advPath, JSON.stringify(advDetails));

// Remove from advertisers.json
const mapPath = path.join(dataDir, 'advertisers.json');
const advMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
for (const name of REMOVE_ADVERTISERS) {
  if (advMap[name]) {
    delete advMap[name];
    console.log('Removed from advertisers.json:', name);
  }
}
fs.writeFileSync(mapPath, JSON.stringify(advMap));

// Rebuild tags.json
const tagCounts = {};
for (const pf of pageFiles) {
  const items = JSON.parse(fs.readFileSync(path.join(dataDir, pf), 'utf8'));
  for (const item of items) {
    for (const tag of (item.tags || [])) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
}
fs.writeFileSync(path.join(dataDir, 'tags.json'), JSON.stringify(tagCounts));

// Rebuild oldest.json
const allItems = [];
for (const pf of pageFiles) {
  const items = JSON.parse(fs.readFileSync(path.join(dataDir, pf), 'utf8'));
  for (const item of items) {
    if (item.date) allItems.push(item);
  }
}
allItems.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
fs.writeFileSync(path.join(dataDir, 'oldest.json'), JSON.stringify(allItems.slice(0, 5000)));

console.log('\nResults:');
console.log('  Removed advertiser references:', removedAdvRefs);
console.log('  Removed posts (no advertisers left):', removedPosts);
console.log('  Posts retagged:', retagged);
console.log('  Advertisers remaining:', advDetails.length);
console.log('  Tags:', Object.keys(tagCounts).length);

// Tag count distribution
const countDist = {};
let total = 0;
for (const pf of pageFiles) {
  const items = JSON.parse(fs.readFileSync(path.join(dataDir, pf), 'utf8'));
  for (const item of items) {
    total++;
    const n = (item.tags || []).length;
    countDist[n] = (countDist[n] || 0) + 1;
  }
}
console.log('\nTag count distribution:');
for (const n of Object.keys(countDist).sort((a,b) => a - b)) {
  console.log('  ' + n + ' tags: ' + countDist[n].toLocaleString());
}
console.log('  Total posts:', total.toLocaleString());

// Show the wednesday post
const slugIndex = JSON.parse(fs.readFileSync(path.join(dataDir, 'slug-index.json'), 'utf8'));
const wedPage = slugIndex['wednesday'];
if (wedPage) {
  const items = JSON.parse(fs.readFileSync(path.join(dataDir, 'page-' + String(wedPage).padStart(4,'0') + '.json'), 'utf8'));
  const post = items.find(i => i.id === 'wednesday');
  if (post) {
    console.log('\nWednesday post check:');
    console.log('  Advertisers:', post.advertisers.map(a => a.name).join(', '));
    console.log('  Tags:', post.tags.join(', '));
  }
}
