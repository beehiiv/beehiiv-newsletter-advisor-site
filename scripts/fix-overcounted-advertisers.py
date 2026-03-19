#!/usr/bin/env python3
"""
Fix items with >3 advertisers by re-extracting from actual email HTML.
The overcounting was caused by fetch-missing-posts.py grouping by slug
instead of post ID, merging advertisers from different publications.
"""

import json
import glob
import os
import re

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPTS_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, "public", "data")
EMAILS_DIR = os.path.join(PROJECT_ROOT, "public", "emails")

# Load advertiser lookup (opp_id -> advertiser info)
lookup_path = os.path.join(SCRIPTS_DIR, "advertiser-lookup.json")
ADVERTISER_LOOKUP = json.load(open(lookup_path))
print(f"Loaded {len(ADVERTISER_LOOKUP)} advertiser lookup entries")

# Load advertiser tags
adv_tags_path = os.path.join(SCRIPTS_DIR, "advertiser-tags.json")
ADVERTISER_TAGS = json.load(open(adv_tags_path))

BHIIV_OPP_RE = re.compile(r'_bhiiv=opp_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})')

def extract_advertisers_from_html(html_path):
    """Extract real advertisers from email HTML using _bhiiv= opportunity IDs.
    Skips beehiiv Boost cross-promotions (links through magic.beehiiv.com)."""
    html = open(html_path, encoding="utf-8", errors="ignore").read()

    if '_bhiiv=' not in html:
        return None  # No ads in HTML, can't determine

    # Find all opp IDs, but skip ones that only appear in magic.beehiiv.com links (Boosts)
    # First, collect which opp IDs appear in Boost links vs direct ad links
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

    advertisers = []
    seen_names = set()

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
        advertisers.append(adv)

    return advertisers


def main():
    page_files = sorted(glob.glob(os.path.join(DATA_DIR, "page-*.json")))
    print(f"Scanning {len(page_files)} page files...")

    fixed = 0
    unfixable = 0
    pages_modified = set()

    for page_path in page_files:
        data = json.load(open(page_path))
        modified = False

        for item in data:
            advs = item.get('advertisers', [])
            if len(advs) <= 3:
                continue

            # This item has too many advertisers — re-extract from HTML
            html_path = os.path.join(EMAILS_DIR, f"{item['id']}.html")
            if not os.path.exists(html_path):
                unfixable += 1
                continue

            new_advs = extract_advertisers_from_html(html_path)
            if new_advs is None:
                # No _bhiiv= in HTML, can't determine — keep as-is but cap at 3
                item['advertisers'] = advs[:3]
                modified = True
                fixed += 1
                print(f"  CAPPED {item['id']}: {len(advs)} -> {len(item['advertisers'])} (no _bhiiv in HTML)")
                continue

            old_names = [a['name'] for a in advs]
            new_names = [a['name'] for a in new_advs]
            item['advertisers'] = new_advs
            modified = True
            fixed += 1
            print(f"  FIXED {item['id']}: {len(advs)} -> {len(new_advs)} advertisers ({old_names} -> {new_names})")

        if modified:
            with open(page_path, 'w') as f:
                json.dump(data, f, separators=(',', ':'))
            pages_modified.add(page_path)

    print(f"\nDone! Fixed {fixed} items across {len(pages_modified)} page files")
    if unfixable:
        print(f"  {unfixable} items couldn't be fixed (no HTML file)")

    # Rebuild advertiser-details.json and advertisers.json since counts changed
    if fixed > 0:
        print("\nRebuilding advertiser stats...")
        advertiser_counts = {}
        advertiser_details = {}

        for page_path in page_files:
            data = json.load(open(page_path))
            for item in data:
                for adv in item.get('advertisers', []):
                    name = adv['name']
                    advertiser_counts[name] = advertiser_counts.get(name, 0) + 1
                    if name in advertiser_details:
                        entry = advertiser_details[name]
                        entry['count'] += 1
                        d = item.get('date', '')
                        if d and d > entry.get('latestDate', ''):
                            entry['latestDate'] = d
                    else:
                        advertiser_details[name] = {
                            'name': name,
                            'count': 1,
                            'logoUrl': adv.get('logo', ''),
                            'url': adv.get('url', ''),
                            'tags': ADVERTISER_TAGS.get(name, []),
                            'latestDate': item.get('date', ''),
                        }

        # Write advertiser counts
        sorted_advs = dict(sorted(advertiser_counts.items(), key=lambda x: x[1], reverse=True))
        with open(os.path.join(DATA_DIR, 'advertisers.json'), 'w') as f:
            json.dump(sorted_advs, f, separators=(',', ':'))

        # Write advertiser details
        adv_detail_list = sorted(advertiser_details.values(), key=lambda x: -x['count'])
        for entry in adv_detail_list:
            entry['tags'] = sorted(entry['tags'])
        with open(os.path.join(DATA_DIR, 'advertiser-details.json'), 'w') as f:
            json.dump(adv_detail_list, f, separators=(',', ':'))

        print(f"Updated advertiser stats: {len(advertiser_details)} advertisers")


if __name__ == '__main__':
    main()
