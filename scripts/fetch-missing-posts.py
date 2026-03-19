#!/usr/bin/env python3
"""
Fetch posts with ad placements from Metabase that aren't already imported.
Pulls metadata + advertiser info directly from DB tables (no render_caches needed).
Uses cursor-based pagination to handle Metabase's 2000 row limit.
"""

import requests
import json
import os
import math
import warnings
import sys
import time
from collections import defaultdict

warnings.filterwarnings("ignore")

METABASE_BASE = "https://beehiiv.metabaseapp.com"
METABASE_URL = f"{METABASE_BASE}/api/dataset"
DATABASE_ID = 2


def get_session_token():
    """Authenticate with Metabase and return a fresh session token."""
    email = os.environ.get("METABASE_EMAIL")
    password = os.environ.get("METABASE_PASSWORD")
    if not email or not password:
        raise RuntimeError(
            "METABASE_EMAIL and METABASE_PASSWORD environment variables are required"
        )
    resp = requests.post(
        f"{METABASE_BASE}/api/session",
        json={"username": email, "password": password},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["id"]


SESSION_TOKEN = get_session_token()
HEADERS = {"Content-Type": "application/json", "X-Metabase-Session": SESSION_TOKEN}

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(PROJECT_ROOT, "public", "data")
EMAILS_DIR = os.path.join(PROJECT_ROOT, "public", "emails")
PAGE_SIZE = 500

# Load advertiser tags
ADVERTISER_TAGS = {}
advertiser_tags_path = os.path.join(SCRIPTS_DIR, 'advertiser-tags.json')
if os.path.exists(advertiser_tags_path):
    with open(advertiser_tags_path) as f:
        ADVERTISER_TAGS = json.load(f)

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


def run_query(sql, timeout=600, retries=3):
    for attempt in range(retries):
        try:
            payload = {"database": DATABASE_ID, "type": "native", "native": {"query": sql, "template-tags": {}}}
            resp = requests.post(METABASE_URL, json=payload, headers=HEADERS, timeout=timeout)
            resp.raise_for_status()
            return resp.json()
        except (requests.exceptions.ReadTimeout, requests.exceptions.ConnectionError) as e:
            if attempt < retries - 1:
                wait = 10 * (attempt + 1)
                print(f"  Timeout/error, retrying in {wait}s... ({e.__class__.__name__})")
                time.sleep(wait)
            else:
                raise


def main():
    os.makedirs(DATA_DIR, exist_ok=True)

    # Load existing slugs and products
    existing_slugs = set()
    all_products = []
    manifest_path = os.path.join(DATA_DIR, "manifest.json")
    if os.path.exists(manifest_path):
        manifest = json.load(open(manifest_path))
        for i in range(1, manifest["pages"] + 1):
            page_path = os.path.join(DATA_DIR, f"page-{i:04d}.json")
            if os.path.exists(page_path):
                page = json.load(open(page_path))
                all_products.extend(page)
                for item in page:
                    existing_slugs.add(item["id"])
    print(f"Existing posts: {len(existing_slugs)}")

    # Step 1: Fetch all posts with ad placements + publisher + advertiser info
    # Each row = one post-advertiser pair (posts with multiple advertisers appear multiple times)
    # We group by post ID (not slug!) since slugs are NOT unique across publications
    print("\nFetching posts with ads from Metabase...")

    posts_by_id = defaultdict(lambda: {
        "slug": None, "title": None, "date": None, "publisher_name": None,
        "subdomain": None, "hostname": None, "advertisers": []
    })

    last_key = ""  # cursor: "post_id|advertiser_name"
    batch_num = 0
    total_rows = 0

    while True:
        batch_num += 1
        escaped_key = last_key.replace("'", "''")

        print(f"Batch {batch_num}: cursor after '{last_key[:60]}'...", end=" ", flush=True)

        try:
            result = run_query(f"""
                SELECT
                    p.id as post_id,
                    p.slug,
                    COALESCE(p.email_subject_line, p.web_title) as title,
                    p.send_completed_at::text as sent_at,
                    pub.name as publisher_name,
                    rl.subdomain,
                    rl.hostname,
                    a.name as adv_name,
                    a.url as adv_url,
                    a.logo as adv_logo
                FROM posts p
                JOIN publications pub ON pub.id = p.publication_id
                JOIN resource_locators rl ON rl.resource_locatable_id = pub.id
                    AND rl.resource_locatable_type = 'Publication' AND rl.deleted_at IS NULL
                JOIN ad_network_placements ap ON ap.post_id = p.id AND ap.deleted_at IS NULL
                JOIN ad_network_opportunities o ON o.id = ap.opportunity_id AND o.deleted_at IS NULL
                JOIN ad_network_campaigns c ON c.id = o.campaign_id
                JOIN ad_network_advertisers a ON a.id = c.advertiser_id AND a.deleted_at IS NULL
                WHERE p.deleted_at IS NULL AND p.status = 'confirmed'
                AND p.slug IS NOT NULL AND p.slug != ''
                AND p.platform IN (0, 2)
                AND p.audience = 0
                AND (p.email_capture_type_override IS NULL OR p.email_capture_type_override != 1)
                AND (p.id || '|' || a.name) > '{escaped_key}'
                ORDER BY p.id, a.name
                LIMIT 2000
            """, timeout=600)
        except Exception as e:
            print(f"\n  ERROR: {e}")
            print(f"  Stopping at cursor: {last_key}")
            break

        rows = result["data"]["rows"]
        if not rows:
            print("done.")
            break

        total_rows += len(rows)

        for row in rows:
            post_id, slug, title, sent_at, pub_name, subdomain, hostname, adv_name, adv_url, adv_logo = row

            entry = posts_by_id[post_id]
            if entry["slug"] is None:
                entry["slug"] = slug
                entry["title"] = title
                entry["date"] = sent_at[:10] if sent_at else ""
                entry["publisher_name"] = pub_name
                entry["subdomain"] = subdomain
                entry["hostname"] = hostname

            # Add advertiser (deduplicate by name within this specific post)
            adv_names_seen = {a["name"] for a in entry["advertisers"]}
            if adv_name and adv_name not in adv_names_seen:
                adv = {"name": adv_name}
                if adv_url:
                    adv["url"] = adv_url
                if adv_logo:
                    adv["logo"] = adv_logo
                entry["advertisers"].append(adv)

        last_key = f"{rows[-1][0]}|{rows[-1][7]}"
        print(f"got {len(rows)} rows, unique posts so far: {len(posts_by_id)}")
        sys.stdout.flush()

    # Convert from post_id-keyed to slug-keyed (pick the post with the most recent date per slug)
    posts_data = {}
    slug_conflicts = 0
    for post_id, entry in posts_by_id.items():
        slug = entry["slug"]
        if slug in posts_data:
            # Same slug from different publications — keep the one with more recent date
            existing = posts_data[slug]
            if (entry["date"] or "") > (existing["date"] or ""):
                posts_data[slug] = entry
            slug_conflicts += 1
        else:
            posts_data[slug] = entry
    if slug_conflicts:
        print(f"  Resolved {slug_conflicts} slug conflicts (duplicate slugs across publications)")

    print(f"\nTotal rows fetched: {total_rows}")
    print(f"Unique slugs from Metabase: {len(posts_data)}")

    # Step 2: Filter to only new posts
    new_products = []
    skipped_existing = 0
    skipped_curated = 0
    skipped_no_adv = 0

    for slug, data in posts_data.items():
        if slug in existing_slugs:
            skipped_existing += 1
            continue
        if slug in CURATED_IDS:
            skipped_curated += 1
            continue
        if not data["advertisers"]:
            skipped_no_adv += 1
            continue

        # Construct URL
        hostname = data["hostname"] or ""
        subdomain = data["subdomain"] or ""
        if hostname and not hostname.endswith(".beehiiv.com"):
            url = f"https://{hostname}/p/{slug}"
            pub_url = f"https://{hostname}"
        elif subdomain:
            url = f"https://{subdomain}.beehiiv.com/p/{slug}"
            pub_url = f"https://{subdomain}.beehiiv.com"
        else:
            url = ""
            pub_url = ""

        publisher = None
        if data["publisher_name"]:
            publisher = {"name": data["publisher_name"], "url": pub_url}

        author = data["publisher_name"] or ""

        product = {
            "id": slug,
            "title": data["title"] or slug.replace("-", " ").title(),
            "category": "Newsletter Ads",
            "description": "",
            "author": author,
            "date": data["date"],
            "hasAds": True,
        }

        if url:
            product["url"] = url
        if publisher:
            product["publisher"] = publisher

        # Check for existing HTML file
        html_path = os.path.join(EMAILS_DIR, f"{slug}.html")
        if os.path.exists(html_path):
            product["htmlFile"] = f"/emails/{slug}.html"

        if data["advertisers"]:
            product["advertisers"] = data["advertisers"]

        # Tags come from advertisers, not publishers
        tags = set()
        for adv in data["advertisers"]:
            for t in ADVERTISER_TAGS.get(adv["name"], []):
                tags.add(t)
        if tags:
            product["tags"] = sorted(tags)

        new_products.append(product)

    print(f"\n{'='*60}")
    print(f"RESULTS")
    print(f"{'='*60}")
    print(f"Skipped (already exists): {skipped_existing}")
    print(f"Skipped (curated): {skipped_curated}")
    print(f"Skipped (no advertisers): {skipped_no_adv}")
    print(f"New products to add: {len(new_products)}")

    if not new_products:
        print("Nothing new to add!")
        return

    # Merge with existing and re-sort
    all_products.extend(new_products)
    all_products.sort(key=lambda p: p.get("date", ""), reverse=True)
    print(f"\nTotal products after merge: {len(all_products)}")

    # Re-write paginated JSON
    num_pages = math.ceil(len(all_products) / PAGE_SIZE)
    print(f"Writing {num_pages} page files...")

    slug_index = {}
    publisher_counts = {}
    advertiser_counts = {}
    advertiser_details = {}

    for i in range(num_pages):
        start = i * PAGE_SIZE
        end = start + PAGE_SIZE
        page_items = all_products[start:end]
        page_num = i + 1

        for item in page_items:
            slug_index[item["id"]] = page_num
            if item.get("publisher"):
                pub_name = item["publisher"]["name"]
                publisher_counts[pub_name] = publisher_counts.get(pub_name, 0) + 1
            for adv in item.get("advertisers", []):
                adv_name = adv["name"]
                advertiser_counts[adv_name] = advertiser_counts.get(adv_name, 0) + 1
                if adv_name in advertiser_details:
                    entry = advertiser_details[adv_name]
                    entry["count"] += 1
                    d = item.get("date", "")
                    if d and d > entry.get("latestDate", ""):
                        entry["latestDate"] = d
                else:
                    advertiser_details[adv_name] = {
                        "name": adv_name,
                        "count": 1,
                        "logoUrl": adv.get("logo", ""),
                        "url": adv.get("url", ""),
                        "tags": ADVERTISER_TAGS.get(adv_name, []),
                        "latestDate": item.get("date", ""),
                    }

        page_file = os.path.join(DATA_DIR, f"page-{page_num:04d}.json")
        with open(page_file, "w", encoding="utf-8") as pf:
            json.dump(page_items, pf, separators=(",", ":"))

    # Clean up old pages that are no longer needed
    old_manifest = os.path.join(DATA_DIR, "manifest.json")
    if os.path.exists(old_manifest):
        old = json.load(open(old_manifest))
        for i in range(num_pages + 1, old.get("pages", 0) + 1):
            old_page = os.path.join(DATA_DIR, f"page-{i:04d}.json")
            if os.path.exists(old_page):
                os.remove(old_page)

    # Write manifest
    manifest = {"total": len(all_products), "pageSize": PAGE_SIZE, "pages": num_pages}
    with open(os.path.join(DATA_DIR, "manifest.json"), "w") as mf:
        json.dump(manifest, mf, separators=(",", ":"))

    # Write publisher counts
    sorted_pubs = dict(sorted(publisher_counts.items(), key=lambda x: x[1], reverse=True))
    with open(os.path.join(DATA_DIR, "publishers.json"), "w") as pf:
        json.dump(sorted_pubs, pf, separators=(",", ":"))

    # Write slug index
    with open(os.path.join(DATA_DIR, "slug-index.json"), "w") as sf:
        json.dump(slug_index, sf, separators=(",", ":"))

    # Write advertiser counts
    sorted_advs = dict(sorted(advertiser_counts.items(), key=lambda x: x[1], reverse=True))
    with open(os.path.join(DATA_DIR, "advertisers.json"), "w") as af:
        json.dump(sorted_advs, af, separators=(",", ":"))

    # Write advertiser details
    adv_detail_list = sorted(advertiser_details.values(), key=lambda x: -x["count"])
    for entry in adv_detail_list:
        entry["tags"] = sorted(entry["tags"])
    with open(os.path.join(DATA_DIR, "advertiser-details.json"), "w") as af:
        json.dump(adv_detail_list, af, separators=(",", ":"))

    print(f"\nDone! {len(new_products)} new products added.")
    print(f"Total: {len(all_products)} products across {num_pages} pages.")


if __name__ == "__main__":
    main()
