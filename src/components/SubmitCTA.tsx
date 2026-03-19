import React from 'react';
import { ArrowRight } from 'lucide-react';

const SubmitCTA: React.FC = () => {
  return (
    <section className="w-full pt-4">
      <div className="bg-gray-50 border-y border-gray-200 p-10 md:p-16 text-center">
        <h2 className="font-display text-3xl md:text-5xl font-bold text-gray-900 uppercase mb-4 max-w-2xl mx-auto">
          The most powerful Ad Network for publishers & advertisers
        </h2>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8">
          The beehiiv Ad Network can seamlessly connect premium publishers with high-quality advertisers, unlock new revenue, and reach engaged audiences effortlessly.        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://app.beehiiv.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto rounded-[6px] bg-transparent border-2 border-gray-900 px-8 py-3.5 text-[16px] font-medium tracking-normal text-gray-900 text-center flex items-center justify-center gap-2 btn-stack"
          >
            Start Earning <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="https://www.beehiiv.com/i-want-to/advertise"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto rounded-[6px] bg-brand-button px-8 py-3.5 text-[16px] font-medium tracking-normal text-white text-center flex items-center justify-center gap-2 btn-stack"
          >
            Start Advertising <ArrowRight className="w-4 h-4" />
          </a>
        </div>
        <div className="mt-10 max-w-3xl mx-auto -mb-10 md:-mb-16 relative">
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none" />
          <img
            alt="beehiiv Ad Network Dashboard"
            loading="lazy"
            width={1000}
            height={1000}
            className="w-full h-auto"
            srcSet="https://media.beehiiv.com/cdn-cgi/image/fit=scale-down,onerror=redirect,format=auto,width=1080,quality=75/www/ad-network-brand-page/ad-network-hero.png 1x, https://media.beehiiv.com/cdn-cgi/image/fit=scale-down,onerror=redirect,format=auto,width=2048,quality=75/www/ad-network-brand-page/ad-network-hero.png 2x"
            src="https://media.beehiiv.com/cdn-cgi/image/fit=scale-down,onerror=redirect,format=auto,width=2048,quality=75/www/ad-network-brand-page/ad-network-hero.png"
          />
        </div>
      </div>
    </section>
  );
};

export default SubmitCTA;
