import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SubmitCTA from '../components/SubmitCTA';
import ProductCard from '../components/ProductCard';
import { CURATED_PRODUCTS as PRODUCTS, useAdvertiserCount, useProductsByAdvertiser, getTotalCount, useAdvertiserDetails, shouldCropLogo, getLogoStyle } from '../data-layer';
import { Search, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

const Advertiser: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const slug = (name || '').toLowerCase();
  const [sortOption, setSortOption] = useState<'recent' | 'newest' | 'oldest' | 'a-z' | 'z-a'>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const advertiserCount = useAdvertiserCount();
  const [totalAds, setTotalAds] = useState(PRODUCTS.length);

  useEffect(() => {
    getTotalCount().then(setTotalAds);
  }, []);

  const { advertisers: allAdvertisers } = useAdvertiserDetails();
  const [advStaticCount, setAdvStaticCount] = useState(0);

  useEffect(() => {
    fetch('/data/advertisers.json')
      .then(res => res.json())
      .then((data: Record<string, number>) => {
        // Find the count for this advertiser by matching slug
        for (const [advName, count] of Object.entries(data)) {
          if (advName.toLowerCase().replace(/\s+/g, '-') === slug || advName === decodeURIComponent(name || '')) {
            setAdvStaticCount(count);
            break;
          }
        }
      })
      .catch(() => {});
  }, [slug, name]);

  // Decode name from slug - match against real advertiser names
  const decodedName = useMemo(() => {
    const raw = decodeURIComponent(name || '');
    // Try exact match against all known advertisers (from advertiser-details.json)
    for (const adv of allAdvertisers) {
      if (adv.name.toLowerCase().replace(/\s+/g, '-') === slug || adv.name === raw) {
        return adv.name;
      }
    }
    // Try curated products
    for (const p of PRODUCTS) {
      for (const a of p.advertisers || []) {
        if (a.name.toLowerCase().replace(/\s+/g, '-') === slug || a.name === raw) {
          return a.name;
        }
      }
    }
    // Fallback: title-case
    return raw.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }, [name, slug, allAdvertisers]);

  const { products: advertiserProducts, loading: productsLoading } = useProductsByAdvertiser(decodedName);

  const advertiserInfo = useMemo(() => {
    // First check advertiser-details.json (most reliable source)
    const details = allAdvertisers.find(a => a.name === decodedName);
    if (details && details.logoUrl) {
      return { url: details.url || null, logoUrl: details.logoUrl };
    }
    // Fallback: check post data
    for (const p of advertiserProducts) {
      const match = p.advertisers?.find(a => a.name === decodedName);
      if (match) {
        let logoUrl = '';
        if (match.logo && match.logo.startsWith('http')) {
          logoUrl = match.logo;
        } else if (match.url) {
          try {
            logoUrl = `https://www.google.com/s2/favicons?domain=${new URL(match.url).hostname}&sz=128`;
          } catch {}
        }
        return { url: match.url || null, logoUrl };
      }
    }
    return { url: null, logoUrl: '' };
  }, [decodedName, advertiserProducts, allAdvertisers]);

  // Prev/next advertiser navigation
  const { prevAdvSlug, nextAdvSlug } = useMemo(() => {
    if (!allAdvertisers.length || !decodedName) return { prevAdvSlug: null, nextAdvSlug: null };
    const sorted = [...allAdvertisers].sort((a, b) => b.count - a.count);
    const idx = sorted.findIndex(a => a.name === decodedName);
    if (idx === -1) return { prevAdvSlug: null, nextAdvSlug: null };
    const toSlug = (n: string) => n.replace(/\s+/g, '-');
    return {
      prevAdvSlug: idx > 0 ? toSlug(sorted[idx - 1].name) : null,
      nextAdvSlug: idx < sorted.length - 1 ? toSlug(sorted[idx + 1].name) : null,
    };
  }, [allAdvertisers, decodedName]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft' && prevAdvSlug) navigate(`/advertisers/${prevAdvSlug}`);
      if (e.key === 'ArrowRight' && nextAdvSlug) navigate(`/advertisers/${nextAdvSlug}`);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevAdvSlug, nextAdvSlug, navigate]);

  const publishers = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of advertiserProducts) {
      const name = p.publisher?.name;
      if (name) map.set(name, (map.get(name) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [advertiserProducts]);

  if (productsLoading && advertiserProducts.length === 0) return (
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

  if (!productsLoading && advertiserProducts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-900 text-center">
        <div>
          <h1 className="text-3xl font-display font-bold mb-4">Advertiser not found</h1>
          <Link to="/browse" className="text-brand-accent font-bold">Browse Ads</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <Header />
      {/* Desktop floating nav arrows */}
      {prevAdvSlug && (
        <Link
          to={`/advertisers/${prevAdvSlug}`}
          className="fixed left-[calc(50%-720px)] top-1/2 -translate-y-1/2 z-40 hidden xl:flex w-10 h-10 bg-white border border-gray-200 rounded-lg items-center justify-center shadow-lg hover:bg-gray-100 hover:border-gray-400 transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-gray-900" />
        </Link>
      )}
      {nextAdvSlug && (
        <Link
          to={`/advertisers/${nextAdvSlug}`}
          className="fixed right-[calc(50%-720px)] top-1/2 -translate-y-1/2 z-40 hidden xl:flex w-10 h-10 bg-white border border-gray-200 rounded-lg items-center justify-center shadow-lg hover:bg-gray-100 hover:border-gray-400 transition-all"
        >
          <ChevronRight className="w-5 h-5 text-gray-900" />
        </Link>
      )}
      {/* Mobile nav arrows — bottom center, side by side */}
      {(prevAdvSlug || nextAdvSlug) && (
        <div className="xl:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3">
          {prevAdvSlug && (
            <Link
              to={`/advertisers/${prevAdvSlug}`}
              className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-lg hover:bg-gray-100 hover:border-gray-400 transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-gray-900" />
            </Link>
          )}
          {nextAdvSlug && (
            <Link
              to={`/advertisers/${nextAdvSlug}`}
              className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-lg hover:bg-gray-100 hover:border-gray-400 transition-all"
            >
              <ChevronRight className="w-5 h-5 text-gray-900" />
            </Link>
          )}
        </div>
      )}
      <main className="flex-1">
        <div className="relative isolate px-6 lg:px-8 pt-10 md:pt-20 pb-4 md:pb-20 min-h-[200px] flex items-center justify-center bg-white">
          <div className="max-w-[1280px] mx-auto w-full text-center">
            <div className="z-10 max-w-4xl mx-auto">
              <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-bold text-gray-900 mb-6 uppercase leading-none tracking-normal antialiased">
                {(advStaticCount || advertiserProducts.length).toLocaleString()}
                {advertiserInfo.logoUrl && <img src={advertiserInfo.logoUrl} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} className={`inline w-[0.85em] h-[0.85em] rounded align-middle relative -top-[0.08em] mx-4 ${shouldCropLogo(decodedName) ? 'object-cover' : 'object-contain'}`} style={getLogoStyle(decodedName)} />}
                {!advertiserInfo.logoUrl && ' '}{decodedName} Newsletter Ad Examples
              </h1>
              <p className="text-lg md:text-xl leading-relaxed text-gray-500 font-normal mx-auto max-w-2xl">
                Browse real ad examples from {decodedName} across top newsletters.
              </p>
              <div className="mt-6 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
                <Link
                  to="/browse"
                  className="w-full sm:w-auto rounded-[6px] bg-brand-button border-2 border-transparent px-8 py-3.5 text-[16px] font-medium tracking-normal text-white text-center flex items-center justify-center gap-2 btn-stack"
                >
                  Browse All {totalAds.toLocaleString()} Ads <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/advertisers"
                  className="w-full sm:w-auto rounded-[6px] bg-transparent border-2 border-gray-900 px-8 py-3.5 text-[16px] font-medium tracking-normal text-gray-900 text-center flex items-center justify-center gap-2 btn-stack"
                >
                  Browse All {advertiserCount > 0 ? `${advertiserCount.toLocaleString()} ` : ''}Advertisers <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 pb-12">
              {/* Search + Sort */}
              <div className="flex flex-row gap-3 mb-6">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by newsletter title, subtitle..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-transparent border border-gray-200 rounded-[6px] text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-colors"
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
                  className="w-[180px] shrink-0"
                />
              </div>

              {(() => {
                  let items = [...advertiserProducts];
                  if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    items = items.filter(p => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || (p.publisher?.name || '').toLowerCase().includes(q));
                  }
                  switch (sortOption) {
                    case 'newest':
                      items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
                      break;
                    case 'oldest':
                      items.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
                      break;
                    case 'a-z':
                      items.sort((a, b) => a.title.localeCompare(b.title));
                      break;
                    case 'z-a':
                      items.sort((a, b) => b.title.localeCompare(a.title));
                      break;
                  }
                  return (
                    <>
                      <p className="text-sm text-gray-500 mb-4">
                        {`${items.length.toLocaleString()} ${items.length === 1 ? 'ad' : 'ads'}`}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {items.map(item => (
                          <ProductCard key={item.id} item={item} linkSuffix={decodedName ? `?adv=${encodeURIComponent(decodedName)}` : ''} />
                        ))}
                      </div>
                    </>
                  );
                })()}
        </div>
      </main>
      <SubmitCTA />

      {/* SEO Footer */}
      <div className="max-w-[1280px] mx-auto px-6 lg:px-8 pb-12">
        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-2xl font-display font-bold text-gray-900 mb-4">{decodedName} newsletter ad examples</h2>
          <p className="text-gray-500 leading-relaxed mb-6">
            Browse {(advStaticCount || advertiserProducts.length).toLocaleString()} real {decodedName} newsletter ad examples across top publishers. See how {decodedName} advertises in email newsletters and get inspiration for your next campaign.
          </p>
          {publishers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {publishers.slice(0, 20).map(([pub]) => (
                <Link key={pub} to={`/publishers/${encodeURIComponent(pub)}`} className="text-sm text-gray-400 hover:text-gray-900 hover:underline transition-colors">
                  {decodedName} ads in {pub}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Advertiser;
