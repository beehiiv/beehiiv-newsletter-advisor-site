import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SubmitCTA from '../components/SubmitCTA';
import ProductCard from '../components/ProductCard';
import { CURATED_PRODUCTS, useProducts, useAllFilters, featuredSort, useOldestItems, useSearchByEntity, useItemsByAdvertisers, useItemsByTags } from '../data-layer';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import FilterLabel from '../components/FilterLabel';

const PRODUCTS = CURATED_PRODUCTS;

const Browse: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSearch = searchParams.get('search') || '';
  const initialTag = searchParams.get('tag') || '';

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortOption, setSortOption] = useState<'featured' | 'recent' | 'newest' | 'oldest' | 'alphabetical' | 'z-a'>('featured');
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTag ? [initialTag] : []);
  const [selectedAdvertisers, setSelectedAdvertisers] = useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { importedItems, loading: importedLoading, loadMore, hasMore, totalCount } = useProducts();
  const { items: oldestItems, loading: oldestLoading } = useOldestItems(sortOption === 'oldest');
  const { advertisers: allAdvertisers, tags: allTags, advertiserCounts, tagCounts } = useAllFilters();
  const { items: searchItems, loading: searchLoading } = useSearchByEntity(searchQuery, allAdvertisers, allTags);
  const { items: advFilterItems, loading: advFilterLoading } = useItemsByAdvertisers(selectedAdvertisers);
  const { items: tagFilterItems, loading: tagFilterLoading } = useItemsByTags(selectedTags);

  // Cap at 20 pages (10K items) for performance
  const MAX_BROWSE_PAGES = 20;
  const handleLoadMore = useCallback(() => {
    if (!importedLoading && hasMore && importedItems.length < MAX_BROWSE_PAGES * 500) loadMore();
  }, [importedLoading, hasMore, loadMore, importedItems.length]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) handleLoadMore(); },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleLoadMore]);

  useEffect(() => {
    const tagParam = searchParams.get('tag');
    if (tagParam) {
      setSelectedTags(prev => prev.includes(tagParam) ? prev : [tagParam]);
    }
  }, [searchParams]);

  const handleTagSelect = (tag: string) => {
    if (tag === 'All') {
      setSelectedTags([]);
      setSearchParams({});
    } else {
      setSelectedTags([tag]);
      setSearchParams({ tag });
    }
  };

  // Combine curated + imported into one pool
  // When sorting by oldest, use pre-sorted oldest.json instead
  const allItems = useMemo(() => {
    if (sortOption === 'oldest' && oldestItems.length > 0) {
      return oldestItems;
    }
    const curated = [...PRODUCTS].reverse();
    return [...curated, ...importedItems];
  }, [importedItems, sortOption, oldestItems]);

  const filteredProducts = useMemo(() => {
    // When searching (3+ chars), use results from pre-built JSON files
    const isSearching = searchQuery.trim().length >= 3;
    // When advertisers selected via sidebar, use pre-built advertiser JSON
    const hasAdvFilter = selectedAdvertisers.length > 0;
    // When tags selected via sidebar, use pre-built tag JSON
    const hasTagFilter = selectedTags.length > 0;

    let result: typeof allItems;
    if (isSearching) {
      result = [...searchItems];
    } else if (hasAdvFilter && hasTagFilter) {
      // Both filters: use tag data, then filter to matching advertisers
      const advSet = new Set(selectedAdvertisers);
      result = tagFilterItems.filter(item =>
        item.advertisers?.some(a => advSet.has(a.name))
      );
    } else if (hasAdvFilter) {
      result = [...advFilterItems];
    } else if (hasTagFilter) {
      result = [...tagFilterItems];
    } else {
      result = [...allItems];
    }

    if (isSearching && selectedTags.length > 0) {
      result = result.filter(c =>
        c.tags && selectedTags.some(tag => c.tags?.includes(tag))
      );
    }

    switch (sortOption) {
      case 'featured':
        if (result.length > 2000) {
          const head = featuredSort(result.slice(0, 2000));
          result = [...head, ...result.slice(2000)];
        } else {
          result = featuredSort(result);
        }
        break;
      case 'recent':
        result.reverse();
        break;
      case 'newest':
        result.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        break;
      case 'oldest':
        // Already pre-sorted from oldest.json; only client-sort as fallback
        if (!oldestItems.length) {
          result.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        }
        break;
      case 'alphabetical':
        result.sort((a, b) => (a.advertisers?.[0]?.name || '').localeCompare(b.advertisers?.[0]?.name || ''));
        break;
      case 'z-a':
        result.sort((a, b) => (b.advertisers?.[0]?.name || '').localeCompare(a.advertisers?.[0]?.name || ''));
        break;
    }

    return result;
  }, [allItems, searchItems, advFilterItems, tagFilterItems, searchQuery, selectedTags, selectedAdvertisers, sortOption]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const getCount = (tag: string) => tagCounts[tag] || 0;

  const toggleAdvertiser = (adv: string) => {
    setSelectedAdvertisers(prev =>
      prev.includes(adv) ? prev.filter(a => a !== adv) : [...prev, adv]
    );
  };

  const getAdvertiserCount = (adv: string) => advertiserCounts[adv] || 0;

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <Header onTagSelect={handleTagSelect} />

      <main className="flex-1 max-w-[1280px] mx-auto w-full px-6 lg:px-8 py-4 lg:py-16">

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 lg:gap-8">

          {/* Left Column: Filters */}
          <div className="flex flex-col gap-8">
            {/* Left Sidebar - Filters (Hidden on Mobile) */}
            <div className="hidden lg:block sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-thin space-y-6 pr-3">
              <div>
                <h3 className="text-lg font-bold font-sans tracking-normal mb-4 text-gray-900">Categories</h3>
                <div className="space-y-3">
                  {allTags.map(tag => (
                    <FilterLabel key={tag} name={tag} count={getCount(tag)} checked={selectedTags.includes(tag)} onChange={() => toggleTag(tag)} />
                  ))}
                  {allTags.length === 0 && (
                    <p className="text-gray-500 text-sm italic">No tags available.</p>
                  )}
                </div>
              </div>

              {allAdvertisers.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold font-sans tracking-normal mb-4 text-gray-900">Advertisers</h3>
                  <div className="space-y-3">
                    {allAdvertisers.map(adv => (
                      <FilterLabel key={adv} name={adv} count={getAdvertiserCount(adv)} checked={selectedAdvertisers.includes(adv)} onChange={() => toggleAdvertiser(adv)} />
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Right Content - Search + Grid */}
          <div>

            {/* Header: Search + Sort (hidden on mobile, use floating filters instead) */}
            <div className="hidden md:flex flex-row gap-3 mb-8 w-full">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-0">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <Search className="w-5 h-5 text-gray-500" />
                </div>
                <input
                  type="text"
                  placeholder="Filter by advertiser, category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border border-gray-200 rounded-[6px] py-3 pl-12 pr-4 text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
                />
              </div>

              {/* Category Dropdown */}
              <CustomSelect
                value={selectedTags.length === 1 ? selectedTags[0] : ''}
                onChange={(val) => {
                  if (val) {
                    setSelectedTags([val]);
                    setSearchParams({ tag: val });
                  } else {
                    setSelectedTags([]);
                    setSearchParams({});
                  }
                }}
                placeholder="All Categories"
                options={[
                  { value: '', label: 'All Categories' },
                  ...allTags.map(tag => ({ value: tag, label: tag })),
                ]}
                className="w-[200px] shrink-0"
              />

              {/* Sort Dropdown */}
              <CustomSelect
                value={sortOption}
                onChange={(val) => setSortOption(val as any)}
                options={[
                  { value: 'featured', label: 'Featured' },
                  { value: 'recent', label: 'Recently Added' },
                  { value: 'newest', label: 'Newest' },
                  { value: 'oldest', label: 'Oldest' },
                  { value: 'alphabetical', label: 'A-Z' },
                  { value: 'z-a', label: 'Z-A' },
                ]}
                className="w-[200px] shrink-0"
              />
            </div>

            {/* Mobile Floating Filters */}
            {showMobileFilters && (
              <div className="lg:hidden fixed inset-0 bg-black/20 z-50" onClick={() => setShowMobileFilters(false)}>
                <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 rounded-t-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-gray-900 uppercase">Filters</h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => { setSelectedTags([]); setSelectedAdvertisers([]); setSearchQuery(''); }}
                        className="text-sm text-gray-500 underline hover:text-gray-900"
                      >
                        Reset
                      </button>
                      <button onClick={() => setShowMobileFilters(false)} className="p-1 text-gray-500 hover:text-gray-900"><X className="w-5 h-5" /></button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Filter by advertiser, category..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-transparent border border-gray-200 rounded-[6px] text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-colors"
                      />
                    </div>
                    <CustomSelect
                      value={selectedTags.length === 1 ? selectedTags[0] : ''}
                      onChange={(val) => setSelectedTags(val ? [val] : [])}
                      placeholder="All Categories"
                      dropUp
                      options={[
                        { value: '', label: 'All Categories' },
                        ...allTags.map(tag => ({ value: tag, label: tag })),
                      ]}
                    />
                    <CustomSelect
                      value={selectedAdvertisers.length === 1 ? selectedAdvertisers[0] : ''}
                      onChange={(val) => setSelectedAdvertisers(val ? [val] : [])}
                      placeholder="All Advertisers"
                      dropUp
                      options={[
                        { value: '', label: 'All Advertisers' },
                        ...allAdvertisers.map(adv => ({ value: adv, label: adv })),
                      ]}
                    />
                    <CustomSelect
                      value={sortOption}
                      onChange={(val) => setSortOption(val as any)}
                      dropUp
                      options={[
                        { value: 'featured', label: 'Featured' },
                        { value: 'recent', label: 'Recently Added' },
                        { value: 'newest', label: 'Newest' },
                        { value: 'oldest', label: 'Oldest' },
                        { value: 'alphabetical', label: 'A-Z' },
                        { value: 'z-a', label: 'Z-A' },
                      ]}
                    />
                  </div>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="w-full py-3 bg-gray-900 text-white font-medium rounded-[6px] hover:bg-gray-800 transition-colors"
                  >
                    Show Results
                  </button>
                </div>
              </div>
            )}

            {/* Active Filters Display */}
            {(selectedTags.length > 0 || selectedAdvertisers.length > 0 || searchQuery) && (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                {selectedTags.map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-[6px] bg-gray-100 text-gray-900 text-sm font-bold flex items-center gap-2 border border-gray-200">
                    {tag}
                    <button onClick={() => toggleTag(tag)} className="hover:text-brand-accent"><X className="w-3 h-3" /></button>
                  </span>
                ))}
                {selectedAdvertisers.map(adv => (
                  <span key={adv} className="px-3 py-1 rounded-[6px] bg-brand-accent/20 text-gray-900 text-sm font-bold flex items-center gap-2 border border-brand-accent/30">
                    {adv}
                    <button onClick={() => toggleAdvertiser(adv)} className="hover:text-brand-accent"><X className="w-3 h-3" /></button>
                  </span>
                ))}
                <button
                  onClick={() => { setSelectedTags([]); setSelectedAdvertisers([]); setSearchQuery(''); }}
                  className="text-sm text-gray-500 underline hover:text-gray-900 ml-2"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Results count */}
            <p className="text-sm text-gray-500 mb-4 hidden md:block">
              {(() => {
                const hasFilters = searchQuery.trim().length >= 3 || selectedTags.length > 0 || selectedAdvertisers.length > 0;
                const count = hasFilters ? filteredProducts.length : totalCount;
                return `${count.toLocaleString()} ${count === 1 ? 'ad' : 'ads'}`;
              })()}
            </p>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((item) => (
                <ProductCard key={item.id} item={item} />
              ))}
            </div>

            {filteredProducts.length === 0 && !importedLoading && (
              <div className="text-center py-32 bg-gray-50 rounded-[6px] border border-gray-200">
                <p className="text-xl text-gray-500 font-medium">No ads found.</p>
                <button
                  onClick={() => { setSelectedTags([]); setSearchQuery(''); }}
                  className="mt-4 text-brand-accent font-bold hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}

            {/* Infinite scroll sentinel (not needed for oldest sort - uses pre-loaded data) */}
            {hasMore && sortOption !== 'oldest' && <div ref={loadMoreRef} className="h-10" />}
            {(importedLoading || searchLoading || advFilterLoading || tagFilterLoading || (sortOption === 'oldest' && oldestLoading)) && (
              <div className="flex justify-center py-8">
                <div className="animate-pulse text-gray-400 text-sm">Loading more ads...</div>
              </div>
            )}

          </div>
        </div>
      </main>

      <SubmitCTA />
      <Footer />

      {/* Mobile Floating Filter Button */}
      {!showMobileFilters && (
        <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={() => setShowMobileFilters(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gray-900 text-white rounded-full text-sm font-medium shadow-lg hover:bg-gray-800 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {(selectedTags.length > 0 || selectedAdvertisers.length > 0) && (
              <span className="w-5 h-5 bg-white text-gray-900 rounded-full text-xs flex items-center justify-center font-bold">
                {selectedTags.length + selectedAdvertisers.length}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default Browse;
