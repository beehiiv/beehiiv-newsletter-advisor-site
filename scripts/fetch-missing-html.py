#!/usr/bin/env python3
"""
Fetch missing email HTML from Metabase render_caches table.
Only fetches for posts that have htmlFile set but no actual file on disk,
plus posts that have no htmlFile at all but have ad placements.
"""

import json
import glob
import os
import re
import requests
import time

SESSION = "c1d959f2-5e24-41c8-be07-4e3c65d54c4e"
METABASE_URL = "https://beehiiv.metabaseapp.com/api/dataset"
HEADERS = {"Content-Type": "application/json", "X-Metabase-Session": SESSION}
DB = 2
EMAILS_DIR = "public/emails"
DATA_DIR = "public/data"
BATCH_SIZE = 50  # render_caches HTML is large, small batches

def query_metabase(sql, timeout=300):
    resp = requests.post(METABASE_URL, headers=HEADERS, json={
        "database": DB, "type": "native", "native": {"query": sql}
    }, timeout=timeout)
    data = resp.json()
    if "data" not in data:
        print(f"Error: {str(data)[:200]}")
        return []
    return data["data"]["rows"]

def clean_html(html):
    # Strip scripts
    html = re.sub(r'<script\b[^<]*(?:(?!</script>)<[^<]*)*</script>', '', html, flags=re.IGNORECASE)
    # Strip template placeholders
    html = re.sub(r'\{\{[A-Z_]+\}\}', '', html)
    return html

def main():
    # Find all slugs that need HTML
    existing_files = set(f[:-5] for f in os.listdir(EMAILS_DIR) if f.endswith('.html'))
    print(f"Existing HTML files: {len(existing_files)}")

    needs_html = []  # slugs that need fetching
    for f in sorted(glob.glob(f'{DATA_DIR}/page-*.json')):
        items = json.load(open(f))
        for item in items:
            slug = item['id']
            if slug not in existing_files:
                needs_html.append(slug)

    print(f"Posts needing HTML: {len(needs_html)}")

    # Process in batches using cursor-based pagination on slug
    fetched = 0
    not_found = 0
    cursor = ''

    while True:
        # Get batch of slugs + HTML from render_caches
        # Use web platform for full rendered HTML
        sql = f"""SELECT p.slug, rc.html
FROM render_caches rc
JOIN posts p ON p.id = rc.renderable_id
WHERE rc.renderable_type = 'Post'
AND rc.platform = 'web'
AND p.slug > '{cursor}'
ORDER BY p.slug
LIMIT {BATCH_SIZE}"""

        try:
            rows = query_metabase(sql, timeout=600)
        except Exception as e:
            print(f"Error at cursor '{cursor}': {e}")
            time.sleep(5)
            continue

        if not rows:
            break

        for slug, html in rows:
            cursor = slug
            if slug in existing_files:
                continue  # already have it
            if html:
                cleaned = clean_html(html)
                filepath = os.path.join(EMAILS_DIR, f"{slug}.html")
                with open(filepath, 'w', encoding='utf-8') as fh:
                    fh.write(cleaned)
                existing_files.add(slug)
                fetched += 1
            else:
                not_found += 1

        print(f"Progress: fetched={fetched}, skipped_no_html={not_found}, cursor='{cursor[:40]}'")

        if len(rows) < BATCH_SIZE:
            break

    print(f"\nDone! Fetched {fetched} HTML files. {not_found} had no HTML.")

    # Now update page JSON to add htmlFile for posts that now have files
    print("\nUpdating page JSON data...")
    updated_count = 0
    for f in sorted(glob.glob(f'{DATA_DIR}/page-*.json')):
        items = json.load(open(f))
        changed = False
        for item in items:
            slug = item['id']
            if not item.get('htmlFile') and slug in existing_files:
                item['htmlFile'] = f"/emails/{slug}.html"
                changed = True
                updated_count += 1
        if changed:
            with open(f, 'w') as fh:
                json.dump(items, fh)

    print(f"Updated {updated_count} items with htmlFile paths.")

if __name__ == '__main__':
    main()
