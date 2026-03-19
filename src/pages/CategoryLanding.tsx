import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SubmitCTA from '../components/SubmitCTA';
import ProductCard from '../components/ProductCard';
import { CURATED_PRODUCTS as PRODUCTS, getTotalCount, featuredSort, useProductsByTag, useAllFilters } from '../data-layer';
import { ArrowRight, Search, X, SlidersHorizontal } from 'lucide-react';
import LogoTicker from '../components/LogoTicker';
import CustomSelect from '../components/CustomSelect';
import FilterLabel from '../components/FilterLabel';

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'AI': 'Browse our curated collection of the best AI newsletter ad examples to inspire your next campaign.',
  'Finance': 'Explore top-performing finance newsletter ads from the best brands in the industry.',
  'Technology': 'Discover the best technology newsletter ad examples from leading tech companies.',
  'Health': 'Find inspiration from the best health and wellness newsletter ad campaigns.',
  'Lifestyle': 'Browse curated lifestyle newsletter ads that engage and convert readers.',
  'Marketing': 'See how top brands advertise in marketing newsletters with these standout examples.',
  'Creativity': 'Get inspired by the best creative newsletter ad designs and campaigns.',
  'Crypto': 'Explore the best cryptocurrency and Web3 newsletter ad examples.',
  'Business': 'Discover top B2B and business newsletter ad examples from leading brands.',
  'E-commerce': 'Browse the best e-commerce and retail newsletter ad campaigns.',
  'Education': 'Find inspiration from top education and learning newsletter ad examples.',
  'Productivity': 'See the best productivity tool newsletter ads that drive results.',
  'Startups': 'Explore standout startup newsletter ad examples from emerging brands.',
  'Media': 'Discover the best media and publishing newsletter ad campaigns.',
  'SaaS': 'Browse the best SaaS and software newsletter ad examples from top companies.',
  'Investing': 'Explore the best investing and wealth-building newsletter ad examples.',
  'Sports': 'Discover top sports and fitness newsletter ad campaigns from leading brands.',
  'Food & Beverage': 'Browse the best food and beverage newsletter ad examples.',
  'Travel': 'Find inspiration from the best travel newsletter ad campaigns.',
  'Real Estate': 'Explore top real estate newsletter ad examples from leading companies.',
  'Entertainment': 'Discover the best entertainment newsletter ad campaigns.',
  'Newsletter': 'Browse newsletter ad examples from across the industry.',
  'News': 'Explore the best news newsletter ad examples and campaigns.',
  'Careers': 'Discover top career and job newsletter ad examples.',
};

const CategoryLanding: React.FC = () => {
  const { tag: tagParam } = useParams<{ tag: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'featured' | 'recent' | 'newest' | 'oldest' | 'alphabetical' | 'z-a'>('featured');
  const [selectedAdvertisers, setSelectedAdvertisers] = useState<string[]>([]);
  const [selectedPublishers, setSelectedPublishers] = useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const browseButtonRef = useRef<HTMLAnchorElement>(null);
  const [totalCount, setTotalCount] = useState(PRODUCTS.length);

  const { tags: allKnownTags } = useAllFilters();

  useEffect(() => {
    getTotalCount().then(setTotalCount);
  }, []);

  // Find the actual tag name from tags.json (case-insensitive match)
  const matchedTag = useMemo(() => {
    if (!tagParam) return null;
    const normalize = (s: string) => s.toLowerCase().replace(/-/g, '');
    return allKnownTags.find(t => normalize(t) === normalize(tagParam)) || null;
  }, [tagParam, allKnownTags]);

  // Load products from pre-built per-tag JSON (single request)
  const { products: tagProducts, loading: productsLoading } = useProductsByTag(matchedTag || '');

  const categoryProducts = useMemo(() => {
    if (!matchedTag) return [];
    const curated = PRODUCTS.filter(p => p.tags?.includes(matchedTag));
    return [...curated, ...tagProducts];
  }, [matchedTag, tagProducts]);

  // Advertisers and publishers within this category
  const allAdvertisers = useMemo(() => {
    return Array.from(new Set(categoryProducts.flatMap(c => (c.advertisers || []).map(a => a.name)))).sort();
  }, [categoryProducts]);

  const allPublishers = useMemo(() => {
    return Array.from(new Set(categoryProducts.map(c => c.publisher?.name || c.author).filter(Boolean))).sort();
  }, [categoryProducts]);

  // Unique advertiser logos for the ticker
  const categoryLogos = useMemo(() => {
    const seen = new Set<string>();
    const logos: { alt: string; src: string }[] = [];
    for (const p of categoryProducts) {
      for (const adv of p.advertisers || []) {
        if (seen.has(adv.name)) continue;
        seen.add(adv.name);
        let src = (adv.logo && adv.logo.startsWith('http')) ? adv.logo : '';
        if (!src && adv.url) {
          try {
            src = `https://www.google.com/s2/favicons?domain=${new URL(adv.url).hostname}&sz=128`;
          } catch {}
        }
        if (src) logos.push({ alt: adv.name, src });
      }
    }
    return logos;
  }, [categoryProducts]);

  const handleButtonTouch = () => {
    if (browseButtonRef.current) {
      browseButtonRef.current.classList.add('active');
      setTimeout(() => {
        browseButtonRef.current?.classList.remove('active');
      }, 300);
    }
  };

  const toggleAdvertiser = (adv: string) => {
    setSelectedAdvertisers(prev =>
      prev.includes(adv) ? prev.filter(a => a !== adv) : [...prev, adv]
    );
  };

  const togglePublisher = (pub: string) => {
    setSelectedPublishers(prev =>
      prev.includes(pub) ? prev.filter(p => p !== pub) : [...prev, pub]
    );
  };

  const getAdvertiserCount = (adv: string) => categoryProducts.filter(c => c.advertisers?.some(a => a.name === adv)).length;
  const getPublisherCount = (pub: string) => categoryProducts.filter(c => (c.publisher?.name || c.author) === pub).length;

  const filteredProducts = useMemo(() => {
    let result = [...categoryProducts].reverse();

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.advertisers?.some(a => a.name.toLowerCase().includes(query)) ||
        c.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (selectedAdvertisers.length > 0) {
      result = result.filter(c =>
        c.advertisers && selectedAdvertisers.some(adv => c.advertisers!.some(a => a.name === adv))
      );
    }

    if (selectedPublishers.length > 0) {
      result = result.filter(c => {
        const pub = c.publisher?.name || c.author;
        return selectedPublishers.includes(pub);
      });
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
        result.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        break;
      case 'alphabetical':
        result.sort((a, b) => (a.advertisers?.[0]?.name || '').localeCompare(b.advertisers?.[0]?.name || ''));
        break;
      case 'z-a':
        result.sort((a, b) => (b.advertisers?.[0]?.name || '').localeCompare(a.advertisers?.[0]?.name || ''));
        break;
    }

    return result;
  }, [categoryProducts, searchQuery, selectedAdvertisers, selectedPublishers, sortOption]);

  if (!matchedTag) {
    if (productsLoading) return null;
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-900 text-center">
        <div>
          <h1 className="text-3xl font-display font-bold mb-4">Category not found</h1>
          <Link to="/" className="text-brand-accent font-bold">Go Home</Link>
        </div>
      </div>
    );
  }

  const description = CATEGORY_DESCRIPTIONS[matchedTag] || `Browse our curated collection of the best ${matchedTag.toLowerCase()} newsletter ad examples.`;

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <div className="relative isolate px-6 lg:px-8 pt-10 md:pt-20 pb-0 min-h-[300px] flex items-center justify-center bg-white">
          <div className="max-w-[1280px] mx-auto w-full text-center">
            <div className="z-10 max-w-4xl mx-auto animate-in fade-in duration-1000">
              <h1 className="font-display text-5xl sm:text-7xl md:text-8xl font-bold text-gray-900 mb-6 uppercase leading-none tracking-normal antialiased">
                <span className="inline-block animate-fade-slide-right" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>Best</span>{' '}
                <span className="inline-block animate-fade-slide-right bg-gradient-to-r from-brand-accent to-[#2563eb] bg-clip-text text-transparent" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>{matchedTag}</span><br />
                <span className="inline-block animate-fade-slide-right" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>Newsletter Ads</span>
              </h1>
              <p className="mt-6 text-lg md:text-xl leading-relaxed text-gray-500 font-normal mx-auto max-w-2xl">
                {description}
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                <Link
                  ref={browseButtonRef}
                  to="/browse"
                  className="w-full sm:w-auto rounded-[6px] bg-brand-button border-2 border-transparent px-8 py-3.5 text-[16px] font-medium tracking-normal text-white text-center flex items-center justify-center gap-2 btn-stack"
                  onTouchStart={handleButtonTouch}
                >
                  Browse All {totalCount.toLocaleString()} Ads <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/advertisers"
                  className="w-full sm:w-auto rounded-[6px] bg-transparent border-2 border-gray-900 px-8 py-3.5 text-[16px] font-medium tracking-normal text-gray-900 text-center btn-stack"
                >
                  Browse Advertisers
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto pb-2">
          <LogoTicker logos={categoryLogos} grayscale />
        </div>

        {/* Main Grid Section */}
        <div className="max-w-[1280px] mx-auto w-full px-6 lg:px-8 pt-4 lg:pt-8 pb-12 lg:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 lg:gap-8">

            {/* Left Column: Filters */}
            <div className="flex flex-col gap-8">
              <div className="hidden lg:block sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-thin space-y-6 pr-3">
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

                {allPublishers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold font-sans tracking-normal mb-4 text-gray-900">Publishers</h3>
                    <div className="space-y-3">
                      {allPublishers.map(pub => (
                        <FilterLabel key={pub} name={pub} count={getPublisherCount(pub)} checked={selectedPublishers.includes(pub)} onChange={() => togglePublisher(pub)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Content - Search + Grid */}
            <div>
              {/* Header: Search + Sort */}
              <div className="flex flex-row gap-3 mb-3 md:mb-8 w-full">
                <div className="relative flex-1 min-w-0 hidden md:block">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Search className="w-5 h-5 text-gray-500" />
                  </div>
                  <input
                    type="text"
                    placeholder="Filter by advertiser, publisher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border border-gray-200 rounded-[6px] py-3 pl-12 pr-4 text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
                  />
                </div>

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
                  className="w-full md:w-[200px] shrink-0"
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
                          onClick={() => { setSelectedAdvertisers([]); setSelectedPublishers([]); setSearchQuery(''); }}
                          className="text-sm text-gray-500 underline hover:text-gray-900"
                        >
                          Reset
                        </button>
                        <button onClick={() => setShowMobileFilters(false)} className="p-1 text-gray-500 hover:text-gray-900"><X className="w-5 h-5" /></button>
                      </div>
                    </div>
                    <div className="space-y-3">
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
                        value={selectedPublishers.length === 1 ? selectedPublishers[0] : ''}
                        onChange={(val) => setSelectedPublishers(val ? [val] : [])}
                        placeholder="All Publishers"
                        dropUp
                        options={[
                          { value: '', label: 'All Publishers' },
                          ...allPublishers.map(pub => ({ value: pub, label: pub })),
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
              {(selectedAdvertisers.length > 0 || selectedPublishers.length > 0 || searchQuery) && (
                <div className="mb-6 flex flex-wrap items-center gap-2">
                  {selectedAdvertisers.map(adv => (
                    <span key={adv} className="px-3 py-1 rounded-[6px] bg-brand-accent/20 text-gray-900 text-sm font-bold flex items-center gap-2 border border-brand-accent/30">
                      {adv}
                      <button onClick={() => toggleAdvertiser(adv)} className="hover:text-brand-accent"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                  {selectedPublishers.map(pub => (
                    <span key={pub} className="px-3 py-1 rounded-[6px] bg-brand-button/20 text-gray-900 text-sm font-bold flex items-center gap-2 border border-brand-button/30">
                      {pub}
                      <button onClick={() => togglePublisher(pub)} className="hover:text-brand-accent"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                  <button
                    onClick={() => { setSelectedAdvertisers([]); setSelectedPublishers([]); setSearchQuery(''); }}
                    className="text-sm text-gray-500 underline hover:text-gray-900 ml-2"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {/* Results count */}
              <p className="text-sm text-gray-500 mb-4">
                {filteredProducts.length.toLocaleString()} {filteredProducts.length === 1 ? 'ad' : 'ads'}
              </p>

              {/* Products Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((item) => (
                  <ProductCard key={item.id} item={item} linkSuffix={matchedTag ? `?tag=${encodeURIComponent(matchedTag)}` : ''} />
                ))}
              </div>

              {filteredProducts.length === 0 && !productsLoading && (
                <div className="text-center py-32 bg-gray-50 rounded-[6px] border border-gray-200">
                  <p className="text-xl text-gray-500 font-medium">No ads found.</p>
                  <button
                    onClick={() => { setSelectedAdvertisers([]); setSelectedPublishers([]); setSearchQuery(''); }}
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

      {/* SEO Footer */}
      <div className="max-w-[1280px] mx-auto px-6 lg:px-8 pb-12">
        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-2xl font-display font-bold text-gray-900 mb-4">Best {matchedTag.toLowerCase()} newsletter ads</h2>
          <p className="text-gray-500 leading-relaxed mb-6">
            Browse {filteredProducts.length.toLocaleString()} curated {matchedTag.toLowerCase()} newsletter ad examples from top brands. Find inspiration for your next {matchedTag.toLowerCase()} advertising campaign across the best newsletters in the industry.
          </p>
          {allAdvertisers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allAdvertisers.slice(0, 20).map(adv => (
                <Link key={adv} to={`/advertisers/${adv.replace(/\s+/g, '-')}`} className="text-sm text-gray-400 hover:text-gray-900 hover:underline transition-colors">
                  {adv} newsletter ad examples
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

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
            {(selectedAdvertisers.length > 0 || selectedPublishers.length > 0) && (
              <span className="w-5 h-5 bg-white text-gray-900 rounded-full text-xs flex items-center justify-center font-bold">
                {selectedAdvertisers.length + selectedPublishers.length}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default CategoryLanding;
