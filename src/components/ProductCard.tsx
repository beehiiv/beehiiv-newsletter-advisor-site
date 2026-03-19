import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { ProductItem } from '../types';
import { TOP_ADVERTISERS, shouldCropLogo, getLogoStyle } from '../data-layer';
import { cleanEmailHtml, renderToShadow, resolveEmailUrl } from '../email-utils';

interface Props {
  item: ProductItem;
  variant?: 'default' | 'home' | 'search';
  newTab?: boolean;
  linkSuffix?: string;
}

// Generate screenshot URL using WordPress mshots (free)
const getScreenshotUrl = (url: string) => {
  const encodedUrl = encodeURIComponent(url);
  return `https://s.wordpress.com/mshots/v1/${encodedUrl}?w=1200&h=900`;
};

const getLogoUrl = (adv: { url?: string; logo?: string }) => {
  if (adv.logo && adv.logo.startsWith('http')) return adv.logo;
  if (!adv.url) return '';
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(adv.url).hostname}&sz=128`;
  } catch { return ''; }
};

const ProductCard: React.FC<Props> = ({ item, variant: _variant = 'default', newTab, linkSuffix = '' }) => {
  const location = useLocation();
  const [showOverlay, setShowOverlay] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const shadowHostRef = useRef<HTMLDivElement>(null);
  const [thumbScale, setThumbScale] = useState(0);
  const [htmlReady, setHtmlReady] = useState(false);
  const [htmlFailed, setHtmlFailed] = useState(false);

  // Lazy load: only render when card is near viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Compute scale when container is available
  useEffect(() => {
    if (!item.htmlFile || !containerRef.current || !isVisible) return;
    const update = () => {
      if (containerRef.current) setThumbScale(containerRef.current.offsetWidth / 800);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [item.htmlFile, isVisible]);

  // Fetch email HTML and render into shadow DOM
  useEffect(() => {
    if (!isVisible || !item.htmlFile || !shadowHostRef.current) return;
    let cancelled = false;
    fetch(resolveEmailUrl(item.htmlFile!))
      .then(r => {
        if (!r.ok) throw new Error('not found');
        return r.text();
      })
      .then(raw => {
        if (cancelled || !shadowHostRef.current) return;
        // Check if we got HTML back (not the SPA index.html fallback)
        if (raw.includes('<div id="root">')) { setHtmlFailed(true); return; }
        renderToShadow(shadowHostRef.current, cleanEmailHtml(raw));
        setHtmlReady(true);
      })
      .catch(() => { if (!cancelled) setHtmlFailed(true); });
    return () => { cancelled = true; };
  }, [isVisible, item.htmlFile]);

  const handleTouchStart = () => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile && !showOverlay) setShowOverlay(true);
  };

  const searchParams = new URLSearchParams(location.search);
  const categoryParam = searchParams.get('category');

  let backLabel = 'Back';
  let backLink = '/';

  if (location.pathname === '/') {
    backLabel = 'Home';
    backLink = '/';
  } else if (location.pathname.includes('browse')) {
    if (categoryParam && categoryParam !== 'All') {
      backLabel = categoryParam;
      backLink = `/browse?category=${categoryParam}`;
    } else {
      backLabel = 'All';
      backLink = '/browse';
    }
  }

  return (
    <Link
      ref={cardRef}
      to={`/ads/${item.id}${linkSuffix}`}
      state={{ backLabel, backLink }}
      target={newTab ? '_blank' : undefined}
      className="block w-full rounded-[6px] group"
      onTouchStart={handleTouchStart}
    >
      {/* Card Container */}
      <div ref={containerRef} className={`relative w-full bg-white border rounded-[6px] overflow-hidden transition-colors ${showOverlay ? 'border-brand-button' : 'border-gray-200 group-hover:border-brand-button'}`} style={{ aspectRatio: '830 / 1100' }}>

        {/* Thumbnail */}
        <div className="absolute inset-0 overflow-hidden bg-gray-50">
          {!isVisible ? (
            <div className="absolute inset-0 bg-gray-50" />
          ) : item.htmlFile && !htmlFailed ? (
            <div
              ref={shadowHostRef}
              className="absolute bg-white pointer-events-none"
              style={{
                transformOrigin: 'top center',
                transform: thumbScale > 0 ? `scale(${thumbScale})` : 'scale(0.3)',
                width: '800px',
                height: '2000px',
                maxWidth: 'none',
                left: '50%',
                marginLeft: '-400px',
                opacity: htmlReady ? 1 : 0,
                transition: 'opacity 0.2s',
              }}
            />
          ) : (
            <img
              src={item.thumbnail || (item.url ? getScreenshotUrl(item.url) : '')}
              alt={item.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
        </div>

        {/* Description Overlay */}
        <div className={`absolute inset-0 bg-white/60 backdrop-blur-md flex flex-col items-center justify-center p-6 gap-4 transition-opacity duration-300 z-20 text-center ${showOverlay ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {item.advertisers && item.advertisers.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {(() => {
                const seen = new Set<string>();
                return [...item.advertisers]
                  .sort((a, b) => {
                    const aIdx = TOP_ADVERTISERS.indexOf(a.name);
                    const bIdx = TOP_ADVERTISERS.indexOf(b.name);
                    const aRank = aIdx === -1 ? TOP_ADVERTISERS.length : aIdx;
                    const bRank = bIdx === -1 ? TOP_ADVERTISERS.length : bIdx;
                    return aRank - bRank;
                  })
                  .filter(a => {
                    if (seen.has(a.name)) return false;
                    seen.add(a.name);
                    return true;
                  })
                  .map(a => {
                const logo = getLogoUrl(a);
                return (
                  <span
                    key={a.name}
                    title={a.name}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-[6px] text-[15px] text-gray-900 font-medium max-w-[260px]"
                  >
                    {logo && <img src={logo} alt={a.name} className={`w-5 h-5 rounded shrink-0 ${shouldCropLogo(a.name) ? 'object-cover' : 'object-contain'}`} style={getLogoStyle(a.name)} />}
                    <span className="truncate">{a.name}</span>
                  </span>
                );
              });
              })()}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
