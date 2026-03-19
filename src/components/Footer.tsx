import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CURATED_PRODUCTS as PRODUCTS } from '../data-layer';

const Footer: React.FC = () => {
  const tagLinks = useMemo(() => {
    const tags = Array.from(new Set(PRODUCTS.flatMap(p => p.tags || []))).sort();
    return tags.map(tag => ({
      label: `Best ${tag.toLowerCase()} newsletter ads`,
      to: `/${tag.toLowerCase().replace(/-/g, '')}`,
    }));
  }, []);

  return (
    <footer className="bg-white border-t border-gray-200 py-16">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-8 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-6">
          <img
            src="https://media.beehiiv.com/cdn-cgi/image/format=auto,fit=scale-down,onerror=redirect/uploads/asset/file/56cdd625-8bfb-48a3-afec-6c9ad13c057e/logo.png"
            alt="Very Good Ads"
            className="h-16"
          />
        </div>
        <div className="flex gap-8 mb-8 text-sm font-bold text-gray-500">
          <Link to="/browse" className="hover:text-gray-900 transition-colors">Browse</Link>
          <Link to="/advertisers" className="hover:text-gray-900 transition-colors">Advertisers</Link>
          <Link to="/faq" className="hover:text-gray-900 transition-colors">FAQs</Link>
        </div>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-8 max-w-3xl">
          {tagLinks.map(({ label, to }) => (
            <Link key={to} to={to} className="text-sm text-gray-400 hover:text-gray-900 transition-colors">
              {label}
            </Link>
          ))}
        </div>
        <div className="text-center text-gray-400 text-sm font-medium">
          &copy; {new Date().getFullYear()} Very Good Ads. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
