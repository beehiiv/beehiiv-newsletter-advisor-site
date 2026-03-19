import React from 'react';
import { useState, useEffect } from 'react';
import { PRODUCTS, TOP_ADVERTISERS } from './data';
import type { ProductItem } from './types';

export { TOP_ADVERTISERS };

// Advertisers whose favicon logos are dark/black and need color inversion
const INVERT_LOGO_ADVERTISERS = new Set<string>(['RYSE']);
export const shouldInvertLogo = (name: string) => INVERT_LOGO_ADVERTISERS.has(name);

// Advertisers whose logo is a wide banner that needs center-crop into a square
const CROP_LOGO_ADVERTISERS = new Set<string>(['that startup guy', 'SoundSelf', 'Unspun Updates']);
export const shouldCropLogo = (name: string) => CROP_LOGO_ADVERTISERS.has(name);

// Advertisers whose logo needs slight scale-down inside the container
const SCALE_LOGO: Record<string, number> = { 'Inspire Financial': 2 };

// Advertisers whose logo needs a white square background (e.g. transparent logos on colored bg)
const WHITE_BG_LOGO = new Set<string>(['Choose Your Horizon']);
export const shouldWhiteBgLogo = (name: string) => WHITE_BG_LOGO.has(name);

export const getLogoStyle = (name: string): React.CSSProperties | undefined => {
  const s: React.CSSProperties = {};
  if (INVERT_LOGO_ADVERTISERS.has(name)) s.filter = 'invert(1)';
  if (SCALE_LOGO[name]) s.transform = `scale(${SCALE_LOGO[name]})`;
  if (WHITE_BG_LOGO.has(name)) { s.background = '#fff'; s.padding = '2px'; s.borderRadius = '4px'; }
  return Object.keys(s).length > 0 ? s : undefined;
};

const hasUrl = (p: ProductItem) => !!(p.url || p.publisher?.url);
export const CURATED_PRODUCTS = PRODUCTS.filter(hasUrl);

/**
 * Featured sort: interleaves ads so top-ranked advertisers appear more often
 * near the top, but never in one big block. Uses deterministic round-robin
 * with rank-based weighting.
 */
export function featuredSort(items: ProductItem[]): ProductItem[] {
  // Group items by their best advertiser rank
  const getRank = (item: ProductItem) => {
    const ranks = (item.advertisers || []).map(adv => {
      const idx = TOP_ADVERTISERS.indexOf(adv.name);
      return idx === -1 ? TOP_ADVERTISERS.length : idx;
    });
    return ranks.length > 0 ? Math.min(...ranks) : TOP_ADVERTISERS.length;
  };

  // Group by advertiser name (use best-ranked advertiser)
  const groups = new Map<string, ProductItem[]>();
  for (const item of items) {
    const bestAdv = (item.advertisers || []).reduce<{ name: string; rank: number } | null>((best, adv) => {
      const idx = TOP_ADVERTISERS.indexOf(adv.name);
      const rank = idx === -1 ? TOP_ADVERTISERS.length : idx;
      if (!best || rank < best.rank) return { name: adv.name, rank };
      return best;
    }, null);
    const key = bestAdv?.name || '__none__';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  // Shuffle each group internally
  const shuffle = (arr: ProductItem[]) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  };
  for (const g of groups.values()) {
    shuffle(g);
  }

  // Build weighted pool: each ad gets a random score biased by advertiser rank
  // Lower rank = higher weight = better scores on average
  const scored = items.map(item => {
    const rank = getRank(item);
    const weight = rank < 28 ? 6 : rank < 66 ? 3.5 : rank < 101 ? 2 : 1;
    const score = Math.random() * weight;
    const bestAdv = (item.advertisers || []).reduce<{ name: string; rank: number } | null>((best, adv) => {
      const idx = TOP_ADVERTISERS.indexOf(adv.name);
      const r = idx === -1 ? TOP_ADVERTISERS.length : idx;
      if (!best || r < best.rank) return { name: adv.name, rank: r };
      return best;
    }, null);
    return { item, score, advName: bestAdv?.name || '' };
  });

  scored.sort((a, b) => b.score - a.score);

  // Spread out: no advertiser can appear more than once in any sliding window of 6
  const result: ProductItem[] = [];
  const remaining = [...scored];
  const recentAdvs: string[] = [];
  const MAX_PER_WINDOW = 6;

  while (remaining.length > 0) {
    let picked = -1;
    for (let i = 0; i < remaining.length; i++) {
      const name = remaining[i].advName;
      if (!name || !recentAdvs.includes(name)) {
        picked = i;
        break;
      }
    }
    if (picked === -1) picked = 0; // fallback if all blocked

    const entry = remaining.splice(picked, 1)[0];
    result.push(entry.item);
    if (entry.advName) {
      recentAdvs.push(entry.advName);
      if (recentAdvs.length > MAX_PER_WINDOW) recentAdvs.shift();
    }
  }

  return result;
}

// Cache
const pageCache = new Map<number, ProductItem[]>();
let manifestCache: { total: number; pageSize: number; pages: number } | null = null;
let slugIndexCache: Record<string, number> | null = null;
let publishersCache: Record<string, number> | null = null;
let advertisersCountCache: number | null = null;
let advertiserDetailsCache: AdvertiserDetail[] | null = null;
let advertisersMapCache: Record<string, number> | null = null;
let tagsCache: Record<string, number> | null = null;
let oldestItemsCache: ProductItem[] | null = null;
let oldestItemsPromise: Promise<ProductItem[]> | null = null;

export interface AdvertiserDetail {
  name: string;
  count: number;
  logoUrl: string;
  url: string;
  tags: string[];
  latestDate: string;
}

export interface ShowcaseAdvertiser {
  name: string;
  count: number;
  logoUrl: string;
  url: string;
  items: ProductItem[];
}

let showcaseCache: ShowcaseAdvertiser[] | null = null;

export function useTopShowcase() {
  const [data, setData] = useState<ShowcaseAdvertiser[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (showcaseCache) { setData(showcaseCache); setLoading(false); return; }
    fetch('/data/top-showcase.json')
      .then(r => r.json())
      .then((d: ShowcaseAdvertiser[]) => {
        showcaseCache = d;
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);
  return { showcase: data, loading };
}

const curatedById = new Map(CURATED_PRODUCTS.map(p => [p.id, p]));

export async function getManifest() {
  if (!manifestCache) {
    try {
      const res = await fetch('/data/manifest.json');
      if (!res.ok) {
        manifestCache = { total: 0, pageSize: 500, pages: 0 };
        return manifestCache;
      }
      manifestCache = await res.json();
    } catch {
      manifestCache = { total: 0, pageSize: 500, pages: 0 };
    }
  }
  return manifestCache!;
}

async function getSlugIndex(): Promise<Record<string, number>> {
  if (!slugIndexCache) {
    try {
      const res = await fetch('/data/slug-index.json');
      if (!res.ok) { slugIndexCache = {}; return slugIndexCache; }
      slugIndexCache = await res.json();
    } catch {
      slugIndexCache = {};
    }
  }
  return slugIndexCache!;
}

export async function getPublishers(): Promise<Record<string, number>> {
  if (!publishersCache) {
    try {
      const res = await fetch('/data/publishers.json');
      if (!res.ok) { publishersCache = {}; return publishersCache; }
      publishersCache = await res.json();
    } catch {
      publishersCache = {};
    }
  }
  return publishersCache!;
}

export async function getAdvertisersMap(): Promise<Record<string, number>> {
  if (!advertisersMapCache) {
    try {
      const res = await fetch('/data/advertisers.json');
      if (!res.ok) { advertisersMapCache = {}; return advertisersMapCache; }
      advertisersMapCache = await res.json();
    } catch {
      advertisersMapCache = {};
    }
  }
  return advertisersMapCache!;
}

export async function getTags(): Promise<Record<string, number>> {
  if (!tagsCache) {
    try {
      const res = await fetch('/data/tags.json');
      if (!res.ok) { tagsCache = {}; return tagsCache; }
      tagsCache = await res.json();
    } catch {
      tagsCache = {};
    }
  }
  return tagsCache!;
}

/**
 * Fetch and cache the pre-sorted oldest items from oldest.json.
 * Returns up to 5000 items sorted oldest-first.
 */
export async function getOldestItems(): Promise<ProductItem[]> {
  if (oldestItemsCache) return oldestItemsCache;
  if (oldestItemsPromise) return oldestItemsPromise;
  oldestItemsPromise = (async () => {
    try {
      const res = await fetch('/data/oldest.json');
      if (!res.ok) { oldestItemsCache = []; return []; }
      oldestItemsCache = await res.json();
      return oldestItemsCache!;
    } catch {
      oldestItemsCache = [];
      return [];
    }
  })();
  return oldestItemsPromise;
}

/**
 * Hook to access pre-sorted oldest items from oldest.json.
 * Only fetches when enabled=true (i.e. when user selects oldest sort).
 */
export function useOldestItems(enabled: boolean) {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    getOldestItems().then(data => {
      setItems(data);
      setLoading(false);
    });
  }, [enabled]);

  return { items, loading };
}

export function useAllFilters() {
  const [advertisers, setAdvertisers] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [publishers, setPublishers] = useState<string[]>([]);
  const [advertiserCounts, setAdvertiserCounts] = useState<Record<string, number>>({});
  const [tagCounts, setTagCounts] = useState<Record<string, number>>({});
  const [publisherCounts, setPublisherCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    getAdvertisersMap().then(m => {
      setAdvertiserCounts(m);
      setAdvertisers(Object.keys(m).sort());
    });
    getTags().then(m => {
      setTagCounts(m);
      setTags(Object.keys(m).sort());
    });
    getPublishers().then(m => {
      setPublisherCounts(m);
      setPublishers(Object.keys(m).sort());
    });
  }, []);

  return { advertisers, tags, publishers, advertiserCounts, tagCounts, publisherCounts };
}

export async function getProductPage(page: number): Promise<ProductItem[]> {
  if (pageCache.has(page)) return pageCache.get(page)!;
  const padded = String(page).padStart(4, '0');
  try {
    const res = await fetch(`/data/page-${padded}.json`);
    if (!res.ok) return [];
    const items: ProductItem[] = await res.json();
    pageCache.set(page, items);
    return items;
  } catch {
    return [];
  }
}

export async function getProductById(id: string): Promise<ProductItem | undefined> {
  const curated = curatedById.get(id);
  if (curated) return curated;

  const index = await getSlugIndex();
  const pageNum = index[id];
  if (!pageNum) return undefined;

  const page = await getProductPage(pageNum);
  return page.find(p => p.id === id);
}

export async function getTotalCount(): Promise<number> {
  const m = await getManifest();
  return m.total + CURATED_PRODUCTS.length;
}

export async function getAdvertiserCount(): Promise<number> {
  if (advertisersCountCache !== null) return advertisersCountCache;
  try {
    const res = await fetch('/data/advertisers.json');
    const data = await res.json();
    advertisersCountCache = Object.keys(data).length;
    return advertisersCountCache;
  } catch {
    return 0;
  }
}

export function useAdvertiserCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    getAdvertiserCount().then(setCount);
  }, []);
  return count;
}

export async function getAdvertiserDetails(): Promise<AdvertiserDetail[]> {
  if (advertiserDetailsCache) return advertiserDetailsCache;
  try {
    const res = await fetch('/data/advertiser-details.json');
    if (!res.ok) { advertiserDetailsCache = []; return []; }
    advertiserDetailsCache = await res.json();
    return advertiserDetailsCache!;
  } catch {
    advertiserDetailsCache = [];
    return [];
  }
}

export function useAdvertiserDetails() {
  const [details, setDetails] = useState<AdvertiserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getAdvertiserDetails().then(d => {
      setDetails(d);
      setLoading(false);
    });
  }, []);
  return { advertisers: details, loading };
}

// Shared global cache for imported products - loads pages progressively (newest first)
let globalImportedItems: ProductItem[] = [];
let globalTotalCount = CURATED_PRODUCTS.length;
let globalTotalPages = 0;
let globalCurrentPage = 0;
let globalLoading = false;
let globalInitialized = false;
let globalInitPromise: Promise<void> | null = null;
const globalLoadedPages = new Set<number>();
const globalListeners = new Set<() => void>();

function notifyListeners() {
  globalListeners.forEach(fn => fn());
}

async function initProducts(): Promise<void> {
  if (globalInitPromise) return globalInitPromise;
  globalInitPromise = (async () => {
    globalLoading = true;
    notifyListeners();
    const m = await getManifest();
    globalTotalPages = m.pages;
    globalTotalCount = m.total + CURATED_PRODUCTS.length;
    // Auto-load first page (pre-shuffled at build time for diverse featured sort)
    if (m.pages > 0) {
      const items = await getProductPage(1);
      globalImportedItems = items;
      globalCurrentPage = 1;
      globalLoadedPages.add(1);
    }
    globalLoading = false;
    globalInitialized = true;
    notifyListeners();
  })();
  return globalInitPromise;
}

async function loadMoreProducts(): Promise<void> {
  if (globalLoading) return;
  if (globalCurrentPage >= globalTotalPages) return;
  globalLoading = true;
  notifyListeners();
  const nextPage = globalCurrentPage + 1;
  if (!globalLoadedPages.has(nextPage)) {
    const items = await getProductPage(nextPage);
    globalImportedItems = [...globalImportedItems, ...items];
    globalLoadedPages.add(nextPage);
  }
  globalCurrentPage = nextPage;
  globalLoading = false;
  notifyListeners();
}

/**
 * Hook to progressively load imported products (newest first).
 * Loads first page on mount, then exposes loadMore for pagination.
 * For oldest-first sorting, use useOldestItems() instead.
 */
export function useProducts() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate(n => n + 1);
    globalListeners.add(listener);
    if (!globalInitialized && !globalInitPromise) {
      initProducts();
    }
    return () => { globalListeners.delete(listener); };
  }, []);

  // All items: curated first (reversed for most recent), then imported (already date-sorted desc)
  // Filter out any without a read-online URL
  const allItems = [...[...CURATED_PRODUCTS].reverse(), ...globalImportedItems.filter(hasUrl)];
  const hasMore = globalCurrentPage < globalTotalPages;

  return { allItems, curatedItems: PRODUCTS, importedItems: globalImportedItems, loading: globalLoading, loadMore: loadMoreProducts, hasMore, totalCount: globalTotalCount };
}

/**
 * Hook to find a product by ID, checking curated then imported data.
 */
export function useProductById(id: string | undefined) {
  const [product, setProduct] = useState<ProductItem | undefined>(
    id ? curatedById.get(id) : undefined
  );
  const [loading, setLoading] = useState(!product && !!id);

  useEffect(() => {
    if (!id) return;
    const curated = curatedById.get(id);
    if (curated) {
      setProduct(curated);
      setLoading(false);
      return;
    }
    setLoading(true);
    getProductById(id).then(p => {
      setProduct(p);
      setLoading(false);
    });
  }, [id]);

  return { product, loading };
}

/**
 * Hook to find prev/next ad IDs for navigation.
 * Loads the relevant page(s) from the slug index so arrows appear immediately.
 */
export function useAdNeighbors(id: string | undefined, scope?: { tag?: string; advertiser?: string }) {
  const [prevId, setPrevId] = useState<string | null>(null);
  const [nextId, setNextId] = useState<string | null>(null);
  const scopeTag = scope?.tag;
  const scopeAdv = scope?.advertiser;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      // Advertiser-scoped: use pre-built per-advertiser JSON (single fetch)
      if (scopeAdv) {
        try {
          const slug = scopeAdv.replace(/\s+/g, '-');
          const res = await fetch(`/data/adv/${encodeURIComponent(slug)}.json`);
          if (!res.ok || cancelled) return;
          const items: ProductItem[] = await res.json();
          if (cancelled) return;
          const idx = items.findIndex(p => p.id === id);
          if (idx === -1) return;
          const prev = idx > 0 ? items[idx - 1].id : null;
          const next = idx < items.length - 1 ? items[idx + 1].id : null;
          if (!cancelled) { setPrevId(prev); setNextId(next); }
        } catch { /* no arrows on error */ }
        return;
      }

      // Tag-scoped: find neighbors in nearby pages
      if (scopeTag) {
        const index = await getSlugIndex();
        const pageNum = index[id];
        if (!pageNum || cancelled) return;
        const manifest = await getManifest();
        const windowSize = 5;
        const startPage = Math.max(1, pageNum - windowSize);
        const endPage = Math.min(manifest.pages, pageNum + windowSize);
        const nearbyItems: ProductItem[] = [];
        for (let i = startPage; i <= endPage; i++) {
          const page = await getProductPage(i);
          nearbyItems.push(...page);
        }
        const filtered = nearbyItems.filter(item => item.tags?.includes(scopeTag));
        const idx = filtered.findIndex(p => p.id === id);
        if (idx === -1 || cancelled) return;
        const prev = idx > 0 ? filtered[idx - 1].id : null;
        const next = idx < filtered.length - 1 ? filtered[idx + 1].id : null;
        if (!cancelled) { setPrevId(prev); setNextId(next); }
        return;
      }

      // Check curated first
      const curatedReversed = [...CURATED_PRODUCTS].reverse();
      const curatedIdx = curatedReversed.findIndex(p => p.id === id);
      if (curatedIdx !== -1) {
        const prev = curatedIdx > 0 ? curatedReversed[curatedIdx - 1].id : null;
        const next = curatedIdx < curatedReversed.length - 1 ? curatedReversed[curatedIdx + 1].id : null;
        if (!cancelled) { setPrevId(prev); setNextId(next); }
        return;
      }

      // Find in imported pages via slug index
      const index = await getSlugIndex();
      const pageNum = index[id];
      if (!pageNum) return;

      const manifest = await getManifest();
      const page = await getProductPage(pageNum);
      const idx = page.findIndex(p => p.id === id);
      if (idx === -1 || cancelled) return;

      let prev: string | null = null;
      let next: string | null = null;

      if (idx > 0) {
        prev = page[idx - 1].id;
      } else if (pageNum > 1) {
        const prevPage = await getProductPage(pageNum - 1);
        if (prevPage.length > 0) prev = prevPage[prevPage.length - 1].id;
      }

      if (idx < page.length - 1) {
        next = page[idx + 1].id;
      } else if (pageNum < manifest.pages) {
        const nextPage = await getProductPage(pageNum + 1);
        if (nextPage.length > 0) next = nextPage[0].id;
      }

      if (!cancelled) { setPrevId(prev); setNextId(next); }
    })();

    return () => { cancelled = true; };
  }, [id, scopeTag, scopeAdv]);

  return { prevId, nextId };
}

/**
 * Hook to search imported products by author/publisher name.
 * Uses pre-built per-publisher JSON for instant loading.
 */
export function useProductsByAuthor(authorName: string) {
  const [importedProducts, setImportedProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const curatedProducts = CURATED_PRODUCTS.filter(p => p.author === authorName);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const slug = authorName.replace(/\s+/g, '-').replace(/[\/\\:*?"<>|]/g, '_');
    fetch(`/data/pub/${encodeURIComponent(slug)}.json`)
      .then(r => r.ok ? r.json() : [])
      .then((items: ProductItem[]) => {
        if (!cancelled) {
          setImportedProducts(items.filter(p => hasUrl(p)));
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [authorName]);

  return {
    products: [...curatedProducts, ...importedProducts],
    curatedProducts,
    importedProducts,
    loading
  };
}

export function useProductsByAdvertiser(advertiserName: string) {
  const [importedProducts, setImportedProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const curatedProducts = CURATED_PRODUCTS.filter(p =>
    p.advertisers?.some(a => a.name === advertiserName)
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // Fetch pre-built per-advertiser JSON (single request instead of scanning 531 pages)
    const slug = advertiserName.replace(/\s+/g, '-');
    fetch(`/data/adv/${encodeURIComponent(slug)}.json`)
      .then(r => r.ok ? r.json() : [])
      .then((items: ProductItem[]) => {
        if (!cancelled) {
          setImportedProducts(items.filter(p => hasUrl(p)));
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [advertiserName]);

  return {
    products: [...curatedProducts, ...importedProducts],
    curatedProducts,
    importedProducts,
    loading
  };
}

/**
 * Hook to load products for a specific tag from pre-built per-tag JSON.
 */
export function useProductsByTag(tagName: string) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tagName) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);

    const slug = tagName.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
    fetch(`/data/tag/${encodeURIComponent(slug)}.json`)
      .then(r => r.ok ? r.json() : [])
      .then((items: ProductItem[]) => {
        if (!cancelled) {
          setProducts(items.filter(p => hasUrl(p)));
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [tagName]);

  return { products, loading };
}

/**
 * Hook for Browse page search: matches query against advertiser/tag names,
 * fetches pre-built JSON for top matches, returns merged items.
 * Requires 3+ characters to trigger.
 */
export function useSearchByEntity(query: string, allAdvertisers: string[], allTags: string[]) {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.toLowerCase().trim();
    if (q.length < 3) { setItems([]); setLoading(false); return; }

    let cancelled = false;
    setLoading(true);

    // Match advertisers and tags
    const matchedAdvs = allAdvertisers.filter(a => a.toLowerCase().includes(q)).slice(0, 5);
    const matchedTags = allTags.filter(t => t.toLowerCase().includes(q)).slice(0, 3);

    const fetches: Promise<ProductItem[]>[] = [];

    for (const adv of matchedAdvs) {
      const slug = adv.replace(/\s+/g, '-');
      fetches.push(
        fetch(`/data/adv/${encodeURIComponent(slug)}.json`)
          .then(r => r.ok ? r.json() : [])
          .catch(() => [])
      );
    }

    for (const tag of matchedTags) {
      const slug = tag.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
      fetches.push(
        fetch(`/data/tag/${encodeURIComponent(slug)}.json`)
          .then(r => r.ok ? r.json() : [])
          .catch(() => [])
      );
    }

    if (fetches.length === 0) {
      setItems([]); setLoading(false); return;
    }

    Promise.all(fetches).then(results => {
      if (cancelled) return;
      // Merge and deduplicate by id
      const seen = new Set<string>();
      const merged: ProductItem[] = [];
      for (const batch of results) {
        for (const item of batch) {
          if (hasUrl(item) && !seen.has(item.id)) {
            seen.add(item.id);
            merged.push(item);
          }
        }
      }
      setItems(merged);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [query, allAdvertisers, allTags]);

  return { items, loading };
}

/**
 * Hook for fetching items for selected tags/categories from pre-built JSON.
 * Used by Browse sidebar checkboxes.
 */
export function useItemsByTags(tags: string[]) {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tags.length === 0) { setItems([]); setLoading(false); return; }

    let cancelled = false;
    setLoading(true);

    const fetches = tags.map(tag => {
      const slug = tag.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '-');
      return fetch(`/data/tag/${encodeURIComponent(slug)}.json`)
        .then(r => r.ok ? r.json() : [])
        .catch(() => []);
    });

    Promise.all(fetches).then(results => {
      if (cancelled) return;
      const seen = new Set<string>();
      const merged: ProductItem[] = [];
      for (const batch of results) {
        for (const item of batch) {
          if (hasUrl(item) && !seen.has(item.id)) {
            seen.add(item.id);
            merged.push(item);
          }
        }
      }
      setItems(merged);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [tags.join(',')]);

  return { items, loading };
}

/**
 * Hook for fetching items for selected advertisers from pre-built JSON.
 * Used by Browse sidebar checkboxes.
 */
export function useItemsByAdvertisers(names: string[]) {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (names.length === 0) { setItems([]); setLoading(false); return; }

    let cancelled = false;
    setLoading(true);

    const fetches = names.slice(0, 5).map(name => {
      const slug = name.replace(/\s+/g, '-');
      return fetch(`/data/adv/${encodeURIComponent(slug)}.json`)
        .then(r => r.ok ? r.json() : [])
        .catch(() => []);
    });

    Promise.all(fetches).then(results => {
      if (cancelled) return;
      const seen = new Set<string>();
      const merged: ProductItem[] = [];
      for (const batch of results) {
        for (const item of batch) {
          if (hasUrl(item) && !seen.has(item.id)) {
            seen.add(item.id);
            merged.push(item);
          }
        }
      }
      setItems(merged);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [names.join(',')]);

  return { items, loading };
}
