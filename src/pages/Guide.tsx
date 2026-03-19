import React, { useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SubmitCTA from '../components/SubmitCTA';
import FAQSection from '../components/FAQSection';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Guide: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 py-16 lg:py-24">
          {/* Header */}
          <div className="max-w-4xl mx-auto text-center mb-24 lg:mb-32 animate-in fade-in duration-1000">
            <h1 className="font-display text-5xl sm:text-7xl md:text-8xl font-bold text-gray-900 mb-8 uppercase leading-none tracking-normal antialiased">
              <span className="inline-block animate-fade-slide-right [animation-delay:0ms] opacity-0">How</span>{' '}
              <span className="inline-block animate-fade-slide-right [animation-delay:100ms] opacity-0">to</span>{' '}
              <span className="inline-block animate-fade-slide-right [animation-delay:200ms] opacity-0">use</span><br />
              <span className="inline-block animate-fade-slide-right [animation-delay:300ms] opacity-0 bg-gradient-to-r from-[#bfdbfe] to-brand-accent bg-clip-text text-transparent">This Library</span>
            </h1>
            <p className="mt-8 text-xl md:text-2xl leading-relaxed text-gray-500 font-normal mx-auto max-w-2xl">
              A guide to browsing and using our curated collection of digital product examples for inspiration.
            </p>
            <div className="mt-10 flex justify-center">
              <Link
                to="/browse"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent border-2 border-gray-900 text-gray-900 font-bold rounded-[6px] text-lg btn-stack"
              >
                Start Browsing <ArrowRight className="w-6 h-6" />
              </Link>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-32">

            {/* Step 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
              <div className="order-1 lg:order-1">
                <div className="flex items-center gap-6 mb-6">
                  <span className="flex items-center justify-center w-16 h-16 rounded-full bg-brand-button text-white font-bold text-3xl font-display shrink-0 leading-none pt-1">1</span>
                  <h2 className="text-3xl md:text-4xl font-bold font-display uppercase">Browse the Collection</h2>
                </div>
                <p className="text-xl text-gray-500 mb-10 leading-relaxed">
                  Explore our curated collection of digital products. Use filters and search to find products that match your interests.
                </p>
                <Link
                  to="/browse"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent border-2 border-gray-900 text-gray-900 font-bold rounded-[6px] text-lg btn-stack"
                >
                  Browse All <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
              <div className="order-2 lg:order-2">
                <div className="aspect-video bg-[#172554] border-[5px] border-[#1e3a5f] rounded-[10px] overflow-hidden flex items-center justify-center relative group">
                  <span className="text-6xl font-display font-bold text-gray-200">Browse</span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              <div className="order-2 lg:order-1">
                <div className="aspect-video bg-[#172554] border-[5px] border-[#1e3a5f] rounded-[10px] overflow-hidden flex items-center justify-center relative group">
                  <span className="text-6xl font-display font-bold text-gray-200">Filter</span>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <div className="flex items-center gap-6 mb-6">
                  <span className="flex items-center justify-center w-16 h-16 rounded-full bg-brand-button text-white font-bold text-3xl font-display shrink-0 leading-none pt-1">2</span>
                  <h2 className="text-3xl md:text-4xl font-bold font-display uppercase">Filter by Category</h2>
                </div>
                <p className="text-xl text-gray-500 mb-10 leading-relaxed">
                  Use our category filters to narrow down products by type - SaaS, Mobile Apps, Marketplaces, or AI Products.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 pb-20">
              <div className="order-1 lg:order-1">
                <div className="flex items-center gap-6 mb-6">
                  <span className="flex items-center justify-center w-16 h-16 rounded-full bg-brand-button text-white font-bold text-3xl font-display shrink-0 leading-none pt-1">3</span>
                  <h2 className="text-3xl md:text-4xl font-bold font-display uppercase">Get Inspired</h2>
                </div>
                <p className="text-xl text-gray-500 mb-10 leading-relaxed">
                  Click on any product to view details, visit the product, and find related examples for more inspiration.
                </p>
                <Link
                  to="/browse"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent border-2 border-gray-900 text-gray-900 font-bold rounded-[6px] text-lg btn-stack"
                >
                  Start Exploring <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
              <div className="order-2 lg:order-2">
                <div className="aspect-video bg-[#172554] border-[5px] border-[#1e3a5f] rounded-[10px] overflow-hidden flex items-center justify-center relative group">
                  <span className="text-6xl font-display font-bold text-gray-200">Inspire</span>
                </div>
              </div>
            </div>

          </div>

          {/* FAQ Section */}
          <div className="border-t border-gray-200 pt-16">
            <FAQSection />
          </div>
        </div>
      </main>
      <SubmitCTA />
      <Footer />
    </div>
  );
};

export default Guide;
