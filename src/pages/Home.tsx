import React, { useRef } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SubmitCTA from '../components/SubmitCTA';
import { useProducts, useAdvertiserCount, useTopShowcase } from '../data-layer';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import LogoTicker from '../components/LogoTicker';
import AdvertiserRow from '../components/AdvertiserRow';

const Home: React.FC = () => {
  const browseButtonRef = useRef<HTMLAnchorElement>(null);
  const { totalCount } = useProducts();
  const advertiserCount = useAdvertiserCount();
  const { showcase, loading: showcaseLoading } = useTopShowcase();

  const handleButtonTouch = () => {
    if (browseButtonRef.current) {
      browseButtonRef.current.classList.add('active');
      setTimeout(() => browseButtonRef.current?.classList.remove('active'), 300);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <div className="relative isolate px-6 lg:px-8 pt-10 md:pt-20 pb-0 min-h-[300px] flex items-center justify-center bg-white">
          <div className="max-w-[1280px] mx-auto w-full text-center">
            <div className="z-10 max-w-4xl mx-auto animate-in fade-in duration-1000">
              <h1 className="font-display text-5xl sm:text-7xl md:text-8xl font-bold text-gray-900 mb-6 uppercase leading-none tracking-normal antialiased">
                <span className="inline-block animate-fade-slide-right" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>Very</span>{' '}
                <span className="inline-block animate-fade-slide-right" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>Good</span><br />
                <span className="inline-block animate-fade-slide-right" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>Newsletter</span>{' '}
                <span className="inline-block animate-fade-slide-right bg-gradient-to-r from-brand-accent to-[#2563eb] bg-clip-text text-transparent" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>Ads</span>
              </h1>
              <p className="mt-6 text-lg md:text-xl leading-relaxed text-gray-500 font-normal mx-auto max-w-2xl">
                Looking for inspiration? Browse our curated collection of ad examples ready to inspire your next campaign.
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
                  Browse All {advertiserCount > 0 ? `${advertiserCount.toLocaleString()} ` : ''}Advertisers
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto pb-2">
          <LogoTicker />
        </div>

        {/* Advertiser Showcase */}
        <div className="max-w-[1280px] mx-auto w-full px-6 lg:px-8 pt-4 lg:pt-8 pb-12 lg:pb-20 space-y-12 lg:space-y-16">
          {showcase.length > 0 ? (
            showcase.map(adv => (
              <AdvertiserRow
                key={adv.name}
                advertiser={{ name: adv.name, count: adv.count, logoUrl: adv.logoUrl, url: adv.url, tags: [], latestDate: '' }}
                items={adv.items}
              />
            ))
          ) : showcaseLoading ? (
            <div className="space-y-12">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-gray-100 animate-pulse" />
                      <div className="w-40 h-6 rounded bg-gray-100 animate-pulse" />
                    </div>
                    <div className="w-32 h-10 rounded-[6px] bg-gray-100 animate-pulse" />
                  </div>
                  <div className="flex gap-4 overflow-hidden">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div key={j} className="w-[280px] shrink-0 bg-gray-50 border border-gray-100 rounded-[6px] animate-pulse" style={{ aspectRatio: '830 / 600' }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Bottom CTA */}
          {showcase.length > 0 && (
            <div className="text-center pt-4">
              <Link
                to="/advertisers"
                className="inline-flex items-center gap-2 rounded-[6px] bg-transparent border-2 border-gray-900 px-8 py-3.5 text-[16px] font-medium tracking-normal text-gray-900 btn-stack"
              >
                Browse All {advertiserCount > 0 ? `${advertiserCount.toLocaleString()} ` : ''}Advertisers <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </main>

      <SubmitCTA />
      <Footer />
    </div>
  );
};

export default Home;
