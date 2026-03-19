#!/usr/bin/env python3
"""
Rewrite tags on all items based on their ADVERTISERS (not publisher).
Each item gets the union of its advertisers' tags.
"""

import json
import glob
import os

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPTS_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, "public", "data")

# Load advertiser tags
adv_tags_path = os.path.join(SCRIPTS_DIR, "advertiser-tags.json")
ADVERTISER_TAGS = json.load(open(adv_tags_path))
print(f"Loaded tags for {len(ADVERTISER_TAGS)} advertisers")


def get_tags_for_item(item):
    """Get merged tags from all advertisers on this item."""
    tags = set()
    for adv in item.get("advertisers", []):
        name = adv.get("name", "")
        adv_item_tags = ADVERTISER_TAGS.get(name, [])
        tags.update(adv_item_tags)
    return sorted(tags)


def main():
    page_files = sorted(glob.glob(os.path.join(DATA_DIR, "page-*.json")))
    print(f"Scanning {len(page_files)} page files...")

    updated = 0
    cleared = 0
    unchanged = 0
    pages_modified = set()

    for page_path in page_files:
        data = json.load(open(page_path))
        modified = False

        for item in data:
            new_tags = get_tags_for_item(item)
            old_tags = item.get("tags", [])

            if new_tags == old_tags:
                unchanged += 1
                continue

            if new_tags:
                item["tags"] = new_tags
                updated += 1
            else:
                # No advertisers or no tags for any advertiser — remove tags
                if "tags" in item:
                    del item["tags"]
                cleared += 1

            modified = True

        if modified:
            with open(page_path, 'w') as f:
                json.dump(data, f, separators=(',', ':'))
            pages_modified.add(page_path)

    print(f"\nDone!")
    print(f"  Updated tags: {updated}")
    print(f"  Cleared tags: {cleared}")
    print(f"  Unchanged: {unchanged}")
    print(f"  Pages modified: {len(pages_modified)}")

    # Rebuild advertiser-details.json — tags come from ADVERTISER_TAGS directly
    # Preserve existing logo URLs (page data has bare filenames, details has full URLs)
    print("\nRebuilding advertiser-details.json...")
    existing_details = {}
    existing_path = os.path.join(DATA_DIR, "advertiser-details.json")
    if os.path.exists(existing_path):
        for a in json.load(open(existing_path)):
            existing_details[a["name"]] = a

    advertiser_details = {}
    advertiser_counts = {}

    for page_path in page_files:
        data = json.load(open(page_path))
        for item in data:
            for adv in item.get("advertisers", []):
                name = adv["name"]
                advertiser_counts[name] = advertiser_counts.get(name, 0) + 1
                if name in advertiser_details:
                    entry = advertiser_details[name]
                    entry["count"] += 1
                    d = item.get("date", "")
                    if d and d > entry.get("latestDate", ""):
                        entry["latestDate"] = d
                else:
                    # Preserve existing logoUrl if available
                    existing = existing_details.get(name, {})
                    advertiser_details[name] = {
                        "name": name,
                        "count": 1,
                        "logoUrl": existing.get("logoUrl", "") or adv.get("logo", ""),
                        "url": existing.get("url", "") or adv.get("url", ""),
                        "tags": ADVERTISER_TAGS.get(name, []),
                        "latestDate": item.get("date", ""),
                    }

    # Write advertiser counts
    sorted_advs = dict(sorted(advertiser_counts.items(), key=lambda x: x[1], reverse=True))
    with open(os.path.join(DATA_DIR, "advertisers.json"), "w") as f:
        json.dump(sorted_advs, f, separators=(",", ":"))

    # Write advertiser details
    adv_detail_list = sorted(advertiser_details.values(), key=lambda x: -x["count"])
    for entry in adv_detail_list:
        entry["tags"] = sorted(entry["tags"])
    with open(os.path.join(DATA_DIR, "advertiser-details.json"), "w") as f:
        json.dump(adv_detail_list, f, separators=(",", ":"))

    print(f"Updated {len(advertiser_details)} advertisers")

    # Show sample of tags per top advertiser
    print("\nTop 20 advertiser tags:")
    for entry in adv_detail_list[:20]:
        print(f"  {entry['name']}: {entry['tags']}")


if __name__ == "__main__":
    main()
