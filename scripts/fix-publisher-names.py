#!/usr/bin/env python3
"""
Fix publisher names and URLs in page data using Metabase as source of truth.

1. Query Metabase for all publications → get real name, subdomain, hostname
2. Build mapping: subdomain/hostname → proper publisher name + root URL
3. Fix all page files: correct publisher.name, publisher.url, and author fields
"""

import requests
import json
import os
import warnings
from urllib.parse import urlparse

warnings.filterwarnings("ignore")

METABASE_URL = "https://beehiiv.metabaseapp.com/api/dataset"
SESSION_TOKEN = "c1d959f2-5e24-41c8-be07-4e3c65d54c4e"
DATABASE_ID = 2
HEADERS = {"Content-Type": "application/json", "X-Metabase-Session": SESSION_TOKEN}

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_ROOT, "public", "data")


def run_query(sql, timeout=600):
    payload = {"database": DATABASE_ID, "type": "native", "native": {"query": sql, "template-tags": {}}}
    resp = requests.post(METABASE_URL, json=payload, headers=HEADERS, timeout=timeout)
    resp.raise_for_status()
    return resp.json()


def collect_publisher_hosts():
    """Collect unique publisher hosts from page data."""
    from urllib.parse import urlparse as _urlparse
    beehiiv_subs = set()
    custom_hosts = set()
    for i in range(1, 600):
        filepath = os.path.join(DATA_DIR, f"page-{i:04d}.json")
        if not os.path.exists(filepath):
            break
        try:
            items = json.load(open(filepath))
        except:
            continue
        for item in items:
            pub = item.get("publisher") or {}
            purl = pub.get("url", "") or ""
            if purl:
                try:
                    parsed = _urlparse(purl)
                    host = (parsed.hostname or "").lower().replace("www.", "")
                    if host.endswith(".beehiiv.com"):
                        beehiiv_subs.add(host.replace(".beehiiv.com", ""))
                    elif host:
                        custom_hosts.add(host)
                except:
                    pass
    return beehiiv_subs, custom_hosts


def fetch_publisher_map():
    """Fetch publications from Metabase, only for hosts that exist in our data."""
    print("Collecting publisher hosts from page data...")
    beehiiv_subs, custom_hosts = collect_publisher_hosts()
    print(f"  {len(beehiiv_subs)} beehiiv subdomains, {len(custom_hosts)} custom hosts")

    subdomain_map = {}
    hostname_map = {}

    # Query in batches of 200 subdomains
    beehiiv_list = sorted(beehiiv_subs)
    print(f"\nFetching beehiiv publisher names from Metabase...")
    for batch_start in range(0, len(beehiiv_list), 200):
        batch = beehiiv_list[batch_start:batch_start + 200]
        in_clause = ", ".join(f"'{s.replace(chr(39), chr(39)+chr(39))}'" for s in batch)
        try:
            result = run_query(f"""
                SELECT rl.subdomain, pub.name
                FROM publications pub
                JOIN resource_locators rl ON rl.resource_locatable_id = pub.id
                    AND rl.resource_locatable_type = 'Publication' AND rl.deleted_at IS NULL
                WHERE pub.deleted_at IS NULL
                AND rl.subdomain IN ({in_clause})
            """, timeout=600)
            for subdomain, name in result["data"]["rows"]:
                if name and subdomain:
                    subdomain_map[subdomain.lower()] = name
        except Exception as e:
            print(f"  WARNING: Batch failed: {e}")
        print(f"  Processed {min(batch_start + 200, len(beehiiv_list))}/{len(beehiiv_list)} subdomains, found {len(subdomain_map)} names")

    # Query custom hostnames
    custom_list = sorted(custom_hosts)
    print(f"\nFetching custom hostname publisher names from Metabase...")
    for batch_start in range(0, len(custom_list), 200):
        batch = custom_list[batch_start:batch_start + 200]
        in_clause = ", ".join(f"'{h.replace(chr(39), chr(39)+chr(39))}'" for h in batch)
        try:
            result = run_query(f"""
                SELECT rl.hostname, pub.name
                FROM publications pub
                JOIN resource_locators rl ON rl.resource_locatable_id = pub.id
                    AND rl.resource_locatable_type = 'Publication' AND rl.deleted_at IS NULL
                WHERE pub.deleted_at IS NULL
                AND LOWER(REPLACE(rl.hostname, 'www.', '')) IN ({in_clause})
            """, timeout=600)
            for hostname, name in result["data"]["rows"]:
                if name and hostname:
                    hostname_map[hostname.lower().replace("www.", "")] = name
        except Exception as e:
            print(f"  WARNING: Batch failed: {e}")
        print(f"  Processed {min(batch_start + 200, len(custom_list))}/{len(custom_list)} hostnames, found {len(hostname_map)} names")

    print(f"\nTotal: {len(subdomain_map)} subdomain mappings, {len(hostname_map)} hostname mappings")
    return subdomain_map, hostname_map


def get_root_url(url):
    """Strip post path from URL, return root URL."""
    if not url:
        return url
    try:
        parsed = urlparse(url)
        path = parsed.path.strip("/")
        if path:
            return f"{parsed.scheme}://{parsed.netloc}"
    except:
        pass
    return url


def resolve_publisher_name(current_name, url, subdomain_map, hostname_map):
    """Look up the real publisher name from Metabase data."""
    if not url:
        return current_name

    try:
        parsed = urlparse(url)
        host = (parsed.hostname or "").lower().replace("www.", "")
    except:
        return current_name

    # Try hostname lookup first (custom domains)
    if host in hostname_map:
        return hostname_map[host]

    # Try subdomain lookup (beehiiv domains)
    if host.endswith(".beehiiv.com"):
        subdomain = host.replace(".beehiiv.com", "")
        if subdomain in subdomain_map:
            return subdomain_map[subdomain]

    return current_name


def main():
    subdomain_map, hostname_map = fetch_publisher_map()

    # Process all page files
    fixed_urls = 0
    fixed_names = 0
    total_items = 0
    name_changes = {}  # old → new for reporting

    for i in range(1, 600):
        filepath = os.path.join(DATA_DIR, f"page-{i:04d}.json")
        if not os.path.exists(filepath):
            break

        try:
            items = json.load(open(filepath))
        except json.JSONDecodeError as e:
            print(f"  WARNING: Skipping {filepath} (corrupt JSON: {e})")
            continue

        changed = False

        for item in items:
            total_items += 1
            pub = item.get("publisher")
            if not pub:
                continue

            pname = pub.get("name", "") or ""
            purl = pub.get("url", "") or ""

            # Fix URL: strip post paths
            new_url = get_root_url(purl)
            if new_url != purl:
                pub["url"] = new_url
                fixed_urls += 1
                changed = True

            # Fix name: look up real name from Metabase
            real_name = resolve_publisher_name(pname, new_url or purl, subdomain_map, hostname_map)
            if real_name != pname:
                pub["name"] = real_name
                if item.get("author") == pname:
                    item["author"] = real_name
                fixed_names += 1
                changed = True
                if pname not in name_changes:
                    name_changes[pname] = real_name

        if changed:
            json.dump(items, open(filepath, "w"))

    print(f"\nProcessed {total_items} items across page files")
    print(f"Fixed {fixed_urls} publisher URLs (stripped post paths)")
    print(f"Fixed {fixed_names} publisher names (from Metabase)")
    print(f"\nSample name changes ({len(name_changes)} unique):")
    for old, new in list(name_changes.items())[:30]:
        print(f"  {old} → {new}")


if __name__ == "__main__":
    main()
