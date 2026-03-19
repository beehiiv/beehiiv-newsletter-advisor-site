#!/usr/bin/env python3
"""
Build advertiser-details.json from existing paginated data.
Scans all page files to aggregate advertiser info (name, count, logo, URL, tags, latestDate).
"""
import json
import os
import glob

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'data')

# Also include curated products from data.ts
# We'll just scan all page JSON files since curated items aren't in those

def main():
    advertisers = {}  # name -> {name, count, logoUrl, url, tags: set, latestDate}

    page_files = sorted(glob.glob(os.path.join(DATA_DIR, 'page-*.json')))
    print(f"Scanning {len(page_files)} page files...")

    for i, pf in enumerate(page_files):
        with open(pf, 'r', encoding='utf-8') as f:
            items = json.load(f)

        for item in items:
            for adv in item.get('advertisers', []):
                name = adv.get('name', '')
                if not name:
                    continue

                if name in advertisers:
                    entry = advertisers[name]
                    entry['count'] += 1
                    date = item.get('date', '')
                    if date and date > entry['latestDate']:
                        entry['latestDate'] = date
                    for tag in item.get('tags', []):
                        entry['tags'].add(tag)
                else:
                    logo_url = adv.get('logo', '')
                    url = adv.get('url', '')
                    advertisers[name] = {
                        'name': name,
                        'count': 1,
                        'logoUrl': logo_url,
                        'url': url,
                        'tags': set(item.get('tags', [])),
                        'latestDate': item.get('date', ''),
                    }

        if (i + 1) % 50 == 0:
            print(f"  Processed {i + 1}/{len(page_files)} pages, {len(advertisers)} unique advertisers so far")

    # Convert sets to sorted lists for JSON serialization
    result = []
    for adv in advertisers.values():
        adv['tags'] = sorted(adv['tags'])
        result.append(adv)

    # Sort by count descending
    result.sort(key=lambda x: -x['count'])

    out_path = os.path.join(DATA_DIR, 'advertiser-details.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, separators=(',', ':'))

    print(f"\nDone! {len(result)} advertisers written to {out_path}")
    print(f"Top 20:")
    for adv in result[:20]:
        print(f"  {adv['name']}: {adv['count']} ads")


if __name__ == '__main__':
    main()
