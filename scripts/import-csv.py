#!/usr/bin/env python3
"""
Import newsletter posts from goodads_posts.csv into very-good-ads.
Extracts HTML files, metadata, and generates paginated JSON.
"""

import csv
import sys
import os
import re
import json
import math
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote

csv.field_size_limit(sys.maxsize)

# Config
CSV_PATH = os.path.expanduser('~/Downloads/goodads_posts.csv')
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))

# Load advertiser-to-tags mapping
ADVERTISER_TAGS = {}
advertiser_tags_path = os.path.join(SCRIPTS_DIR, 'advertiser-tags.json')
if os.path.exists(advertiser_tags_path):
    with open(advertiser_tags_path) as f:
        ADVERTISER_TAGS = json.load(f)
EMAILS_DIR = os.path.join(PROJECT_ROOT, 'public', 'emails')
DATA_DIR = os.path.join(PROJECT_ROOT, 'public', 'data')
PAGE_SIZE = 500

# Curated product IDs to skip (avoid overwriting)
CURATED_IDS = {
    'feb-23rd-pre-market', 'google-photoshoot-pomelli', 'beyond-tech-weekend-upgrade',
    'busybits-220-weight-loss', 'where-self-love-begins', 'best-chatgpt-prompt-frameworks-2026',
    'prompt-make-a-movie', 'weekend-rip-jan-25', 'cancer-isnt-just-genetic',
    'microns-200b-move-ai-infrastructure', 'use-chatgpt-free-speaking-coach',
    'chatgpt-can-now-use-adobe-apps', 'never-bet-against-korean-fried-chicken',
    'mrbeast-puzzle-1-million-super-bowl', 'defining-your-category',
    'make-1k-daily-income-canva', 'peptides-breakthrough-or-overhyped',
    'hotel-breakfasts-disappearing', 'catching-up-with-costco97',
    'costco-january-2026-coupon-book', 'verse-of-the-day-proverbs-11-25',
    'stocks-sharp-rebound-more-nervous', 'openai-loses-ground-enterprise-ai',
    'design-deploy-deliver-in-minutes', 'texas-app-store-injunction',
    'daily-dose-of-knowledge-625', 'google-launch-first-ai-glasses',
    'googles-eagle-pixel-iq', 'ai-reduces-doctor-workload',
    'grok-triggers-global-deepfake-backlash', 'one-app-ai-phone',
    'hollywood-to-ai-hands-off', 'robot-parks-your-car',
    'ai-logistics-us-tech-expansion', 'us-captures-dark-fleet-tanker',
    'us-strikes-houthis-global-shipping', 'faang-engineer-party-is-over',
    'how-to-keep-your-mouth-shut', 'openai-fix-for-ai-hallucinations',
    'claude-new-framework-for-coding', 'apple-most-boring-move-smartest',
    'talk-to-google-photos-edits', 'reverse-dieting-what-it-does',
    'giants-shrink-tax-bills', 'zuckerberg-caught-illegally-pirating',
    'moms-at-the-door-ai-knows-it', 'curve-a-licious-iphone',
    'nano-banana-pro-best-ai-image-model', 'nvidia-is-rewriting-the-rules',
    'money-habits-parents-5-minutes', 'bitcoin-always-follows',
    'delusional-crypto-nutshell', 'stock-market-waiting-fed-decision',
    'gold-etfs-double-money-2026', 'dot-marker-alphabet-winter-olympics',
}


class TextExtractor(HTMLParser):
    """Extract plain text from HTML, skipping script/style tags."""
    def __init__(self):
        super().__init__()
        self.text = []
        self._skip = False

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'head'):
            self._skip = True

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'head'):
            self._skip = False

    def handle_data(self, data):
        if not self._skip:
            stripped = data.strip()
            if stripped:
                self.text.append(stripped)


def extract_text(html, max_len=200):
    """Extract first max_len chars of plain text from HTML."""
    parser = TextExtractor()
    try:
        parser.feed(html)
    except Exception:
        pass
    full = ' '.join(parser.text)
    if len(full) > max_len:
        return full[:max_len].rsplit(' ', 1)[0] + '...'
    return full


BEEHIIV_SKIP_SUBDOMAINS = {'media', 'www', 'links', 'api', 'flight', 'link', 'app', 'static', 'cdn'}

READ_ONLINE_RE = re.compile(
    r'href="([^"]*)"[^>]*>\s*(?:<[^>]*>)*\s*Read[_ \xa0]*Online',
    re.IGNORECASE | re.DOTALL
)

def _extract_publisher_name_from_html(html):
    """Try to extract a proper publisher name from HTML patterns."""
    # 1. "You're reading X by Y" or "You're reading X"
    reading_match = re.search(
        r"You(?:&#x27;|'|&#8217;|\xe2\x80\x99)?re\s+reading\s+(.+?)(?:\s+by\s+.+?)?\s*[.<]",
        html, re.IGNORECASE
    )
    if reading_match:
        name = re.sub(r'<[^>]+>', '', reading_match.group(1)).strip()
        if 3 <= len(name) <= 80:
            return name

    # 2. Logo alt text (often has the newsletter name)
    logo_alts = re.findall(r'<img[^>]*alt="([^"]+)"[^>]*>', html[:5000])
    for alt in logo_alts:
        alt = alt.strip()
        # Skip generic alts
        if alt.lower() in ('logo', 'image', 'banner', 'header', 'icon', ''):
            continue
        if 3 <= len(alt) <= 60:
            return alt

    # 3. Copyright line: © 2026 The AI Report
    copy_match = re.search(r'©\s*\d{4}\s+(.+?)(?:\s*[.<|]|$)', html)
    if copy_match:
        name = re.sub(r'<[^>]+>', '', copy_match.group(1)).strip().rstrip('.')
        if 3 <= len(name) <= 80 and 'all rights' not in name.lower():
            return name

    return None


def extract_publisher(html):
    """Extract publisher name and URL from HTML content."""
    # Get URL from Read Online link
    pub_url = None
    pub_host = None
    ro_match = READ_ONLINE_RE.search(html)
    if ro_match:
        url = ro_match.group(1).split('?')[0]  # Strip UTM params
        try:
            parsed = urlparse(url)
            host = (parsed.hostname or '').replace('www.', '')
            if host:
                pub_url = url
                pub_host = host
        except Exception:
            pass

    # Fallback URL: beehiiv subdomain
    if not pub_host:
        matches = re.findall(r'https?://([a-zA-Z0-9_-]+)\.beehiiv\.com', html)
        for subdomain in matches:
            if subdomain.lower() in BEEHIIV_SKIP_SUBDOMAINS:
                continue
            pub_host = f'{subdomain}.beehiiv.com'
            pub_url = f'https://{subdomain}.beehiiv.com'
            break

    if not pub_host:
        return None

    # Try to extract a proper name from HTML content
    name = _extract_publisher_name_from_html(html)

    # Fallback: derive name from domain
    if not name:
        if pub_host.endswith('.beehiiv.com'):
            subdomain = pub_host.replace('.beehiiv.com', '')
            if subdomain in BEEHIIV_SKIP_SUBDOMAINS:
                return None
            name = subdomain.replace('-', ' ').replace('_', ' ').title()
        else:
            parts = pub_host.split('.')
            main = parts[-2] if len(parts) >= 2 else parts[0]
            name = main.replace('-', ' ').replace('_', ' ').title()

    # Build clean publisher URL
    if pub_host.endswith('.beehiiv.com'):
        subdomain = pub_host.replace('.beehiiv.com', '')
        clean_url = f'https://{subdomain}.beehiiv.com'
    else:
        clean_url = f'https://{pub_host}'

    return {'name': name, 'url': clean_url}


def extract_bg_color(html):
    """Extract background color from body tag."""
    match = re.search(r'<body[^>]*style="[^"]*background(?:-color)?:\s*([#\w]+)', html, re.IGNORECASE)
    if match:
        return match.group(1)
    return None


def count_external_links(html):
    """Count links to non-beehiiv external domains as ad signal."""
    links = re.findall(r'href="(https?://[^"]+)"', html)
    external = 0
    for link in links:
        try:
            domain = urlparse(link).hostname or ''
            if domain and 'beehiiv.com' not in domain and 'media.beehiiv.com' not in domain:
                external += 1
        except Exception:
            pass
    return external



# Load opportunity-to-advertiser lookup from Metabase export
ADVERTISER_LOOKUP = {}
_lookup_path = os.path.join(SCRIPTS_DIR, 'advertiser-lookup.json')
if os.path.exists(_lookup_path):
    with open(_lookup_path) as f:
        ADVERTISER_LOOKUP = json.load(f)
    print(f"Loaded {len(ADVERTISER_LOOKUP)} opportunity-to-advertiser mappings")

# Regex to extract opportunity UUID from _bhiiv=opp_UUID_HASH
BHIIV_OPP_RE = re.compile(r'_bhiiv=opp_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})')


def extract_advertisers(html, publisher=None):
    """Extract advertiser names from _bhiiv= opportunity IDs using Metabase lookup.
    Skips beehiiv Boost cross-promotions (links through magic.beehiiv.com)."""
    advertisers = []
    seen_names = set()

    if '_bhiiv=' not in html:
        return advertisers

    # Separate real ad links from Boost cross-promotions (magic.beehiiv.com)
    boost_opps = set()
    direct_opps = set()
    for m in re.finditer(r'href="(https?://[^"]*_bhiiv=opp_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[^"]*)"', html):
        link, opp_id = m.group(1), m.group(2)
        if 'magic.beehiiv.com' in link:
            boost_opps.add(opp_id)
        else:
            direct_opps.add(opp_id)

    # Only use opp IDs from direct links (real ads), not Boosts
    real_opp_ids = direct_opps - boost_opps

    for opp_id in real_opp_ids:
        adv_info = ADVERTISER_LOOKUP.get(opp_id)
        if not adv_info:
            continue
        name = adv_info['name']
        if name in seen_names:
            continue
        seen_names.add(name)

        adv = {'name': name}
        if adv_info.get('url'):
            adv['url'] = adv_info['url']
        if adv_info.get('logo'):
            adv['logo'] = adv_info['logo']

        # Also try to find the beehiiv ad network logo from HTML
        if not adv.get('logo'):
            bhiiv_links = re.findall(r'href="(https?://[^"]*_bhiiv=opp_' + re.escape(opp_id) + r'[^"]*)"', html)
            for link in bhiiv_links:
                link_pos = html.find(link)
                if link_pos > 0:
                    nearby = html[max(0, link_pos - 2000):link_pos + 2000]
                    logo_match = re.search(
                        r'(https://beehiiv-images-production[^"]*ad_network/advertiser/logo/[^"]+)', nearby
                    )
                    if logo_match:
                        adv['logo'] = logo_match.group(1)
                        break

        advertisers.append(adv)

    return advertisers


def process_csv():
    os.makedirs(EMAILS_DIR, exist_ok=True)
    os.makedirs(DATA_DIR, exist_ok=True)

    products = []
    seen_slugs = set()
    publisher_counts = {}
    advertiser_counts = {}
    advertiser_details = {}  # name -> {name, count, logoUrl, url, tags: set, latestDate}
    skipped_curated = 0
    skipped_dupe = 0
    skipped_no_ads = 0
    total = 0

    print(f"Reading CSV from {CSV_PATH}...", flush=True)

    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        # Columns: id, web_title, email_subject_line, slug, send_completed_at, html

        for row in reader:
            total += 1
            if total % 10000 == 0:
                print(f"  Processed {total} rows...", flush=True)

            if len(row) < 6:
                continue

            csv_id, web_title, subject, slug, sent_at, html = row[0], row[1], row[2], row[3], row[4], row[5]

            if not slug or not html:
                continue

            # Skip curated entries
            if slug in CURATED_IDS:
                skipped_curated += 1
                continue

            # Skip duplicate slugs
            if slug in seen_slugs:
                skipped_dupe += 1
                continue
            seen_slugs.add(slug)

            # Write HTML file
            html_path = os.path.join(EMAILS_DIR, f'{slug}.html')
            if not os.path.exists(html_path):
                with open(html_path, 'w', encoding='utf-8') as hf:
                    hf.write(html)

            # Extract metadata
            title = subject if subject else web_title
            if not title:
                title = slug.replace('-', ' ').title()

            date = ''
            if sent_at:
                date = sent_at[:10]  # YYYY-MM-DD

            # Only include posts that have beehiiv ad network placements
            if '_bhiiv=' not in html:
                skipped_no_ads += 1
                continue

            description = extract_text(html, 200)
            publisher = extract_publisher(html)
            bg_color = extract_bg_color(html)
            ext_links = count_external_links(html)
            advertisers = extract_advertisers(html, publisher=publisher)

            author = publisher['name'] if publisher else ''

            # Get URL from Read Online link or reconstruct from publisher
            url = ''
            ro_match = READ_ONLINE_RE.search(html)
            if ro_match:
                url = ro_match.group(1).split('?')[0]
            elif publisher:
                url = f'{publisher["url"]}/p/{slug}'

            product = {
                'id': slug,
                'title': title,
                'category': 'Newsletter Ads',
                'description': description,
                'author': author,
                'date': date,
                'htmlFile': f'/emails/{slug}.html',
                'hasAds': True,
            }

            if url:
                product['url'] = url
            if publisher:
                product['publisher'] = publisher
            if bg_color:
                product['bgColor'] = bg_color
            if advertisers:
                product['advertisers'] = advertisers
            # Apply tags from advertiser mapping
            tags = set()
            for adv in advertisers:
                for t in ADVERTISER_TAGS.get(adv['name'], []):
                    tags.add(t)
            if tags:
                product['tags'] = sorted(tags)

            products.append(product)

            # Track publisher counts
            if publisher:
                pub_name = publisher['name']
                publisher_counts[pub_name] = publisher_counts.get(pub_name, 0) + 1

            # Track advertiser counts and details
            for adv in advertisers:
                adv_name = adv['name']
                advertiser_counts[adv_name] = advertiser_counts.get(adv_name, 0) + 1
                if adv_name in advertiser_details:
                    entry = advertiser_details[adv_name]
                    entry['count'] += 1
                    if date and date > entry.get('latestDate', ''):
                        entry['latestDate'] = date
                else:
                    advertiser_details[adv_name] = {
                        'name': adv_name,
                        'count': 1,
                        'logoUrl': adv.get('logo', ''),
                        'url': adv.get('url', ''),
                        'tags': ADVERTISER_TAGS.get(adv_name, []),
                        'latestDate': date,
                    }

    print(f"\nDone reading CSV.")
    print(f"  Total rows: {total}")
    print(f"  Skipped (curated): {skipped_curated}")
    print(f"  Skipped (duplicate): {skipped_dupe}")
    print(f"  Skipped (no ads): {skipped_no_ads}")
    print(f"  Products to import: {len(products)}")
    print(f"  Unique publishers: {len(publisher_counts)}")

    # Sort by date descending
    products.sort(key=lambda p: p.get('date', ''), reverse=True)

    # Count ads vs no-ads
    with_ads = sum(1 for p in products if p.get('hasAds'))
    without_ads = len(products) - with_ads
    with_advertisers = sum(1 for p in products if p.get('advertisers'))
    print(f"  With ads (2+ ext links): {with_ads}")
    print(f"  With extracted advertisers: {with_advertisers}")
    print(f"  Unique advertisers: {len(advertiser_counts)}")
    print(f"  Possibly no ads: {without_ads}")

    # Write paginated JSON
    num_pages = math.ceil(len(products) / PAGE_SIZE)
    print(f"\nWriting {num_pages} page files to {DATA_DIR}...")

    # Build slug -> page index for lookups
    slug_index = {}

    for i in range(num_pages):
        start = i * PAGE_SIZE
        end = start + PAGE_SIZE
        page_items = products[start:end]
        page_num = i + 1

        for item in page_items:
            slug_index[item['id']] = page_num

        page_file = os.path.join(DATA_DIR, f'page-{page_num:04d}.json')
        with open(page_file, 'w', encoding='utf-8') as pf:
            json.dump(page_items, pf, separators=(',', ':'))

    # Write manifest
    manifest = {
        'total': len(products),
        'pageSize': PAGE_SIZE,
        'pages': num_pages,
    }
    with open(os.path.join(DATA_DIR, 'manifest.json'), 'w') as mf:
        json.dump(manifest, mf, separators=(',', ':'))

    # Write publisher counts
    sorted_pubs = dict(sorted(publisher_counts.items(), key=lambda x: x[1], reverse=True))
    with open(os.path.join(DATA_DIR, 'publishers.json'), 'w') as pf:
        json.dump(sorted_pubs, pf, separators=(',', ':'))

    # Write slug index (slug -> page number) for fast lookups
    with open(os.path.join(DATA_DIR, 'slug-index.json'), 'w') as sf:
        json.dump(slug_index, sf, separators=(',', ':'))

    # Write advertiser counts
    sorted_advs = dict(sorted(advertiser_counts.items(), key=lambda x: x[1], reverse=True))
    with open(os.path.join(DATA_DIR, 'advertisers.json'), 'w') as af:
        json.dump(sorted_advs, af, separators=(',', ':'))

    # Write advertiser details (rich data for Advertisers listing page)
    adv_detail_list = sorted(advertiser_details.values(), key=lambda x: -x['count'])
    for entry in adv_detail_list:
        entry['tags'] = sorted(entry['tags'])
    with open(os.path.join(DATA_DIR, 'advertiser-details.json'), 'w') as af:
        json.dump(adv_detail_list, af, separators=(',', ':'))

    print(f"  Manifest: {DATA_DIR}/manifest.json")
    print(f"  Publishers: {DATA_DIR}/publishers.json")
    print(f"  Advertisers: {DATA_DIR}/advertisers.json")
    print(f"  Slug index: {DATA_DIR}/slug-index.json")
    print(f"  Top 20 advertisers:")
    for name, count in list(sorted_advs.items())[:20]:
        print(f"    {name}: {count}")
    print(f"\nDone! {len(products)} products imported.")


if __name__ == '__main__':
    process_csv()
