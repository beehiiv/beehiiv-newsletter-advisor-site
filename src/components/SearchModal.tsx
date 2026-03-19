import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Search, Megaphone, Tag } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAllFilters, useAdvertiserDetails, shouldCropLogo, getLogoStyle } from '../data-layer';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const { tags: allFilterTags } = useAllFilters();
  const { advertisers: advDetails } = useAdvertiserDetails();

  useEffect(() => {
    onClose();
  }, [location.pathname]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!isOpen) setQuery('');
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const allCategories = allFilterTags;

  const allAdvertisers = useMemo(() => {
    return advDetails.map(a => [a.name, a.logoUrl] as [string, string]).sort((a, b) => a[0].localeCompare(b[0]));
  }, [advDetails]);


  const lowerQuery = query.toLowerCase().trim();

  const filteredCategories = useMemo(() => {
    if (!lowerQuery) return allCategories;
    return allCategories.filter(tag => tag.toLowerCase().includes(lowerQuery));
  }, [lowerQuery, allCategories]);

  const filteredAdvertisers = useMemo(() => {
    if (!lowerQuery) return allAdvertisers;
    return allAdvertisers.filter(([name]) => name.toLowerCase().includes(lowerQuery));
  }, [lowerQuery, allAdvertisers]);

  if (!isOpen) return null;

  const hasResults = filteredCategories.length > 0 || filteredAdvertisers.length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/20 transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-5xl bg-white border border-gray-200 rounded-xl p-0 animate-in fade-in slide-in-from-top-4 duration-200 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="relative flex items-center shrink-0 border-b border-gray-100 px-3 py-4 md:p-6 bg-white z-20">
          <Search className="w-5 h-5 md:w-6 md:h-6 text-gray-500 absolute left-5 md:left-8" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search advertisers, categories"
            className="w-full bg-transparent border-none text-base md:text-2xl text-gray-900 placeholder-gray-400 focus:ring-0 pl-9 pr-10 md:pl-12 md:pr-12 font-sans font-medium outline-none"
          />
          <div className="absolute right-4 md:right-6 flex items-center gap-3">
            <div className="hidden md:flex items-center justify-center px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-500 border border-gray-200">ESC</div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-6 md:p-8 bg-gray-50 flex-1">
          {hasResults ? (
            <div className="space-y-8">
              {filteredCategories.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {filteredCategories.map(tag => (
                      <Link
                        key={tag}
                        to={`/${tag.toLowerCase().replace(/-/g, '')}`}
                        target="_blank"
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-[6px] text-base text-gray-900 font-medium hover:border-brand-button transition-colors"
                      >
                        <Tag className="w-4 h-4 text-gray-400" />
                        {tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {filteredAdvertisers.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Advertisers</h3>
                  <div className="flex flex-wrap gap-2">
                    {filteredAdvertisers.map(([name, logoUrl]) => (
                      <Link
                        key={name}
                        to={`/advertisers/${name.replace(/\s+/g, '-')}`}
                        target="_blank"
                        className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-gray-200 rounded-[6px] text-base text-gray-900 font-medium hover:border-brand-button transition-colors"
                      >
                        {logoUrl ? <img src={logoUrl} alt={name} className={`w-5 h-5 rounded ${shouldCropLogo(name) ? 'object-cover' : 'object-contain'}`} style={getLogoStyle(name)} /> : <Megaphone className="w-5 h-5 text-gray-400" />}
                        {name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <Search className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg">No results found for "{query}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
