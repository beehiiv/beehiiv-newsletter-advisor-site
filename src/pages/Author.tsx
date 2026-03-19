import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SubmitCTA from '../components/SubmitCTA';
import ProductCard from '../components/ProductCard';
import { useProductsByAuthor } from '../data-layer';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import FilterLabel from '../components/FilterLabel';

const Author: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const decodedName = decodeURIComponent(name || '');

  const [sortOption, setSortOption] = useState<'recent' | 'newest' | 'oldest' | 'a-z' | 'z-a'>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAdvertisers, setSelectedAdvertisers] = useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const { products: authorProducts, loading } = useProductsByAuthor(decodedName);

  const allTags = useMemo(() => {
    return Array.from(new Set(authorProducts.flatMap(p => p.tags || []))).sort();
  }, [authorProducts]);

  const allAdvertisers = useMemo(() => {
    return Array.from(new Set(authorProducts.flatMap(p => (p.advertisers || []).map(a => a.name)))).sort();
  }, [authorProducts]);

  const sortedProducts = useMemo(() => {
    let items = [...authorProducts];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(p =>
        p.advertisers?.some(a => a.name.toLowerCase().includes(query)) ||
        p.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        p.title.toLowerCase().includes(query)
      );
    }
    if (selectedTags.length > 0) {
      items = items.filter(p => p.tags && selectedTags.some(tag => p.tags?.includes(tag)));
    }
    if (selectedAdvertisers.length > 0) {
      items = items.filter(p => p.advertisers?.some(a => selectedAdvertisers.includes(a.name)));
    }
    switch (sortOption) {
      case 'newest': items.sort((a, b) => (b.date || '').localeCompare(a.date || '')); break;
      case 'oldest': items.sort((a, b) => (a.date || '').localeCompare(b.date || '')); break;
      case 'a-z': items.sort((a, b) => a.title.localeCompare(b.title)); break;
      case 'z-a': items.sort((a, b) => b.title.localeCompare(a.title)); break;
    }
    return items;
  }, [authorProducts, searchQuery, selectedTags, selectedAdvertisers, sortOption]);

  const publisherLogo = useMemo(() => {
    const pub = authorProducts.find(p => p.publisher?.logo)?.publisher;
    return pub?.logo || null;
  }, [authorProducts]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const toggleAdvertiser = (adv: string) => {
    setSelectedAdvertisers(prev => prev.includes(adv) ? prev.filter(a => a !== adv) : [...prev, adv]);
  };

  const getTagCount = (tag: string) => authorProducts.filter(p => p.tags?.includes(tag)).length;
  const getAdvCount = (adv: string) => authorProducts.filter(p => p.advertisers?.some(a => a.name === adv)).length;

  if (loading && authorProducts.length === 0) return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 pt-10 pb-4 lg:pt-16 lg:pb-6 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg bg-gray-200 shrink-0" />
            <div className="h-10 bg-gray-200 rounded w-64" />
          </div>
        </div>
        <div className="max-w-[1280px] mx-auto w-full px-6 lg:px-8 pt-4 lg:pt-8 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-[6px] overflow-hidden">
                <div className="w-full aspect-[4/3] bg-gray-100" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );

  if (!loading && authorProducts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-900 text-center">
        <div>
          <h1 className="text-3xl font-display font-bold mb-4">Publisher not found</h1>
          <Link to="/browse" className="text-brand-accent font-bold">Browse Ads</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="bg-white">
          <div className="max-w-[1280px] mx-auto px-6 lg:px-8 pt-10 pb-4 lg:pt-16 lg:pb-6">
            <div className="flex items-center gap-4">
              {publisherLogo && <img src={publisherLogo} alt="" className="w-12 h-12 md:w-16 md:h-16 rounded-lg object-contain shrink-0" />}
              <h1 className="text-4xl md:text-6xl font-display font-bold text-gray-900 uppercase tracking-normal">{decodedName}</h1>
            </div>
          </div>
        </div>

        <div className="max-w-[1280px] mx-auto w-full px-6 lg:px-8 pt-4 lg:pt-8 pb-12 lg:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 lg:gap-8">
            {/* Left Column: Filters */}
            <div className="flex flex-col gap-8">
              <div className="hidden lg:block sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-thin space-y-6 pr-3">
                {allTags.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold font-sans tracking-normal mb-4 text-gray-900">Categories</h3>
                    <div className="space-y-3">
                      {allTags.map(tag => (
                        <FilterLabel key={tag} name={tag} count={getTagCount(tag)} checked={selectedTags.includes(tag)} onChange={() => toggleTag(tag)} />
                      ))}
                    </div>
                  </div>
                )}
                {allAdvertisers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold font-sans tracking-normal mb-4 text-gray-900">Advertisers</h3>
                    <div className="space-y-3">
                      {allAdvertisers.map(adv => (
                        <FilterLabel key={adv} name={adv} count={getAdvCount(adv)} checked={selectedAdvertisers.includes(adv)} onChange={() => toggleAdvertiser(adv)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Content */}
            <div>
              <div className="flex flex-row gap-3 mb-3 md:mb-8 w-full">
                <div className="relative flex-1 min-w-0 hidden md:block">
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
                <CustomSelect
                  value={sortOption}
                  onChange={(val) => setSortOption(val as any)}
                  options={[
                    { value: 'recent', label: 'Recently Added' },
                    { value: 'newest', label: 'Newest' },
                    { value: 'oldest', label: 'Oldest' },
                    { value: 'a-z', label: 'A-Z' },
                    { value: 'z-a', label: 'Z-A' },
                  ]}
                  className="w-full md:w-[200px] shrink-0"
                />
              </div>

              {/* Active Filters */}
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

              <p className="text-sm text-gray-500 mb-4">
                {sortedProducts.length.toLocaleString()} {sortedProducts.length === 1 ? 'ad' : 'ads'}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedProducts.map(item => (
                  <ProductCard key={item.id} item={item} />
                ))}
              </div>

              {sortedProducts.length === 0 && (
                <div className="text-center py-32 bg-gray-50 rounded-[6px] border border-gray-200">
                  <p className="text-xl text-gray-500 font-medium">No ads found.</p>
                  <button
                    onClick={() => { setSelectedTags([]); setSelectedAdvertisers([]); setSearchQuery(''); }}
                    className="mt-4 text-brand-accent font-bold hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <SubmitCTA />
      <Footer />

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
              {allTags.length > 0 && (
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
              )}
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
                  { value: 'recent', label: 'Recently Added' },
                  { value: 'newest', label: 'Newest' },
                  { value: 'oldest', label: 'Oldest' },
                  { value: 'a-z', label: 'A-Z' },
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

      {/* Mobile Floating Filter Button */}
      {!showMobileFilters && (
        <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={() => setShowMobileFilters(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gray-900 text-white rounded-full text-sm font-medium shadow-lg hover:bg-gray-800 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {(selectedTags.length + selectedAdvertisers.length) > 0 && (
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

export default Author;
