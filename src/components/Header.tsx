import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Menu, ChevronDown, X, ArrowRight, ChevronLeft, ChevronRight,
  Search,
  Bot, Palette, DollarSign, Heart, Sparkles, Megaphone, Cpu,
  Bitcoin, Briefcase, ShoppingCart, GraduationCap, Wrench, Newspaper, Rocket, Layers,
  TrendingUp, Trophy, UtensilsCrossed, Plane, Building, Film, Mail, UserCheck
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import SearchModal from './SearchModal';
import { TOP_ADVERTISERS, useAllFilters, useAdvertiserDetails, getLogoStyle } from '../data-layer';

interface HeaderProps {
  onTagSelect?: (tag: string) => void;
  showBorder?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onTagSelect, showBorder = true }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTagOpen, setIsTagOpen] = useState(false);
  const [isAdvertiserOpen, setIsAdvertiserOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(() => {
    return sessionStorage.getItem('bannerClosed') !== 'true';
  });
  const [bannerMode, setBannerMode] = useState<'advertiser' | 'publisher'>('advertiser');
  const [mobileAdvertisersOpen, setMobileAdvertisersOpen] = useState(true);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(true);
  const [advVisibleCount, setAdvVisibleCount] = useState(30);
  const advScrollRef = useRef<HTMLDivElement>(null);
  const { tags: allTags } = useAllFilters();
  const { advertisers: advDetails } = useAdvertiserDetails();

  const toggleBannerMode = () => {
    setBannerMode(prev => prev === 'advertiser' ? 'publisher' : 'advertiser');
  };

  const closeBanner = () => {
    sessionStorage.setItem('bannerClosed', 'true');
    setIsBannerVisible(false);
  };
  const navigate = useNavigate();

  const categoryIcons: Record<string, React.ReactNode> = {
    'AI': <Bot className="w-4 h-4" />,
    'Creativity': <Palette className="w-4 h-4" />,
    'Finance': <DollarSign className="w-4 h-4" />,
    'Health': <Heart className="w-4 h-4" />,
    'Lifestyle': <Sparkles className="w-4 h-4" />,
    'Marketing': <Megaphone className="w-4 h-4" />,
    'Technology': <Cpu className="w-4 h-4" />,
    'Crypto': <Bitcoin className="w-4 h-4" />,
    'Business': <Briefcase className="w-4 h-4" />,
    'E-commerce': <ShoppingCart className="w-4 h-4" />,
    'Education': <GraduationCap className="w-4 h-4" />,
    'Productivity': <Wrench className="w-4 h-4" />,
    'Startups': <Rocket className="w-4 h-4" />,
    'Media': <Newspaper className="w-4 h-4" />,
    'SaaS': <Layers className="w-4 h-4" />,
    'Investing': <TrendingUp className="w-4 h-4" />,
    'Sports': <Trophy className="w-4 h-4" />,
    'Food & Beverage': <UtensilsCrossed className="w-4 h-4" />,
    'Travel': <Plane className="w-4 h-4" />,
    'Real Estate': <Building className="w-4 h-4" />,
    'Entertainment': <Film className="w-4 h-4" />,
    'Newsletter': <Mail className="w-4 h-4" />,
    'News': <Newspaper className="w-4 h-4" />,
    'Careers': <UserCheck className="w-4 h-4" />,
  };

  const allAdvertisers = useMemo(() => {
    return advDetails
      .map(a => {
        let logo = a.logoUrl && a.logoUrl.startsWith('http') ? a.logoUrl : '';
        if (!logo && a.url) {
          try { logo = `https://www.google.com/s2/favicons?domain=${new URL(a.url).hostname}&sz=128`; } catch {}
        }
        return [a.name, logo] as [string, string];
      })
      .sort((a, b) => {
        const aIdx = TOP_ADVERTISERS.indexOf(a[0]);
        const bIdx = TOP_ADVERTISERS.indexOf(b[0]);
        return (aIdx === -1 ? TOP_ADVERTISERS.length : aIdx) - (bIdx === -1 ? TOP_ADVERTISERS.length : bIdx);
      });
  }, [advDetails]);

  // Load more advertisers on scroll
  const handleAdvScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      setAdvVisibleCount(prev => Math.min(prev + 30, allAdvertisers.length));
    }
  }, [allAdvertisers.length]);

  // Reset visible count when dropdown opens
  useEffect(() => {
    if (isAdvertiserOpen) setAdvVisibleCount(30);
  }, [isAdvertiserOpen]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  const handleTagClick = (tag: string) => {
    setIsTagOpen(false);
    setIsMenuOpen(false);

    if (onTagSelect) {
      onTagSelect(tag);
    }

    if (tag === 'All') {
      navigate('/browse');
    } else {
      navigate(`/${tag.toLowerCase().replace(/-/g, '')}`);
    }
  };

  return (
    <>
      {/* Top Banner */}
      {isBannerVisible && (
        <div className="bg-black text-white py-3 px-4 sm:px-10 relative sticky top-0 z-50">
          <div className="flex items-center">
            {/* Spacer to balance the close button on mobile */}
            <div className="w-7 shrink-0 sm:hidden"></div>
            <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3 min-w-0">
              <a
                href={bannerMode === 'advertiser'
                  ? 'https://www.beehiiv.com/i-want-to/advertise'
                  : 'https://app.beehiiv.com/'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-medium underline sm:no-underline sm:hover:underline"
              >
                <span className="hidden sm:inline">
                  {bannerMode === 'advertiser'
                    ? 'Reach millions of readers on the beehiiv Ad Network'
                    : 'Monetize your newsletter on the beehiiv Ad Network'}
                </span>
                <span className="sm:hidden">
                  {bannerMode === 'advertiser'
                    ? 'Advertise on beehiiv'
                    : 'Monetize on beehiiv'}
                </span>
              </a>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={toggleBannerMode}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors"
                  aria-label="Previous message"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={toggleBannerMode}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors"
                  aria-label="Next message"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <button
              onClick={closeBanner}
              className="p-1 hover:bg-white/10 rounded transition-colors shrink-0"
              aria-label="Close banner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <header className="bg-white">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-24">

            {/* Logo */}
            <div className="flex items-center gap-2 md:gap-4">
              <Link to="/" className="flex items-center gap-2 group">
                <img
                  src="https://media.beehiiv.com/cdn-cgi/image/format=auto,fit=scale-down,onerror=redirect/uploads/asset/file/56cdd625-8bfb-48a3-afec-6c9ad13c057e/logo.png"
                  alt="Very Good Ads"
                  className="h-10 md:h-14"
                />
              </Link>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              <div
                className="relative"
                onMouseEnter={() => setIsTagOpen(true)}
                onMouseLeave={() => setIsTagOpen(false)}
              >
                <button
                  className={`flex items-center gap-1 text-base font-normal text-gray-900 px-4 py-2 rounded-lg transition-colors outline-none ${isTagOpen ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                >
                  Browse
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 mt-0.5 ${isTagOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Mega Menu Dropdown */}
                <div
                  className={`absolute top-full left-1/2 -translate-x-1/2 pt-1 transition-all duration-200 ease-out origin-top ${isTagOpen ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-1 invisible pointer-events-none'}`}
                  style={{ zIndex: 100 }}
                >
                  <div className="w-[300px] bg-white rounded-xl border border-gray-200 overflow-hidden p-4">
                    <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto scrollbar-thin">
                      <button
                        onClick={() => handleTagClick('All')}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 group text-left transition-colors"
                      >
                        <span className="text-base font-bold text-gray-900 group-hover:underline transition-colors flex items-center gap-1.5">Browse All Ads <ArrowRight className="w-4 h-4" /></span>
                      </button>
                      {allTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => handleTagClick(tag)}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 group text-left transition-colors"
                        >
                          <div className="p-2 bg-gray-100 rounded-lg text-gray-400 group-hover:text-white group-hover:bg-brand-button transition-colors shrink-0">
                            {categoryIcons[tag] || <Cpu className="w-4 h-4" />}
                          </div>
                          <span className="text-base font-bold text-gray-900 group-hover:underline transition-colors">{tag}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="relative"
                onMouseEnter={() => setIsAdvertiserOpen(true)}
                onMouseLeave={() => setIsAdvertiserOpen(false)}
              >
                <button
                  className={`flex items-center gap-1 text-base font-normal text-gray-900 px-4 py-2 rounded-lg transition-colors outline-none ${isAdvertiserOpen ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                >
                  Advertisers
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 mt-0.5 ${isAdvertiserOpen ? 'rotate-180' : ''}`} />
                </button>

                <div
                  className={`absolute top-full left-1/2 -translate-x-1/2 pt-1 transition-all duration-200 ease-out origin-top ${isAdvertiserOpen ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-1 invisible pointer-events-none'}`}
                  style={{ zIndex: 100 }}
                >
                  <div className="w-[300px] bg-white rounded-xl border border-gray-200 overflow-hidden p-4">
                    <div ref={advScrollRef} onScroll={handleAdvScroll} className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto scrollbar-thin">
                      <Link
                        to="/advertisers"
                        onClick={() => setIsAdvertiserOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 group text-left transition-colors"
                      >
                        <span className="text-base font-bold text-gray-900 group-hover:underline transition-colors flex items-center gap-1.5">Browse All <ArrowRight className="w-4 h-4" /></span>
                      </Link>
                      {allAdvertisers.slice(0, advVisibleCount).map(([name, logoUrl]) => (
                        <Link
                          key={name}
                          to={`/advertisers/${name.replace(/\s+/g, '-')}`}
                          onClick={() => setIsAdvertiserOpen(false)}
                          title={name}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 group text-left transition-colors"
                        >
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt={name}
                              className="w-6 h-6 rounded object-contain shrink-0"
                              style={getLogoStyle(name)}
                            />
                          ) : (
                            <span className="w-6 h-6 rounded bg-gray-100 shrink-0" />
                          )}
                          <span className="text-base font-medium text-gray-900 group-hover:underline transition-colors truncate">{name}</span>
                        </Link>
                      ))}
                      {advVisibleCount < allAdvertisers.length && (
                        <div className="text-center py-2 text-sm text-gray-400">Scroll for more...</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Link to="/faq" className="text-base font-normal text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                FAQs
              </Link>

              <a href="https://www.beehiiv.com/features/direct-sponsorships" target="_blank" rel="noopener noreferrer" className="text-base font-normal text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                Create a Storefront
              </a>

            </nav>

            {/* CTAs */}
            <div className="hidden md:flex items-center gap-3">
              <a
                href="https://app.beehiiv.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-white border-2 border-gray-900 text-gray-900 text-base font-medium tracking-normal rounded-[6px] hover:bg-gray-100 transition-all flex items-center gap-2"
              >
                Start Earning <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="https://www.beehiiv.com/i-want-to/advertise"
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-brand-button border-2 border-transparent text-white text-base font-medium tracking-normal rounded-[6px] hover:bg-[#2563eb] hover:border-brand-button transition-all flex items-center gap-2"
              >
                Start Advertising <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-gray-900 rounded-[6px]"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Gradient Border */}
        {showBorder && <div className="h-[2px] w-full bg-gradient-to-r from-white via-gray-300 to-white"></div>}

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div
            className="md:hidden bg-white fixed w-full left-0 overflow-y-auto z-50"
            style={{
              top: isBannerVisible ? 'calc(58px + 52px)' : '58px',
              height: isBannerVisible ? 'calc(100vh - 58px - 52px)' : 'calc(100vh - 58px)'
            }}
          >
            <div className="px-6 pt-6 pb-24 space-y-4">
              <button
                onClick={() => { setIsMenuOpen(false); setIsSearchOpen(true); }}
                className="flex items-center gap-3 w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-[6px] text-base text-gray-400"
              >
                <Search className="w-5 h-5" />
                Search ads, advertisers, categories
              </button>
              <div className="space-y-1">
                <button
                  onClick={() => setMobileCategoriesOpen(prev => !prev)}
                  className="flex items-center justify-between w-full py-2"
                >
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Browse</p>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${mobileCategoriesOpen ? 'rotate-180' : ''}`} />
                </button>
                {mobileCategoriesOpen && (
                  <div className="space-y-3 pb-2">
                    <Link
                      to="/browse"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 w-full text-left py-2 text-base font-normal text-gray-900 pl-2 rounded-[6px] hover:bg-gray-50"
                    >
                      Browse All Ads
                    </Link>
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => handleTagClick(tag)}
                        className="flex items-center gap-3 w-full text-left py-2 text-base font-normal text-gray-900 pl-2 rounded-[6px] hover:bg-gray-50"
                      >
                        <span className="opacity-70">{categoryIcons[tag] || <Cpu className="w-4 h-4" />}</span>
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setMobileAdvertisersOpen(prev => !prev)}
                  className="flex items-center justify-between w-full py-2"
                >
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Advertisers</p>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${mobileAdvertisersOpen ? 'rotate-180' : ''}`} />
                </button>
                {mobileAdvertisersOpen && (
                  <div className="space-y-3 pb-2">
                    <Link
                      to="/advertisers"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 w-full text-left py-2 text-base font-normal text-gray-900 pl-2 rounded-[6px] hover:bg-gray-50"
                    >
                      Browse All
                    </Link>
                    {allAdvertisers.slice(0, 50).map(([name, logoUrl]) => (
                      <Link
                        key={name}
                        to={`/advertisers/${name.replace(/\s+/g, '-')}`}
                        onClick={() => setIsMenuOpen(false)}
                        title={name}
                        className="flex items-center gap-3 w-full text-left py-2 text-base font-normal text-gray-900 pl-2 rounded-[6px] hover:bg-gray-50"
                      >
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={name}
                            className="w-5 h-5 rounded object-contain shrink-0"
                            style={getLogoStyle(name)}
                          />
                        ) : (
                          <span className="w-5 h-5 rounded bg-gray-100 shrink-0" />
                        )}
                        <span className="truncate">{name}</span>
                      </Link>
                    ))}
                    {allAdvertisers.length > 50 && (
                      <Link
                        to="/advertisers"
                        onClick={() => setIsMenuOpen(false)}
                        className="pt-4 pb-2 pl-2 text-sm text-gray-500 font-medium"
                      >
                        View all {allAdvertisers.length.toLocaleString()} advertisers...
                      </Link>
                    )}
                  </div>
                )}
              </div>
              <div className="pt-6 border-t border-gray-200 space-y-3">
                <a
                  href="https://app.beehiiv.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full py-3 bg-transparent border-2 border-gray-200 text-gray-900 font-medium rounded-[6px] flex items-center justify-center gap-2 hover:bg-gray-100 hover:border-gray-400 transition-all"
                >
                  Start Earning <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="https://www.beehiiv.com/i-want-to/advertise"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full py-3 bg-brand-button border-2 border-transparent text-white font-medium rounded-[6px] flex items-center justify-center gap-2 hover:bg-[#2563eb] hover:border-brand-button transition-all"
                >
                  Start Advertising <ArrowRight className="w-4 h-4" />
                </a>
                <Link to="/faq" onClick={() => setIsMenuOpen(false)} className="block py-2 text-base font-normal text-gray-500 text-center">FAQs</Link>
                <a href="https://www.beehiiv.com/features/direct-sponsorships" target="_blank" rel="noopener noreferrer" onClick={() => setIsMenuOpen(false)} className="block py-2 text-base font-normal text-gray-500 text-center">Create a Storefront</a>
              </div>
            </div>
          </div>
        )}
      </header>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};

export default Header;
