#!/usr/bin/env python3
"""
Fetch opportunity -> advertiser mappings from beehiiv Metabase
and save as a JSON lookup table.
"""

import json
import requests
import sys
import os

METABASE_URL = "https://beehiiv.metabaseapp.com/api/dataset"
SESSION_TOKEN = "c1d959f2-5e24-41c8-be07-4e3c65d54c4e"
DATABASE_ID = 2
BATCH_SIZE = 50000
OUTPUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "advertiser-lookup.json")

HEADERS = {
    "Content-Type": "application/json",
    "X-Metabase-Session": SESSION_TOKEN,
}


def run_query(sql):
    payload = {
        "database": DATABASE_ID,
        "type": "native",
        "native": {
            "query": sql,
            "template-tags": {},
        },
    }
    resp = requests.post(METABASE_URL, json=payload, headers=HEADERS, timeout=120)
    resp.raise_for_status()
    return resp.json()


def main():
    # Step 1: Get total count
    print("Querying total row count...")
    count_result = run_query(
        "SELECT COUNT(*) FROM ad_network_opportunities o "
        "JOIN ad_network_campaigns c ON o.campaign_id = c.id "
        "JOIN ad_network_advertisers a ON c.advertiser_id = a.id "
        "WHERE a.deleted_at IS NULL"
    )
    total = count_result["data"]["rows"][0][0]
    print(f"Total rows: {total}")

    # Step 2: Fetch in batches
    lookup = {}
    offset = 0
    while offset < total:
        print(f"Fetching rows {offset} - {offset + BATCH_SIZE}...")
        sql = (
            "SELECT o.id as opp_id, a.name, a.url, a.logo "
            "FROM ad_network_opportunities o "
            "JOIN ad_network_campaigns c ON o.campaign_id = c.id "
            "JOIN ad_network_advertisers a ON c.advertiser_id = a.id "
            "WHERE a.deleted_at IS NULL "
            f"ORDER BY o.id LIMIT {BATCH_SIZE} OFFSET {offset}"
        )
        result = run_query(sql)
        rows = result["data"]["rows"]
        if not rows:
            break
        for row in rows:
            opp_id, name, url, logo = row
            lookup[opp_id] = {"name": name, "url": url, "logo": logo}
        print(f"  Got {len(rows)} rows (total so far: {len(lookup)})")
        offset += BATCH_SIZE

    # Step 3: Save JSON
    with open(OUTPUT_PATH, "w") as f:
        json.dump(lookup, f, indent=2)
    print(f"Saved {len(lookup)} entries to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
