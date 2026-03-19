/**
 * Re-tag posts with relevant tags based on content (title + description),
 * instead of blindly inheriting all advertiser tags.
 *
 * Strategy:
 * - Build keyword lists for each tag
 * - Score each tag against the post's title + description
 * - Keep top 1-3 scoring tags per post
 * - If no keywords match, fall back to advertiser's top 1-2 most common tags
 */
const fs = require('fs');
const path = require('path');
const dataDir = 'public/data';

// Keywords for each tag (lowercase). More specific = better.
const TAG_KEYWORDS = {
  'AI': ['ai', 'artificial intelligence', 'machine learning', 'gpt', 'chatgpt', 'openai', 'llm', 'deep learning', 'neural', 'automation', 'copilot', 'claude', 'gemini', 'midjourney', 'dall-e', 'stable diffusion', 'prompt', 'generative'],
  'Business': ['business', 'entrepreneur', 'founder', 'ceo', 'company', 'startup', 'revenue', 'profit', 'growth', 'strategy', 'leadership', 'management', 'executive', 'corporate', 'enterprise', 'b2b', 'acquisition', 'merger'],
  'Careers': ['career', 'job', 'hire', 'hiring', 'resume', 'interview', 'salary', 'remote work', 'freelance', 'recruiter', 'employment', 'linkedin', 'workplace', 'promotion'],
  'Creativity': ['creative', 'design', 'art', 'writing', 'writer', 'content creation', 'photography', 'video', 'film', 'music', 'podcast', 'storytelling', 'illustration', 'brand', 'branding'],
  'Crypto': ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'defi', 'nft', 'web3', 'token', 'mining', 'solana', 'altcoin', 'wallet', 'decentralized'],
  'E-commerce': ['ecommerce', 'e-commerce', 'shopify', 'amazon', 'store', 'product', 'sell', 'selling', 'retail', 'dropshipping', 'marketplace', 'shop', 'cart', 'checkout', 'merchant', 'appsumo', 'deal', 'lifetime deal'],
  'Education': ['education', 'learn', 'learning', 'course', 'class', 'student', 'university', 'college', 'school', 'degree', 'certification', 'training', 'tutorial', 'academy', 'teach', 'lesson'],
  'Entertainment': ['entertainment', 'game', 'gaming', 'movie', 'tv', 'show', 'series', 'streaming', 'netflix', 'spotify', 'comedy', 'fun', 'quiz', 'trivia', 'celebrity'],
  'Finance': ['finance', 'invest', 'investing', 'investment', 'stock', 'market', 'trading', 'fund', 'portfolio', 'wealth', 'money', 'dividend', 'bond', 'etf', 'ipo', 'banking', 'bank', 'retirement', '401k', 'savings', 'financial', 'hedge'],
  'Health': ['health', 'wellness', 'fitness', 'workout', 'exercise', 'nutrition', 'diet', 'supplement', 'vitamin', 'sleep', 'mental health', 'meditation', 'yoga', 'weight', 'healthcare', 'medical', 'doctor', 'therapy'],
  'Lifestyle': ['lifestyle', 'travel', 'food', 'recipe', 'cooking', 'fashion', 'beauty', 'home', 'garden', 'parenting', 'family', 'dating', 'relationship', 'pet', 'wine', 'coffee'],
  'Marketing': ['marketing', 'seo', 'ads', 'advertising', 'campaign', 'email marketing', 'social media', 'conversion', 'funnel', 'copywriting', 'newsletter growth', 'audience', 'engagement', 'click', 'ctr', 'landing page', 'ad spend'],
  'Media': ['media', 'news', 'journalism', 'press', 'publication', 'magazine', 'newspaper', 'report', 'editorial', 'broadcast'],
  'News': ['news', 'breaking', 'headline', 'daily brief', 'today', 'update', 'politics', 'election', 'government', 'policy', 'congress', 'president', 'world', 'global', 'economy', 'economic'],
  'Newsletter': ['newsletter', 'subscribe', 'subscriber', 'inbox', 'email list', 'beehiiv', 'substack', 'mailchimp', 'open rate', 'send', 'digest'],
  'Productivity': ['productivity', 'tool', 'app', 'software', 'workflow', 'notion', 'calendar', 'task', 'organize', 'efficiency', 'hack', 'tip', 'time management', 'focus', 'habit'],
  'Real Estate': ['real estate', 'property', 'housing', 'mortgage', 'rent', 'apartment', 'home buying', 'landlord', 'tenant', 'commercial property', 'reit'],
  'SaaS': ['saas', 'software', 'platform', 'api', 'cloud', 'tool', 'app', 'subscription', 'integration', 'dashboard', 'analytics', 'crm', 'erp'],
  'Startups': ['startup', 'founding', 'venture', 'vc', 'seed', 'series a', 'fundraising', 'pitch', 'incubator', 'accelerator', 'y combinator', 'valuation', 'bootstrapped', 'launch'],
  'Technology': ['technology', 'tech', 'engineering', 'developer', 'code', 'coding', 'programming', 'hardware', 'chip', 'semiconductor', 'cybersecurity', 'data', 'infrastructure', 'open source', 'linux', 'cloud computing'],
};

// Build regex patterns for each tag (match whole words where practical)
const TAG_PATTERNS = {};
for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
  // Sort by length desc so longer phrases match first
  const sorted = keywords.sort((a, b) => b.length - a.length);
  const escaped = sorted.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  TAG_PATTERNS[tag] = new RegExp('\\b(' + escaped.join('|') + ')\\b', 'gi');
}

// Load advertiser details for fallback
const advDetails = JSON.parse(fs.readFileSync(path.join(dataDir, 'advertiser-details.json'), 'utf8'));
const advTagMap = new Map();
for (const adv of advDetails) {
  advTagMap.set(adv.name, adv.tags || []);
}

// Count tag frequency across all advertisers for "specificity" scoring
// Rarer tags are more specific/meaningful
const tagFrequency = {};
for (const adv of advDetails) {
  for (const tag of (adv.tags || [])) {
    tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
  }
}
const maxFreq = Math.max(...Object.values(tagFrequency));

function scorePost(title, description, availableTags) {
  const text = ((title || '') + ' ' + (description || '')).toLowerCase();
  if (!text.trim()) return [];

  const scores = [];
  for (const tag of availableTags) {
    const pattern = TAG_PATTERNS[tag];
    if (!pattern) continue;

    const matches = text.match(pattern) || [];
    if (matches.length === 0) continue;

    // Score: number of keyword matches, weighted by tag specificity
    const specificity = 1 - ((tagFrequency[tag] || 0) / maxFreq) * 0.5; // 0.5-1.0
    const score = matches.length * specificity;

    // Bonus for title matches (more relevant)
    const titleText = (title || '').toLowerCase();
    const titleMatches = titleText.match(pattern) || [];
    const titleBonus = titleMatches.length * 2;

    scores.push({ tag, score: score + titleBonus, matches: matches.length });
  }

  // Sort by score desc
  scores.sort((a, b) => b.score - a.score);
  return scores;
}

// Process all page files
const pageFiles = fs.readdirSync(dataDir).filter(f => f.startsWith('page-') && f.endsWith('.json')).sort();
let totalModified = 0;
let totalReduced = 0;
let totalKept = 0;
const tagDistribution = {};

for (const pf of pageFiles) {
  const fp = path.join(dataDir, pf);
  const items = JSON.parse(fs.readFileSync(fp, 'utf8'));
  let changed = false;

  for (const item of items) {
    const oldTags = item.tags || [];
    if (oldTags.length <= 3) {
      // Already fine
      totalKept++;
      for (const t of oldTags) tagDistribution[t] = (tagDistribution[t] || 0) + 1;
      continue;
    }

    // Get available tags from advertiser(s)
    const advTags = new Set();
    for (const adv of (item.advertisers || [])) {
      const tags = advTagMap.get(adv.name);
      if (tags) tags.forEach(t => advTags.add(t));
    }

    // Score tags based on post content
    const scored = scorePost(item.title, item.description, oldTags);

    let newTags;
    if (scored.length >= 1) {
      // Take top 1-3 scoring tags
      newTags = scored.slice(0, 3).map(s => s.tag);
    } else {
      // No keyword matches — pick the 1-2 most specific advertiser tags
      const bySpecificity = oldTags
        .filter(t => tagFrequency[t])
        .sort((a, b) => (tagFrequency[a] || 0) - (tagFrequency[b] || 0));
      newTags = bySpecificity.slice(0, 2);
      if (newTags.length === 0) newTags = oldTags.slice(0, 2);
    }

    if (newTags.length !== oldTags.length || newTags.some((t, i) => t !== oldTags[i])) {
      item.tags = newTags.sort();
      changed = true;
      totalModified++;
      if (newTags.length < oldTags.length) totalReduced++;
    } else {
      totalKept++;
    }

    for (const t of (item.tags || [])) tagDistribution[t] = (tagDistribution[t] || 0) + 1;
  }

  if (changed) fs.writeFileSync(fp, JSON.stringify(items));
}

console.log('Posts modified:', totalModified);
console.log('Posts with reduced tags:', totalReduced);
console.log('Posts kept as-is:', totalKept);
console.log('\nTag distribution after:');
const sorted = Object.entries(tagDistribution).sort((a, b) => b[1] - a[1]);
for (const [tag, count] of sorted) {
  console.log(`  ${tag}: ${count.toLocaleString()}`);
}

// Show distribution of tag counts
const countDist = {};
for (const pf of pageFiles) {
  const items = JSON.parse(fs.readFileSync(path.join(dataDir, pf), 'utf8'));
  for (const item of items) {
    const n = (item.tags || []).length;
    const bucket = n <= 3 ? `${n}` : n <= 5 ? '4-5' : '6+';
    countDist[bucket] = (countDist[bucket] || 0) + 1;
  }
}
console.log('\nTag count distribution:');
for (const [bucket, count] of Object.entries(countDist).sort()) {
  console.log(`  ${bucket} tags: ${count.toLocaleString()}`);
}
