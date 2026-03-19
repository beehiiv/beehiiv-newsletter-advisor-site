import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SubmitCTA from '../components/SubmitCTA';
import { TOP_ADVERTISERS, useAdvertiserDetails, getTotalCount, CURATED_PRODUCTS, shouldCropLogo, getLogoStyle, type AdvertiserDetail } from '../data-layer';
import { Search, ArrowRight, X, SlidersHorizontal } from 'lucide-react';
import LogoTicker from '../components/LogoTicker';
import CustomSelect from '../components/CustomSelect';
import FilterLabel from '../components/FilterLabel';
import TruncatedText from '../components/TruncatedText';

const Advertisers: React.FC = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'featured' | 'recently-added' | 'most-ads' | 'a-z' | 'z-a'>('featured');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const { advertisers: importedAdvertisers, loading: advLoading } = useAdvertiserDetails();

  // Merge curated product advertisers into the imported advertiser details
  const allAdvertisers = useMemo(() => {
    const map = new Map<string, AdvertiserDetail>();
    for (const adv of importedAdvertisers) {
      map.set(adv.name, { ...adv });
    }
    // Add curated products' advertisers (they have tags)
    for (const p of CURATED_PRODUCTS) {
      for (const adv of p.advertisers || []) {
        const existing = map.get(adv.name);
        if (existing) {
          // Merge tags from curated
          const tagSet = new Set(existing.tags || []);
          (p.tags || []).forEach(t => tagSet.add(t));
          existing.tags = Array.from(tagSet).sort();
          // Use curated logo if imported has none
          if (!existing.logoUrl && adv.logo && adv.logo.startsWith('http')) existing.logoUrl = adv.logo;
          if (!existing.logoUrl && adv.url) {
            try { existing.logoUrl = `https://www.google.com/s2/favicons?domain=${new URL(adv.url).hostname}&sz=128`; } catch {}
          }
        } else {
          let logoUrl = (adv.logo && adv.logo.startsWith('http')) ? adv.logo : '';
          if (!logoUrl && adv.url) {
            try { logoUrl = `https://www.google.com/s2/favicons?domain=${new URL(adv.url).hostname}&sz=128`; } catch {}
          }
          map.set(adv.name, { name: adv.name, count: 1, logoUrl, url: adv.url || '', tags: [...(p.tags || [])], latestDate: p.date || '' });
        }
      }
    }
    return Array.from(map.values());
  }, [importedAdvertisers]);
  const [totalAds, setTotalAds] = useState(CURATED_PRODUCTS.length);

  useEffect(() => {
    getTotalCount().then(setTotalAds);
  }, []);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    allAdvertisers.forEach(adv => (adv.tags || []).forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [allAdvertisers]);

  const getTagCount = (tag: string) => allAdvertisers.filter(adv => (adv.tags || []).includes(tag)).length;

  const filteredAdvertisers = useMemo(() => {
    let result = [...allAdvertisers];
    if (selectedTags.length > 0) {
      result = result.filter(adv => selectedTags.some(t => (adv.tags || []).includes(t)));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(adv => adv.name.toLowerCase().includes(q));
    }
    switch (sortOption) {
      case 'featured':
        result.sort((a, b) => {
          const aIdx = TOP_ADVERTISERS.indexOf(a.name);
          const bIdx = TOP_ADVERTISERS.indexOf(b.name);
          const aRank = aIdx === -1 ? TOP_ADVERTISERS.length : aIdx;
          const bRank = bIdx === -1 ? TOP_ADVERTISERS.length : bIdx;
          if (aRank !== bRank) return aRank - bRank;
          return a.name.localeCompare(b.name);
        });
        break;
      case 'recently-added':
        result.sort((a, b) => (b.latestDate || '').localeCompare(a.latestDate || ''));
        break;
      case 'most-ads':
        result.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
        break;
      case 'a-z':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'z-a':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }
    return result;
  }, [allAdvertisers, selectedTags, searchQuery, sortOption]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="relative isolate px-6 lg:px-8 pt-10 md:pt-20 pb-10 min-h-[200px] flex items-center justify-center bg-white">
          <div className="max-w-[1280px] mx-auto w-full text-center">
            <div className="z-10 max-w-4xl mx-auto">
              <h1 className="font-display text-5xl sm:text-7xl md:text-8xl font-bold text-gray-900 mb-6 uppercase leading-none tracking-normal antialiased">
                Newsletter Advertisers
              </h1>
              <p className="mt-6 text-lg md:text-xl leading-relaxed text-gray-500 font-normal mx-auto max-w-2xl">
                Discover the brands running ads across top newsletters. See real examples of how they advertise.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                <Link
                  to="/browse"
                  className="w-full sm:w-auto rounded-[6px] bg-brand-button border-2 border-transparent px-8 py-3.5 text-[16px] font-medium tracking-normal text-white text-center flex items-center justify-center gap-2 btn-stack"
                >
                  Browse All {totalAds.toLocaleString()} Ads <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="https://www.beehiiv.com/i-want-to/advertise"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto rounded-[6px] bg-transparent border-2 border-gray-900 px-8 py-3.5 text-[16px] font-medium tracking-normal text-gray-900 text-center btn-stack"
                >
                  Start Advertising
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto -mt-10 pb-2 md:pb-14">
          <LogoTicker />
        </div>

        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 pt-0 pb-12">
          <div className={`grid grid-cols-1 ${allTags.length > 0 ? 'lg:grid-cols-[180px_1fr]' : ''} gap-8 lg:gap-8`}>

            {/* Left Column: Category Filters */}
            {allTags.length > 0 && (
              <div className="flex flex-col gap-8">
                <div className="hidden lg:block sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-thin space-y-6 pr-3">
                  <div>
                    <h3 className="text-lg font-bold font-sans tracking-normal mb-4 text-gray-900">Categories</h3>
                    <div className="space-y-3">
                      {allTags.map(tag => (
                        <FilterLabel key={tag} name={tag} count={getTagCount(tag)} checked={selectedTags.includes(tag)} onChange={() => toggleTag(tag)} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Right Content */}
            <div>
              {/* Search + Sort + Count */}
              <div className="flex flex-row gap-3 mb-6">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search advertisers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-transparent border border-gray-200 rounded-[6px] text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-colors"
                  />
                </div>
                <CustomSelect
                  value={sortOption}
                  onChange={(val) => setSortOption(val as any)}
                  options={[
                    { value: 'featured', label: 'Featured' },
                    { value: 'recently-added', label: 'Recently Added' },
                    { value: 'most-ads', label: 'Most Ads' },
                    { value: 'a-z', label: 'A-Z' },
                    { value: 'z-a', label: 'Z-A' },
                  ]}
                  className="w-[200px] shrink-0"
                />
              </div>

              {!advLoading && (
                <p className="text-sm text-gray-500 mb-4">
                  {filteredAdvertisers.length.toLocaleString()} {filteredAdvertisers.length === 1 ? 'advertiser' : 'advertisers'}
                </p>
              )}

              {advLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-[6px] p-6 flex flex-col justify-between animate-pulse">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded bg-gray-200 shrink-0" />
                        <div className="h-5 bg-gray-200 rounded w-32" />
                      </div>
                      <div className="h-10 bg-gray-100 rounded-[6px]" />
                    </div>
                  ))}
                </div>
              ) : filteredAdvertisers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAdvertisers.map(adv => (
                    <div
                      key={adv.name}
                      className="bg-white border border-gray-200 rounded-[6px] p-6 flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-3 mb-6 min-w-0">
                        {adv.logoUrl && adv.logoUrl.startsWith('http') && <img src={adv.logoUrl} alt={adv.name} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} className={`w-8 h-8 rounded shrink-0 ${shouldCropLogo(adv.name) ? 'object-cover' : 'object-contain'}`} style={getLogoStyle(adv.name)} />}
                        <Link to={`/advertisers/${adv.name.replace(/\s+/g, '-')}`} className="group flex items-center gap-1.5 min-w-0">
                          <TruncatedText text={adv.name} as="h3" className="text-xl font-bold text-gray-900 font-display uppercase group-hover:underline" />
                        </Link>
                      </div>
                      <Link
                        to={`/advertisers/${adv.name.replace(/\s+/g, '-')}`}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-900 border border-gray-200 rounded-[6px] hover:bg-gray-100 hover:border-gray-400 transition-all"
                      >
                        Browse {adv.count.toLocaleString()} {adv.count === 1 ? 'ad' : 'ads'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-32 bg-gray-50 rounded-[6px] border border-gray-200">
                  <p className="text-xl text-gray-500 font-medium">
                    No advertisers found.
                  </p>
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
                  onClick={() => { setSelectedTags([]); setSearchQuery(''); }}
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
                value={sortOption}
                onChange={(val) => setSortOption(val as any)}
                dropUp
                options={[
                  { value: 'featured', label: 'Featured' },
                  { value: 'recently-added', label: 'Recently Added' },
                  { value: 'most-ads', label: 'Most Ads' },
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
            {selectedTags.length > 0 && (
              <span className="w-5 h-5 bg-white text-gray-900 rounded-full text-xs flex items-center justify-center font-bold">
                {selectedTags.length}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default Advertisers;
