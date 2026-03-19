# How to Add New Ads

## Data Source

All ads come from **beehiiv's production replica** via the Metabase MCP (database_id=2, PostgreSQL "Swarm - Production Replica").

## Key Database Tables

| Table | Column Notes |
|-------|-------------|
| `ad_network_placements` | `post_id`, `opportunity_id` (NOT `ad_network_opportunity_id`). No `status` column. Filter with `deleted_at IS NULL`. |
| `posts` | `slug`, `web_title`, `publication_id` |
| `post_previews` | `body` column has full email HTML. **WARNING: Metabase MCP cannot return `body` — column is too large. Use existing HTML files instead.** |
| `publications` | `name`, `alphanumeric_id` (NOT `subdomain`). No `subdomain` column exists. |
| `custom_domains` | `domain`, `publication_id`. Filter by `verified = true` |
| `ad_network_opportunities` | `advertisement_id` (NOT `ad_network_advertisement_id`), `publication_id`, `status` |
| `ad_network_advertisements` | `advertiser_id` (NOT `ad_network_advertiser_id`), `name`, `url` |
| `ad_network_advertisers` | `name`, `url` (NOT `website_url`) |

## Important Rules

- **Do NOT skip ads/posts** — it's fine to have multiple ads from the same advertiser
- **It's fine if a post has multiple advertisers** — list them all in the `advertisers` array
- **Do NOT fetch from "Read Online" URLs** — that's the web version which looks different from email HTML

## Step-by-Step: Finding Ads to Add

### 1. Find posts with ad placements

```sql
SELECT p.slug, p.web_title, p.publication_id,
       ana.name AS adv_name, ana.url AS adv_url,
       anp.created_at::date AS placed_date
FROM ad_network_placements anp
JOIN posts p ON anp.post_id = p.id
JOIN ad_network_opportunities ano ON anp.opportunity_id = ano.id
JOIN ad_network_advertisements anad ON ano.advertisement_id = anad.id
JOIN ad_network_advertisers ana ON anad.advertiser_id = ana.id
WHERE anp.deleted_at IS NULL
ORDER BY anp.created_at DESC
LIMIT 50
```

> **Note**: Do NOT join `publications` or `custom_domains` in this query — the extra joins cause Metabase to time out / return 0 rows. Query publisher info separately (see step 3).

### 2. Get the email HTML

The `post_previews.body` column **cannot be fetched via Metabase MCP** (returns 0 rows even though data exists — the column is too large for Metabase to serialize).

**Use existing HTML files instead**: There are ~180K pre-exported HTML files in `/public/emails/`. Check if the slug already has an HTML file:
```bash
ls /public/emails/<slug>.html
```

If the HTML file doesn't exist, there is currently no way to fetch it via Metabase. Skip that ad or find another approach.

### 3. Get publisher info (separate queries)

Query publication name:
```sql
SELECT name, alphanumeric_id FROM publications WHERE id = '<publication_id>'
```

Query custom domain:
```sql
SELECT domain FROM custom_domains WHERE publication_id = '<publication_id>' AND verified = true LIMIT 1
```

### 4. Determine publisher URL

Priority order:
1. **Custom domain** (`custom_domains.domain`) → `https://{domain}`
2. **Extract from HTML**: If no custom domain, grep the email HTML for the "Read Online" link — its href contains the real publisher URL
3. **Alphanumeric ID fallback** → `https://{alphanumeric_id}.beehiiv.com` — but these are ugly, prefer extracting from HTML
4. **Empty string** — if nothing clean is available

To extract publisher URL from HTML:
```bash
grep -o 'href="[^"]*"' /public/emails/<slug>.html | head -3
# The first href on the "Read Online" line contains the real domain
```

## Data Files to Update

All data lives in `/public/data/`. When adding ads, **all** of these files must be updated:

### `page-NNNN.json`
Array of `ProductItem` objects. Currently all ads fit in `page-0001.json` (pageSize=500).

Each item looks like:
```json
{
  "id": "slug-from-post",
  "title": "Post Web Title",
  "category": "Digital Products",
  "description": "Same as title (or custom)",
  "author": "Publisher Name",
  "url": "https://publisher-url.com/p/slug",
  "tags": ["AI", "Technology", "SaaS"],
  "date": "2025-02-18",
  "publisher": {
    "name": "Publisher Name",
    "url": "https://publisher-custom-domain.com",
    "logo": ""
  },
  "advertisers": [
    {
      "name": "Advertiser Name",
      "url": "https://advertiser-website.com",
      "logo": "https://www.google.com/s2/favicons?domain=advertiser.com&sz=128"
    }
  ],
  "htmlFile": "/emails/slug-from-post.html",
  "hasAds": true
}
```

### `manifest.json`
```json
{"total": 51, "pageSize": 500, "pages": 1}
```
Update `total` when adding ads. If total exceeds 500, increment `pages` and create `page-0002.json`.

### `slug-index.json`
Maps slug → page number: `{"slug-name": 1}`

### `publishers.json`
Maps publisher name → count: `{"Publisher Name": 5}`

### `advertisers.json`
Maps advertiser name → count: `{"Advertiser Name": 3}`

### `advertiser-details.json`
Sorted array (by count desc, then name) of advertiser metadata:
```json
{
  "name": "Advertiser Name",
  "count": 3,
  "logoUrl": "https://www.google.com/s2/favicons?domain=advertiser.com&sz=128",
  "url": "https://advertiser-website.com",
  "tags": ["AI", "SaaS", "Technology"],
  "latestDate": "2026-02-18"
}
```

### `src/data.ts` — `TOP_ADVERTISERS`
Add new advertisers to the appropriate tier.

### `public/emails/<slug>.html`
The raw email HTML. Currently sourced from a previous bulk export of ~180K files.

## Tag Taxonomy

Tags are assigned based **primarily on the advertiser** (what they sell), and secondarily on the publisher content. Every ad should have **at least 3 tags**.

Current tags in use:
- AI, Technology, SaaS, Productivity
- Business, Finance, Marketing, Startups
- Media, News, Lifestyle, Health, Careers
- E-commerce, Creativity, Fashion, Crypto

## Ranking / Featured Sort

`src/data.ts` contains `TOP_ADVERTISERS` — a tiered ranking list that controls the "Featured" sort order:
- **Tier 1** (weight 6x): Top brands/SaaS — Hubspot, beehiiv, Proton, reMarkable, Shutterstock
- **Tier 2** (weight 3.5x): Strong brands — Attio, HoneyBook, Artisan, AdQuick, etc.
- **Tier 3** (weight 2x): Niche brands — Typeless, Medik8, Ladders, etc.
- **Tier 4** (weight 1x): Media/newsletter companies — 1440 Media, Morning Brew, etc.

## Bulk Import Process

For large imports (50+ ads):

1. Query Metabase for ad placements (step 1 SQL above)
2. Check which slugs have existing HTML files in `/public/emails/`
3. For each slug with HTML, query publisher info separately
4. Extract publisher URL from HTML if no custom domain
5. Build `ProductItem` entries with proper metadata, tags, publisher/advertiser info
6. Write all data files (page JSON, manifest, slug-index, publishers, advertisers, advertiser-details)
7. Add new advertisers to `TOP_ADVERTISERS` in `src/data.ts`
