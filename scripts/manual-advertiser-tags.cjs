/**
 * Manually assign correct tags to every advertiser based on what they actually do.
 * Then re-tag all posts: each advertiser contributes all their tags.
 */
const fs = require('fs');
const path = require('path');
const dataDir = 'public/data';

// Manual tag assignments: advertiser name -> [tags]
// Tags: AI, Business, Careers, Creativity, Crypto, E-commerce, Education, Entertainment,
//        Finance, Health, Lifestyle, Marketing, Media, News, Newsletter, Productivity,
//        Real Estate, SaaS, Startups, Technology
const MANUAL_TAGS = {
  '1440 Media': ['News', 'Media'],
  'The Rundown AI': ['AI', 'Technology', 'Newsletter'],
  'Superhuman AI': ['AI', 'Technology', 'Newsletter'],
  'Hubspot': ['Marketing', 'SaaS'],
  'Morning Brew': ['Business', 'News', 'Newsletter'],
  'The AI Report': ['AI', 'Technology', 'Newsletter'],
  'Roku': ['Entertainment', 'Technology'],
  'Pacaso': ['Real Estate'],
  'Money.com': ['Finance'],
  'beehiiv': ['Newsletter', 'Marketing'],
  'Mindstream': ['AI', 'Newsletter'],
  'The Daily Upside': ['Finance', 'News', 'Newsletter'],
  'Masterworks': ['Finance', 'Startups'],
  'Attio': ['SaaS', 'Productivity'],
  'PodPitch': ['Marketing', 'Media'],
  'Artisan': ['AI', 'SaaS'],
  'Mood Gummies': ['Health'],
  'AdQuick': ['Marketing'],
  'AG1': ['Health'],
  'The Marketing Millennials': ['Marketing', 'Newsletter'],
  'Wispr Flow': ['AI', 'Productivity'],
  'Deel': ['Business', 'SaaS', 'Careers'],
  'Marketing Against The Grain': ['Marketing', 'Newsletter'],
  'Growth School': ['Education', 'Marketing'],
  'The Deep View': ['AI', 'Technology', 'Newsletter'],
  'Elite Trade Club': ['Finance', 'Newsletter'],
  'guidde': ['AI', 'SaaS', 'Productivity'],
  'Google AdSense': ['Marketing', 'Technology'],
  'Finance Buzz': ['Finance', 'Newsletter'],
  'Synthflow': ['AI', 'SaaS'],
  'I Hate It Here': ['Careers', 'Newsletter'],
  'Levanta': ['E-commerce', 'Marketing'],
  'The Hustle': ['Business', 'News', 'Newsletter'],
  'The Code': ['AI', 'Technology', 'Newsletter'],
  'Fisher Investments': ['Finance'],
  'Huel': ['Health', 'E-commerce'],
  'RYSE': ['Finance', 'Startups', 'Technology'],
  'Betterment': ['Finance'],
  'Gamma': ['AI', 'Productivity', 'SaaS'],
  'Pique Life': ['Health'],
  'Writer': ['AI', 'SaaS', 'Productivity'],
  'Mode Mobile': ['Finance', 'Startups', 'Technology'],
  'Value Investor Daily': ['Finance', 'Newsletter'],
  'Proton': ['Technology', 'Productivity'],
  'Neurons': ['Marketing', 'AI'],
  'Gladly.ai': ['AI', 'SaaS'],
  'Lindy.ai': ['AI', 'Productivity', 'SaaS'],
  'Go-to-Millions': ['Marketing', 'Business'],
  'Wall Street Prep': ['Finance', 'Education'],
  'Authory': ['Creativity', 'SaaS', 'Productivity'],
  'Bullseye Trades': ['Finance'],
  'KeepCart': ['E-commerce', 'SaaS'],
  'BELAY': ['Business', 'Productivity'],
  "Brad's Deals": ['E-commerce'],
  'CBDistillery': ['Health'],
  'BetterHelp': ['Health'],
  'Long Angle': ['Finance'],
  'Bay Area Times': ['Technology', 'News', 'Newsletter'],
  'Pressmaster DMCC': ['Marketing', 'AI'],
  'Stack Influence': ['Marketing', 'E-commerce'],
  'Typeless': ['AI', 'Productivity'],
  'The Pour Over': ['News', 'Newsletter'],
  'HoneyBook': ['SaaS', 'Business', 'Creativity'],
  'AE Studio': ['Technology', 'AI', 'SaaS'],
  'The Flyover': ['News', 'Newsletter'],
  'Nike': ['Lifestyle', 'E-commerce'],
  'Kajabi': ['SaaS', 'E-commerce', 'Marketing'],
  'Vinovest': ['Finance', 'Lifestyle'],
  'SelectSoftware Reviews': ['SaaS', 'Technology'],
  'Rippling': ['SaaS', 'Business'],
  'Bill.com': ['Finance', 'SaaS'],
  'Vanta': ['SaaS', 'Technology'],
  'CoW': ['Crypto'],
  'Hungryroot': ['Health', 'Lifestyle', 'E-commerce'],
  'Stocks & Income': ['Finance', 'Newsletter'],
  'BetterSleep': ['Health'],
  'Intercom': ['SaaS', 'Technology'],
  'RAD Intel': ['Marketing', 'AI'],
  'Fintech Takes': ['Finance', 'Technology', 'Newsletter'],
  'GURU': ['Marketing', 'Business'],
  'CompareCredit': ['Finance'],
  'EnergyX': ['Finance', 'Startups', 'Technology'],
  'Fellow': ['Productivity', 'SaaS'],
  'Crypto101': ['Crypto', 'Education'],
  'Premium Ghostwriting Academy': ['Creativity', 'Education', 'Marketing'],
  'Maven AGI': ['AI', 'SaaS'],
  'Medik8': ['Health', 'E-commerce'],
  'RunDot': ['Health', 'AI'],
  'Analytica Investor': ['Finance', 'Newsletter'],
  'Axios HQ': ['Business', 'Productivity', 'SaaS'],
  'you.com': ['AI', 'Technology'],
  'Salesforge': ['SaaS', 'Marketing', 'AI'],
  'Notion': ['Productivity', 'SaaS'],
  'AI Capital News': ['AI', 'Finance', 'Newsletter'],
  '2U': ['Education'],
  'Motley Fool Money': ['Finance'],
  'Cornbread Hemp': ['Health'],
  'Gethookd': ['AI', 'SaaS'],
  'Udacity': ['Education', 'Technology'],
  'Tangle': ['News', 'Newsletter'],
  'Shutterstock': ['Creativity', 'E-commerce'],
  'AltIndex': ['Finance', 'Newsletter'],
  'Confluence VC': ['Startups', 'Finance', 'Newsletter'],
  'Intrepid Travel': ['Lifestyle'],
  'Particle for Men': ['Health', 'E-commerce'],
  'ListKit': ['Marketing', 'SaaS'],
  'Black Crow AI': ['AI', 'E-commerce', 'SaaS'],
  'Vincent': ['AI', 'Finance'],
  'Fyxer AI': ['AI', 'Productivity'],
  'Klondike Royalties': ['Finance', 'Startups'],
  'Consensus': ['Crypto'],
  'ClickFunnels': ['Marketing', 'SaaS'],
  'Polymarket': ['Crypto', 'Finance'],
  'ACTIVE': ['E-commerce', 'Lifestyle'],
  'EverQuote': ['Finance'],
  'Skej': ['AI', 'Productivity', 'SaaS'],
  'Livelong Media': ['Marketing', 'Media'],
  'Ground News': ['News', 'Media'],
  'Zipchat': ['AI', 'E-commerce', 'SaaS'],
  'Haus': ['Marketing', 'SaaS'],
  'Email Based Course': ['Education', 'Marketing'],
  'Bright Data': ['Technology', 'SaaS'],
  'Lysted': ['E-commerce', 'SaaS'],
  'TaylorMade': ['Lifestyle', 'E-commerce'],
  'Author.Inc': ['Creativity', 'Education'],
  'Momentous': ['Health', 'E-commerce'],
  'Pinata': ['Technology', 'SaaS'],
  'Coactive': ['AI', 'SaaS'],
  'VaultCraft': ['Crypto'],
  'The Feed': ['Health', 'E-commerce'],
  'Advisor.com': ['Finance'],
  'Lumen': ['Health'],
  'SuppCo': ['Health', 'E-commerce'],
  'Chargeflow': ['E-commerce', 'SaaS'],
  'Relatable': ['Marketing', 'SaaS'],
  'Inspire Financial': ['Finance'],
  'Contrarian Thinking': ['Finance', 'Newsletter'],
  'Convergence AI': ['AI', 'Technology'],
  'Acadia Learning': ['Education'],
  'Babbel': ['Education'],
  'Fay Nutrition': ['Health'],
  'Tovala': ['Lifestyle', 'E-commerce'],
  'MEDVi': ['Health'],
  'Collective': ['Finance', 'Business'],
  'Cizzle Bio': ['Health', 'Finance', 'Startups'],
  'inFlow Inventory': ['SaaS', 'E-commerce'],
  'Syllaby.io': ['Marketing', 'AI', 'SaaS'],
  'AI with Allie': ['AI', 'Newsletter'],
  'Uniswap': ['Crypto'],
  'Prompt Engineering Daily': ['AI', 'Newsletter'],
  'Decentraland': ['Crypto', 'Entertainment'],
  'Branded Bills': ['E-commerce', 'Lifestyle'],
  'DIRTEA': ['Health', 'E-commerce'],
  'The Oxford Club': ['Finance'],
  'Peak Bank': ['Finance'],
  'brodo': ['Health', 'E-commerce'],
  'Inflow': ['Health'],
  'Deepgram': ['AI', 'Technology', 'SaaS'],
  'Ohai.ai': ['AI', 'Productivity'],
  'HomeBuddy': ['Real Estate'],
  'Nautilus': ['Media', 'Education'],
  'Contra': ['Careers', 'AI', 'Productivity'],
  'Kojo': ['E-commerce'],
  'Riverside': ['Creativity', 'SaaS'],
  'Stan': ['E-commerce', 'Creativity'],
  'StartEngine': ['Finance', 'Startups'],
  'Oceans': ['Business', 'Careers'],
  'Med-X': ['Health'],
  'ClickUp': ['Productivity', 'SaaS'],
  'Climatize': ['Finance', 'Startups'],
  'Wing Assistant': ['Business', 'Productivity'],
  'Speedeon Data': ['Marketing'],
  'Raptive': ['Marketing', 'Media'],
  'American Marketing Association': ['Marketing', 'Education'],
  'Counterflow': ['Health', 'E-commerce'],
  'No Scrubs': ['Marketing', 'Newsletter'],
  'Enterpret': ['SaaS', 'AI'],
  'Lulu': ['Creativity', 'E-commerce'],
  'trainwell': ['Health'],
  'Besolo': ['Business', 'Finance'],
  'Allara': ['Health'],
  'Delve': ['Finance', 'SaaS'],
  '6AM City': ['News', 'Newsletter'],
  'Oneleet': ['Technology'],
  'Land.id': ['Real Estate', 'SaaS'],
  'Headway': ['Education', 'Productivity'],
  'Opus Pro': ['AI', 'Creativity', 'SaaS'],
  'CEIFX': ['Finance'],
  'Codeium': ['AI', 'Technology'],
  'Planable': ['Marketing', 'SaaS'],
  'Spot Pet Insurance': ['Finance', 'Lifestyle'],
  'TX Flyover': ['News', 'Newsletter'],
  'POP': ['Technology', 'SaaS'],
  'flowkey': ['Education', 'Entertainment'],
  'Every.io': ['Finance', 'SaaS'],
  'Moonwlkr': ['Health', 'E-commerce'],
  'Upmarket': ['Finance', 'SaaS'],
  'Limitless': ['AI', 'Productivity'],
  'Forward Future AI': ['AI', 'Newsletter'],
  'Remofirst': ['Business', 'Careers', 'SaaS'],
  'Perpetua Life': ['Health'],
  'that startup guy': ['Startups', 'Newsletter'],
  'ExpressPros': ['Careers'],
  'Galactic Fed': ['Marketing'],
  'insightsoftware': ['SaaS', 'Finance'],
  'KwaKwa': ['Marketing', 'SaaS'],
  'Ladders': ['Careers'],
  'JKBX': ['Finance', 'Entertainment'],
  'Pioneer by Fin': ['AI', 'Finance', 'SaaS'],
  'Incogni': ['Technology'],
  'Korrect': ['Health', 'E-commerce'],
  'Kudos': ['Finance', 'E-commerce'],
  'Ubiquitous': ['Marketing'],
  'Ahrefs': ['Marketing', 'SaaS'],
  'QuarterZip': ['AI', 'Marketing'],
  'Hims': ['Health', 'E-commerce'],
  'Booksi': ['Lifestyle'],
  'The Early Bird': ['Finance', 'Newsletter'],
  'reMarkable': ['Productivity', 'Technology'],
  'GoldCo': ['Finance'],
  'Storage Scholars': ['Startups', 'Lifestyle'],
  'Purple Carrot': ['Health', 'Lifestyle', 'E-commerce'],
  'Agora': ['Real Estate', 'Finance'],
  'Tiege Hanley': ['Health', 'E-commerce'],
  'Yellow Brick Road': ['Finance', 'Newsletter'],
  'Stacked Marketer': ['Marketing', 'Newsletter'],
  'Quince': ['E-commerce', 'Lifestyle'],
  'Dub': ['Finance', 'SaaS'],
  'Anyword': ['AI', 'Marketing', 'SaaS'],
  'The Black Tux': ['E-commerce', 'Lifestyle'],
  'INMO': ['Technology', 'Startups'],
  'VantagePoint': ['Finance', 'AI'],
  'Netflix': ['Entertainment'],
  'Surf Lakes': ['Startups', 'Lifestyle'],
  'The Rave': ['Lifestyle', 'Newsletter'],
  'Webstreet': ['Finance', 'E-commerce'],
  'LookyLoo': ['Real Estate'],
  'Haystack': ['AI', 'SaaS'],
  'Compare.com': ['Finance'],
  'Rewardful': ['SaaS', 'Marketing'],
  'DESelect': ['Marketing', 'SaaS'],
  'Ultimate Health Store': ['Health', 'E-commerce'],
  'Timeplast': ['Startups', 'Technology'],
  'Neo': ['AI', 'Technology'],
  'Miso Robotics': ['AI', 'Startups', 'Finance'],
  'Walaaxy': ['Marketing', 'SaaS'],
  'James Allen': ['E-commerce', 'Lifestyle'],
  'Timeline': ['Health'],
  'Superpower': ['Health'],
  '4AM Media': ['Marketing', 'Media'],
  'ELEKS': ['Technology', 'SaaS'],
  'DraftBoard': ['Entertainment'],
  'Boxabl': ['Real Estate', 'Startups'],
  'Audien Hearing': ['Health', 'E-commerce'],
  'Puck News': ['News', 'Media'],
  'Kenny Flowers': ['E-commerce', 'Lifestyle'],
  'EnergySage': ['Finance', 'Lifestyle'],
  'Monday.com': ['Productivity', 'SaaS'],
  'Agoura Health Products, LLC': ['Health', 'E-commerce'],
  'minisocial': ['Marketing'],
  'JRNYS': ['Lifestyle'],
  'Grapevine AI': ['AI', 'Marketing'],
  'WeightCare': ['Health'],
  'Accio AI': ['AI', 'E-commerce'],
  'OneScreen': ['Marketing'],
  'Speks': ['E-commerce', 'Entertainment'],
  'Autopilot': ['Finance', 'AI'],
  'Cozy Earth': ['E-commerce', 'Lifestyle'],
  'Creatopy': ['Marketing', 'Creativity', 'SaaS'],
  "Altucher's Investment Network": ['Finance', 'Newsletter'],
  'BusinessLoans.com': ['Finance', 'Business'],
  'All About Change': ['Media', 'Entertainment'],
  'Republic': ['Finance', 'Startups'],
  'Abundant Mines': ['Finance', 'Startups'],
  'Goody': ['E-commerce', 'Business'],
  'BRUNT Workwear': ['E-commerce', 'Lifestyle'],
  'Westbound & Down': ['Finance', 'Startups'],
  'Venice.AI': ['AI', 'Technology'],
  'Superside': ['Creativity', 'Marketing', 'SaaS'],
  'doola': ['Business', 'Startups'],
  'Trust & Will': ['Finance'],
  'Wistia': ['Marketing', 'SaaS'],
  'SoundSelf': ['Health', 'Entertainment'],
  'Agree.com': ['SaaS', 'Business'],
  'Ariyh': ['Marketing', 'Newsletter'],
  'Marpipe': ['Marketing', 'SaaS'],
  '1906': ['Health', 'E-commerce'],
  'Aires Tech': ['Health', 'Technology'],
  'Sidebar': ['Careers', 'Education'],
  'Freespoke': ['News', 'Technology'],
  'Harlo': ['Health', 'E-commerce'],
  'OneNine': ['Finance', 'SaaS'],
  'Prezi': ['Productivity', 'SaaS'],
  'Public Rec': ['E-commerce', 'Lifestyle'],
  'Cartograph': ['Marketing', 'SaaS'],
  'Growth Daily': ['Marketing', 'Newsletter'],
  'Queensboro': ['E-commerce', 'Business'],
  'AARE': ['Finance', 'Startups'],
  'AMASS': ['Lifestyle', 'E-commerce'],
  'ESGold': ['Finance', 'Startups'],
  'IT Brew': ['Technology', 'Newsletter'],
  'Qualia': ['Health'],
  'InstaHeadshots': ['AI', 'SaaS'],
  'SmartNora': ['Health', 'E-commerce'],
  'Bonner Wines': ['Lifestyle', 'E-commerce'],
  'Crossbridge': ['Finance', 'Business'],
  'Motion': ['Marketing', 'SaaS'],
  'Penguin Random House': ['Entertainment', 'Creativity'],
  'EarningsHub': ['Finance'],
  'CloudDevs': ['Technology', 'Careers'],
  'Surmount AI': ['AI', 'Finance'],
  'Aura Health': ['Health'],
  'Little Bellies': ['Health', 'Lifestyle'],
  'Inbox Hacking': ['Marketing', 'Newsletter'],
  'World Copper': ['Finance', 'Startups'],
  'Spotloan': ['Finance'],
  'Smart Recognition': ['Business', 'SaaS'],
  'Healthcare.com': ['Health', 'Finance'],
  'Safara': ['Lifestyle', 'E-commerce'],
  'Bolt.new': ['AI', 'Technology', 'SaaS'],
  'Dollar Flight Club': ['Lifestyle'],
  'Elf Labs': ['Entertainment', 'Startups'],
  'NativePath': ['Health', 'E-commerce'],
  'PlayersTV': ['Entertainment', 'Media'],
  'Blossom Social': ['Finance', 'SaaS'],
  'Yu Tea': ['Health', 'E-commerce'],
  'Xembly': ['AI', 'Productivity', 'SaaS'],
  'FL Flyover': ['News', 'Newsletter'],
  'Beyond Blue Media': ['Marketing', 'Media'],
  'Rainbook': ['Finance', 'SaaS'],
  'Imprint': ['Education'],
  'Bedtime Stories with Netflix Jr.': ['Entertainment'],
  'Blind Barrels': ['Lifestyle', 'E-commerce'],
  'KeeperTax': ['Finance', 'SaaS'],
  'Flot AI': ['AI', 'Productivity'],
  'PromoTix': ['Marketing', 'SaaS'],
  'Clumio': ['Technology', 'SaaS'],
  'Orbit': ['Marketing', 'SaaS'],
  'AISOAP': ['Health', 'E-commerce'],
  'Choose Your Horizon': ['Finance', 'Startups'],
  'Chime': ['Finance'],
  'BlueAlpha': ['AI', 'Technology'],
  'Rho': ['Finance', 'SaaS'],
  'Slidebean': ['Startups', 'SaaS'],
  'Nile': ['Technology'],
  'OddsJam': ['Entertainment'],
  'Search Party': ['Entertainment'],
  'Winona': ['Health'],
  'Virtuix': ['Technology', 'Startups', 'Entertainment'],
  'Pinecone': ['AI', 'Technology', 'SaaS'],
  'TerraCycle': ['Lifestyle'],
  'Fruitful': ['Finance'],
  'Fare Drop': ['Lifestyle'],
  'Brew Markets': ['Finance', 'Newsletter'],
  'Mintlify': ['Technology', 'SaaS'],
  'Plan to Eat': ['Health', 'Lifestyle'],
  'Deal Sheet': ['E-commerce', 'Newsletter'],
  'Beverly Hills MD, LLC': ['Health', 'E-commerce'],
  'Healthcare Brew': ['Health', 'Newsletter'],
  'Pair AI': ['AI', 'SaaS'],
  'Kraken': ['Crypto'],
  'Krete': ['Technology', 'Startups'],
  'Birch Gold': ['Finance'],
  'Nucific': ['Health', 'E-commerce'],
  'Alibaba Lens': ['AI', 'E-commerce'],
  'The Information': ['Technology', 'News', 'Media'],
  'Mastermind': ['Business', 'Education'],
  'TheoTrade': ['Finance', 'Education'],
  'Date Night Dancing': ['Lifestyle', 'Entertainment'],
  'Celluma': ['Health'],
  'Keith Prowse': ['Marketing'],
  'Ententee': ['Creativity', 'E-commerce'],
  'ZenniHomes': ['Real Estate', 'Startups'],
  'Anvara': ['Health', 'E-commerce'],
  'Care2': ['Lifestyle'],
  'Straight+': ['Health', 'E-commerce'],
  'Retain IQ': ['Marketing', 'SaaS'],
  'Pirouette': ['Health', 'Startups'],
  'Insurify Auto': ['Finance'],
  'Shoelace': ['Marketing', 'SaaS'],
  'Dex': ['AI', 'Productivity'],
  'Naked Wines': ['Lifestyle', 'E-commerce'],
  'Empire Today': ['Real Estate', 'Lifestyle'],
  'Noom': ['Health'],
  'Cheers': ['Finance'],
  'STORI AI': ['AI', 'Marketing'],
  'AptDeco': ['E-commerce', 'Lifestyle'],
  'Otherweb': ['AI', 'Technology', 'Startups'],
  'Tabs': ['Health', 'E-commerce'],
  'Vero3': ['Finance', 'Startups'],
  'Alibaba': ['E-commerce'],
  'Death & Co.': ['Lifestyle', 'Finance', 'Startups'],
  'Critical Start': ['Technology'],
  'Metabase': ['Technology', 'SaaS'],
  'Facia': ['AI', 'Technology'],
  'Ask CMO': ['Marketing', 'Newsletter'],
  'Taplio': ['Marketing', 'SaaS'],
  'Motion.io': ['SaaS', 'Productivity'],
  'WIldgrain': ['Lifestyle', 'E-commerce'],
  'Trading Tips': ['Finance'],
  'California Pet Partners, LLC': ['Health', 'E-commerce'],
  'Gryphon': ['Technology', 'Startups'],
  'Launched - Premium Ghost Writing Academy': ['Creativity', 'Education', 'Marketing'],
  'Fisico': ['Health', 'E-commerce'],
  'Unspun Updates': ['News', 'Newsletter'],
  'Remote': ['Careers', 'SaaS'],
  'Immersed': ['Technology', 'Startups'],
  'Opensend': ['Marketing', 'SaaS'],
  'The Bouqs Co.': ['E-commerce', 'Lifestyle', 'Startups'],
};

// Apply tags to advertiser-details.json
const advPath = path.join(dataDir, 'advertiser-details.json');
const advDetails = JSON.parse(fs.readFileSync(advPath, 'utf8'));

let tagged = 0;
let untagged = [];
for (const adv of advDetails) {
  const tags = MANUAL_TAGS[adv.name];
  if (tags) {
    adv.tags = tags.sort();
    tagged++;
  } else {
    untagged.push(adv.name);
    // Default: keep existing tags but cap at 3 most specific
    if (adv.tags && adv.tags.length > 3) {
      adv.tags = adv.tags.slice(0, 3);
    }
  }
}
fs.writeFileSync(advPath, JSON.stringify(advDetails));
console.log('Tagged', tagged, 'advertisers');
if (untagged.length > 0) {
  console.log('Untagged:', untagged.join(', '));
}

// Build advertiser tag map for post tagging
const advTagMap = new Map();
for (const adv of advDetails) {
  advTagMap.set(adv.name, adv.tags || []);
}

// Re-tag all posts from their advertisers
const pageFiles = fs.readdirSync(dataDir).filter(f => f.startsWith('page-') && f.endsWith('.json')).sort();
let retagged = 0;

for (const pf of pageFiles) {
  const fp = path.join(dataDir, pf);
  const items = JSON.parse(fs.readFileSync(fp, 'utf8'));
  let changed = false;

  for (const item of items) {
    const advNames = (item.advertisers || []).map(a => a.name);
    if (advNames.length === 0) continue;

    const tagSet = new Set();
    for (const name of advNames) {
      const tags = advTagMap.get(name);
      if (tags) tags.forEach(t => tagSet.add(t));
    }

    const newTags = Array.from(tagSet).sort();
    const oldTags = (item.tags || []).sort();

    if (newTags.length > 0 && (newTags.join(',') !== oldTags.join(','))) {
      item.tags = newTags;
      changed = true;
      retagged++;
    }
  }

  if (changed) fs.writeFileSync(fp, JSON.stringify(items));
}

console.log('Retagged', retagged, 'posts');

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
console.log('\nTag distribution:');
Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).forEach(([tag, count]) => {
  console.log('  ' + tag + ': ' + count.toLocaleString());
});

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

// Check some specific posts
const slugIndex = JSON.parse(fs.readFileSync(path.join(dataDir, 'slug-index.json'), 'utf8'));
const checks = ['building-dividend-portfolios-e4190d111b7ef116', 'wednesday', '1-best-appsumo-deal-in-4-days-expires-in-5-hours'];
console.log('\nSpot checks:');
for (const slug of checks) {
  const page = slugIndex[slug];
  if (!page) continue;
  const items = JSON.parse(fs.readFileSync(path.join(dataDir, 'page-' + String(page).padStart(4, '0') + '.json'), 'utf8'));
  const post = items.find(i => i.id === slug);
  if (post) {
    console.log('  ' + slug.substring(0, 50));
    console.log('    Advertisers: ' + (post.advertisers || []).map(a => a.name).join(', '));
    console.log('    Tags: ' + (post.tags || []).join(', '));
  }
}
