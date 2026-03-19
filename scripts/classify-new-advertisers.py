#!/usr/bin/env python3
"""
Classify new advertisers into tags using Claude API.
Reads advertiser-tags.json + advertiser-details.json, finds untagged advertisers,
calls Claude to classify them, and updates advertiser-tags.json.
"""

import json
import os
import sys

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPTS_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, "public", "data")

TAGS_PATH = os.path.join(SCRIPTS_DIR, "advertiser-tags.json")
DETAILS_PATH = os.path.join(DATA_DIR, "advertiser-details.json")

VALID_TAGS = [
    "AI", "Business", "Careers", "Creativity", "Crypto", "E-commerce",
    "Education", "Entertainment", "Finance", "Food & Beverage", "Health",
    "Investing", "Lifestyle", "Marketing", "Media", "News", "Newsletter",
    "Productivity", "Real Estate", "SaaS", "Sports", "Startups",
    "Technology", "Travel",
]


def classify_batch(advertisers):
    """Call Claude API to classify a batch of advertisers."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ANTHROPIC_API_KEY not set, skipping classification")
        return {}

    import requests

    adv_list = "\n".join(
        f"- {name} (url: {url})" for name, url in advertisers
    )

    prompt = f"""Classify each advertiser into 1-3 tags from this list:
{json.dumps(VALID_TAGS)}

Advertisers to classify:
{adv_list}

Return ONLY valid JSON: {{"Advertiser Name": ["Tag1", "Tag2"], ...}}
No explanation, just the JSON object."""

    resp = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 4096,
            "messages": [{"role": "user", "content": prompt}],
        },
        timeout=60,
    )
    resp.raise_for_status()
    text = resp.json()["content"][0]["text"].strip()

    # Parse JSON from response (handle markdown code blocks)
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    result = json.loads(text)

    # Validate tags
    validated = {}
    for name, tags in result.items():
        valid = [t for t in tags if t in VALID_TAGS]
        if valid:
            validated[name] = valid
    return validated


def main():
    # Load existing tags
    existing_tags = {}
    if os.path.exists(TAGS_PATH):
        existing_tags = json.load(open(TAGS_PATH))

    # Load advertiser details to find all current advertisers
    if not os.path.exists(DETAILS_PATH):
        print("No advertiser-details.json found")
        return

    details = json.load(open(DETAILS_PATH))

    # Find untagged advertisers
    untagged = []
    for adv in details:
        name = adv["name"]
        if name not in existing_tags:
            untagged.append((name, adv.get("url", "")))

    if not untagged:
        print("All advertisers are already tagged!")
        return

    print(f"Found {len(untagged)} untagged advertisers")

    # Classify in batches of 50
    BATCH_SIZE = 50
    total_classified = 0

    for i in range(0, len(untagged), BATCH_SIZE):
        batch = untagged[i : i + BATCH_SIZE]
        print(f"Classifying batch {i // BATCH_SIZE + 1} ({len(batch)} advertisers)...")

        try:
            results = classify_batch(batch)
            existing_tags.update(results)
            total_classified += len(results)
            print(f"  Classified {len(results)} advertisers")
        except Exception as e:
            print(f"  Error classifying batch: {e}")
            continue

    if total_classified > 0:
        # Sort and write
        sorted_tags = dict(sorted(existing_tags.items()))
        with open(TAGS_PATH, "w") as f:
            json.dump(sorted_tags, f, indent=2, ensure_ascii=False)
        print(f"\nDone! Classified {total_classified} new advertisers.")
        print(f"Total tagged: {len(sorted_tags)}")
    else:
        print("No new advertisers classified.")


if __name__ == "__main__":
    main()
