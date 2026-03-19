import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { ProductItem } from '../types';
import type { AdvertiserDetail } from '../data-layer';
import { shouldCropLogo, getLogoStyle } from '../data-layer';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from './ProductCard';

interface Props {
  advertiser: AdvertiserDetail;
  items: ProductItem[];
}

const AdvertiserRow: React.FC<Props> = ({ advertiser, items }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const slug = advertiser.name.replace(/\s+/g, '-');
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -600 : 600, behavior: 'smooth' });
  };

  if (items.length === 0) return null;

  return (
    <section>
      {/* Header: logo + name on left, CTA on right */}
      <div className="flex items-center justify-between mb-4">
        <Link to={`/advertisers/${slug}`} className="flex items-center gap-3 min-w-0 group">
          {advertiser.logoUrl && (
            <img
              src={advertiser.logoUrl}
              alt=""
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              className={`w-8 h-8 rounded shrink-0 ${shouldCropLogo(advertiser.name) ? 'object-cover' : 'object-contain'}`}
              style={getLogoStyle(advertiser.name)}
            />
          )}
          <h2 className="font-display text-xl lg:text-2xl font-bold text-gray-900 uppercase truncate group-hover:underline">
            {advertiser.name}
          </h2>
        </Link>
        <Link
          to={`/advertisers/${slug}`}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-900 border border-gray-200 rounded-[6px] hover:bg-gray-100 hover:border-gray-400 transition-all"
        >
          <span className="hidden sm:inline">Browse {advertiser.count.toLocaleString()} ads</span>
          <span className="sm:hidden">{advertiser.count.toLocaleString()} ads</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Scrollable card row */}
      <div className="relative">
        <button
          onClick={() => scroll('left')}
          disabled={!canScrollLeft}
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-30 hidden md:flex w-10 h-10 bg-white border border-gray-200 rounded-lg items-center justify-center shadow-lg transition-all -ml-3 ${canScrollLeft ? 'hover:bg-gray-100 hover:border-gray-400 cursor-pointer' : 'opacity-30 cursor-default'}`}
        >
          <ChevronLeft className="w-5 h-5 text-gray-900" />
        </button>
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2"
        >
          {items.map(item => (
            <div key={item.id} className="w-[200px] md:w-[370px] shrink-0 snap-start">
              <ProductCard item={item} />
            </div>
          ))}
        </div>
        <button
          onClick={() => scroll('right')}
          disabled={!canScrollRight}
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-30 hidden md:flex w-10 h-10 bg-white border border-gray-200 rounded-lg items-center justify-center shadow-lg transition-all -mr-3 ${canScrollRight ? 'hover:bg-gray-100 hover:border-gray-400 cursor-pointer' : 'opacity-30 cursor-default'}`}
        >
          <ChevronRight className="w-5 h-5 text-gray-900" />
        </button>
      </div>
    </section>
  );
};

export default AdvertiserRow;
