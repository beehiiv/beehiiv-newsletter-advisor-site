import React from 'react';
import { Link } from 'react-router-dom';

const defaultLogos = [
  { alt: 'AGI', maxW: '80px', src: 'https://media.beehiiv.com/cdn-cgi/image/fit=scale-down,onerror=redirect,format=auto,width=1080,quality=75/www/advertiser-logos/cyber-ink-400/agi.svg' },
  { alt: 'Attio', maxW: '120px', src: 'https://media.beehiiv.com/cdn-cgi/image/fit=scale-down,onerror=redirect,format=auto,width=1080,quality=75/www/advertiser-logos/cyber-ink-400/attio.svg' },
  { alt: 'ClickUp', maxW: '120px', src: 'https://media.beehiiv.com/cdn-cgi/image/fit=scale-down,onerror=redirect,format=auto,width=1080,quality=75/www/advertiser-logos/cyber-ink-400/click-up.svg' },
  { alt: 'Nike', maxW: '90px', src: 'https://media.beehiiv.com/cdn-cgi/image/fit=scale-down,onerror=redirect,format=auto,width=1080,quality=75/www/advertiser-logos/cyber-ink-400/nike.svg' },
  { alt: 'HubSpot', maxW: '120px', src: 'https://media.beehiiv.com/cdn-cgi/image/fit=scale-down,onerror=redirect,format=auto,width=1080,quality=75/www/advertiser-logos/cyber-ink-400/hubspot.svg' },
  { alt: 'Intercom', maxW: '120px', src: 'https://media.beehiiv.com/cdn-cgi/image/fit=scale-down,onerror=redirect,format=auto,width=1080,quality=75/www/advertiser-logos/cyber-ink-400/intercom.svg' },
  { alt: 'Notion', maxW: '40px', src: 'https://media.beehiiv.com/cdn-cgi/image/fit=scale-down,onerror=redirect,format=auto,width=1080,quality=75/www/advertiser-logos/cyber-ink-400/Notion-logo 1.svg' },
  { alt: 'PayPal', maxW: '120px', src: 'https://media.beehiiv.com/cdn-cgi/image/fit=scale-down,onerror=redirect,format=auto,width=1080,quality=75/www/advertiser-logos/cyber-ink-400/paypal.svg' },
  { alt: 'Quince', maxW: '120px', src: 'https://media.beehiiv.com/cdn-cgi/image/fit=scale-down,onerror=redirect,format=auto,width=1080,quality=75/www/advertiser-logos/cyber-ink-400/quince.png' },
  { alt: 'Shutterstock', maxW: '120px', src: 'https://media.beehiiv.com/cdn-cgi/image/fit=scale-down,onerror=redirect,format=auto,width=1080,quality=75/www/advertiser-logos/cyber-ink-400/shutterstock.svg' },
  { alt: 'Superhuman', maxW: '140px', src: 'https://media.beehiiv.com/cdn-cgi/image/fit=scale-down,onerror=redirect,format=auto,width=1080,quality=75/www/advertiser-logos/cyber-ink-400/superhuman.svg' },
  { alt: 'Superpower', maxW: '120px', src: 'https://media.beehiiv.com/cdn-cgi/image/fit=scale-down,onerror=redirect,format=auto,width=1080,quality=75/www/advertiser-logos/cyber-ink-400/superpower.svg' },
  { alt: 'The Black Tux', maxW: '120px', src: 'https://media.beehiiv.com/cdn-cgi/image/fit=scale-down,onerror=redirect,format=auto,width=1080,quality=75/www/advertiser-logos/cyber-ink-400/the_black_tux.svg' },
  { alt: 'W', maxW: '40px', src: 'https://media.beehiiv.com/cdn-cgi/image/fit=scale-down,onerror=redirect,format=auto,width=1080,quality=75/www/advertiser-logos/cyber-ink-400/w.svg' },
];

interface LogoItem {
  alt: string;
  src: string;
  maxW?: string;
}

interface LogoTickerProps {
  logos?: LogoItem[];
  grayscale?: boolean;
}

const LogoRow: React.FC<{ logos: LogoItem[]; grayscale?: boolean }> = ({ logos, grayscale }) => (
  <div className="flex items-center animate-ticker-left shrink-0">
    {logos.map((logo, i) => (
      <div key={`${logo.alt}-${i}`} className="mx-6 flex items-center justify-center shrink-0">
        {grayscale ? (
          <Link to={`/advertisers/${logo.alt.replace(/\s+/g, '-')}`} target="_blank" className="pointer-events-auto">
            <img
              alt={`${logo.alt} Logo`}
              loading="eager"
              width={500}
              height={500}
              className="grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-300 rounded"
              style={{ maxWidth: '44px', height: '44px', width: 'auto', objectFit: 'contain' }}
              src={logo.src}
            />
          </Link>
        ) : (
          <img
            alt={`${logo.alt} Logo`}
            loading="eager"
            width={500}
            height={500}
            className="opacity-50"
            style={{ maxWidth: logo.maxW || '28px' }}
            src={logo.src}
          />
        )}
      </div>
    ))}
  </div>
);

const LogoTicker: React.FC<LogoTickerProps> = ({ logos, grayscale }) => {
  let items = logos || defaultLogos;
  if (items.length === 0) return null;

  // For grayscale mode with few logos, repeat them to ensure smooth scrolling
  if (grayscale && items.length < 10) {
    const repeated = [...items];
    while (repeated.length < 10) {
      repeated.push(...items);
    }
    items = repeated;
  }

  return (
    <div className="w-full overflow-hidden pt-14 pb-2 relative">
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
      <div className="flex w-max">
        <LogoRow logos={items} grayscale={grayscale} />
        <LogoRow logos={items} grayscale={grayscale} />
      </div>
    </div>
  );
};

export default LogoTicker;
