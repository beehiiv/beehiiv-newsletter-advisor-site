import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import { CURATED_PRODUCTS, TOP_ADVERTISERS, useProductById, useAdNeighbors, shouldCropLogo, getLogoStyle } from '../data-layer';
import { cleanEmailHtml, renderToShadow, resolveEmailUrl } from '../email-utils';
import SubmitCTA from '../components/SubmitCTA';
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

const Detail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scopeTag = searchParams.get('tag') || undefined;
  const scopeAdv = searchParams.get('adv') || undefined;
  const scopeParam = scopeTag ? `?tag=${encodeURIComponent(scopeTag)}` : scopeAdv ? `?adv=${encodeURIComponent(scopeAdv)}` : '';

  const { product, loading: productLoading } = useProductById(id);
  const { prevId, nextId } = useAdNeighbors(id, { tag: scopeTag, advertiser: scopeAdv });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft' && prevId) navigate(`/ads/${prevId}${scopeParam}`);
      if (e.key === 'ArrowRight' && nextId) navigate(`/ads/${nextId}${scopeParam}`);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevId, nextId, navigate]);


  const [advertiserCounts, setAdvertiserCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch('/data/advertisers.json')
      .then(res => res.json())
      .then(data => setAdvertiserCounts(data))
      .catch(() => {});
  }, []);

  const [htmlContent, setHtmlContent] = useState('');
  const [htmlFailed, setHtmlFailed] = useState(false);
  const emailPreviewRef = useRef<HTMLDivElement>(null);
  const heroMobileRef = useRef<HTMLDivElement>(null);
  const heroDesktopRef = useRef<HTMLDivElement>(null);
  const heroContainerRef = useRef<HTMLDivElement>(null);
  const heroContainerMobileRef = useRef<HTMLDivElement>(null);
  const [heroScale, setHeroScale] = useState(0);
  const [previewHeight, setPreviewHeight] = useState(0);

  // Fetch email HTML
  useEffect(() => {
    if (product?.htmlFile) {
      setHtmlFailed(false);
      fetch(resolveEmailUrl(product.htmlFile!))
        .then(res => {
          if (!res.ok) throw new Error('not found');
          return res.text();
        })
        .then(raw => {
          // Detect SPA fallback (Vercel serves index.html for missing files)
          if (raw.includes('<div id="root">')) { setHtmlFailed(true); return; }
          setHtmlContent(cleanEmailHtml(raw));
        })
        .catch(() => setHtmlFailed(true));
    } else {
      setHtmlContent('');
    }
  }, [product?.htmlFile]);

  // Render into all shadow DOM hosts
  useEffect(() => {
    if (!htmlContent) return;

    // Full preview
    if (emailPreviewRef.current) {
      const shadow = renderToShadow(emailPreviewRef.current, htmlContent, true);
      // Measure height after images load
      const measure = () => {
        // In shadow DOM, <body>/<html> tags are stripped by innerHTML parser,
        // so query actual content elements instead
        let h = 0;
        for (const child of Array.from(shadow.children)) {
          if (child instanceof HTMLElement && child.tagName !== 'STYLE' && child.tagName !== 'LINK') {
            h = Math.max(h, child.scrollHeight);
          }
        }
        if (!h) {
          h = shadow.querySelector('.rendered-post')?.scrollHeight
            || shadow.querySelector('table')?.scrollHeight
            || (shadow.firstElementChild as HTMLElement)?.scrollHeight || 0;
        }
        if (h > 100) setPreviewHeight(h);
      };
      requestAnimationFrame(() => requestAnimationFrame(measure));
      setTimeout(measure, 500);
      setTimeout(measure, 1500);
      setTimeout(measure, 3000);
      setTimeout(measure, 5000);

      // Watch for size changes from lazy-loaded images
      const observed = shadow.querySelector('.rendered-post') || shadow.querySelector('body') || shadow.firstElementChild;
      if (observed) {
        const ro = new ResizeObserver(() => measure());
        ro.observe(observed as Element);
        // Also listen for image load events in shadow DOM
        shadow.querySelectorAll('img').forEach(img => {
          if (!img.complete) img.addEventListener('load', measure);
        });
      }
    }

    // Hero thumbnails
    [heroMobileRef, heroDesktopRef].forEach(ref => {
      if (ref.current) renderToShadow(ref.current, htmlContent);
    });
  }, [htmlContent]);

  // Scale hero to fit container width
  useEffect(() => {
    const update = () => {
      const el = heroContainerMobileRef.current?.offsetWidth
        ? heroContainerMobileRef.current
        : heroContainerRef.current;
      if (el) setHeroScale(el.offsetWidth / 800);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [product]);

  // Update meta tags for this product
  useEffect(() => {
    if (product) {
      document.title = `${product.title} | Very Good Ads`;

      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) metaDescription.setAttribute('content', product.description);

      // Update OG tags
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', `${product.title} | Very Good Ads`);

      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) ogDescription.setAttribute('content', product.description);

      // Generate screenshot URL using WordPress mshots
      const screenshotUrl = product.url
        ? `https://s0.wp.com/mshots/v1/${encodeURIComponent(product.url)}?w=1200&h=630`
        : null;

      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage && screenshotUrl) {
        ogImage.setAttribute('content', screenshotUrl);
      } else if (screenshotUrl) {
        const newOgImage = document.createElement('meta');
        newOgImage.setAttribute('property', 'og:image');
        newOgImage.setAttribute('content', screenshotUrl);
        document.head.appendChild(newOgImage);
      }

      // Update Twitter tags
      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (twitterTitle) twitterTitle.setAttribute('content', `${product.title} | Very Good Ads`);

      const twitterDescription = document.querySelector('meta[name="twitter:description"]');
      if (twitterDescription) twitterDescription.setAttribute('content', product.description);

      const twitterImage = document.querySelector('meta[name="twitter:image"]');
      if (twitterImage && screenshotUrl) {
        twitterImage.setAttribute('content', screenshotUrl);
      } else if (screenshotUrl) {
        const newTwitterImage = document.createElement('meta');
        newTwitterImage.setAttribute('name', 'twitter:image');
        newTwitterImage.setAttribute('content', screenshotUrl);
        document.head.appendChild(newTwitterImage);
      }
    }

    return () => {
      // Reset to default on unmount
      document.title = 'Very Good Ads';
    };
  }, [product]);


  const relatedProducts = useMemo(() => {
    if (!product) return [];
    let related = CURATED_PRODUCTS.filter(c => c.category === product.category && c.id !== product.id);
    if (related.length < 4) {
      const others = CURATED_PRODUCTS.filter(c => c.category !== product.category && c.id !== product.id).sort(() => 0.5 - Math.random());
      related = [...related, ...others];
    }
    return related.slice(0, 4);
  }, [product]);

  if (productLoading) return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-[1280px] mx-auto px-6 lg:px-8 py-10 lg:py-16 animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="w-full bg-gray-100 rounded-[6px]" style={{ aspectRatio: '830 / 600' }} />
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-2/3" />
                <div className="flex gap-2 mt-4">
                  <div className="h-8 bg-gray-100 rounded-full w-20" />
                  <div className="h-8 bg-gray-100 rounded-full w-24" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 py-12 animate-pulse">
          <div className="w-full bg-gray-100 rounded-[6px]" style={{ minHeight: '400px' }} />
        </div>
      </main>
    </div>
  );

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-900 text-center">
        <div>
          <h1 className="text-3xl font-display font-bold mb-4">Product not found</h1>
          <Link to="/" className="text-brand-accent font-bold">Go Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <Header />
      {/* Desktop floating nav arrows */}
      {prevId && (
        <Link
          to={`/ads/${prevId}${scopeParam}`}
                    className="fixed left-[calc(50%-720px)] top-1/2 -translate-y-1/2 z-40 hidden xl:flex w-10 h-10 bg-white border border-gray-200 rounded-lg items-center justify-center shadow-lg hover:bg-gray-100 hover:border-gray-400 transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-gray-900" />
        </Link>
      )}
      {nextId && (
        <Link
          to={`/ads/${nextId}${scopeParam}`}
                    className="fixed right-[calc(50%-720px)] top-1/2 -translate-y-1/2 z-40 hidden xl:flex w-10 h-10 bg-white border border-gray-200 rounded-lg items-center justify-center shadow-lg hover:bg-gray-100 hover:border-gray-400 transition-all"
        >
          <ChevronRight className="w-5 h-5 text-gray-900" />
        </Link>
      )}
      {/* Mobile nav arrows — bottom center, side by side */}
      {(prevId || nextId) && (
        <div className="xl:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3">
          {prevId && (
            <Link
              to={`/ads/${prevId}${scopeParam}`}
                            className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-lg hover:bg-gray-100 hover:border-gray-400 transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-gray-900" />
            </Link>
          )}
          {nextId && (
            <Link
              to={`/ads/${nextId}${scopeParam}`}
                            className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-lg hover:bg-gray-100 hover:border-gray-400 transition-all"
            >
              <ChevronRight className="w-5 h-5 text-gray-900" />
            </Link>
          )}
        </div>
      )}
      <main className="flex-1">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-[1280px] mx-auto px-6 lg:px-8 py-10 lg:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Mobile thumbnail - shown above text on small screens */}
              {(product.htmlFile || product.thumbnail || product.url) && (
                <div ref={heroContainerMobileRef} className="relative w-full bg-white border border-gray-200 rounded-[6px] overflow-hidden lg:hidden" style={{ aspectRatio: '830 / 600' }}>
                  {product.htmlFile && !htmlFailed ? (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div
                        ref={heroMobileRef}
                        className="absolute bg-white pointer-events-none"
                        style={{ transformOrigin: 'top left', transform: heroScale > 0 ? `scale(${heroScale})` : 'scale(0.4)', width: '800px', height: '1200px', maxWidth: 'none' }}
                      />
                    </div>
                  ) : (
                    <img
                      src={product.thumbnail || `https://s.wordpress.com/mshots/v1/${encodeURIComponent(product.url!)}?w=1200&h=900`}
                      alt={product.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
              )}
              <div>
                {(() => {
                  const titleUrl = product.url || product.publisher?.url;
                  const hasDescription = product.description && product.description !== product.title;
                  const titleMb = hasDescription ? 'mb-3' : 'mb-4 md:mb-6';
                  return titleUrl ? (
                    <a href={titleUrl} target="_blank" rel="noopener noreferrer" className={`group ${titleMb} block`}>
                      <h1 className="text-3xl md:text-4xl font-body font-bold text-gray-900 tracking-normal leading-tight group-hover:underline inline">{(() => {
                        const words = product.title.split(' ');
                        const last = words.pop();
                        return <>{words.join(' ')}{words.length > 0 ? ' ' : ''}<span className="whitespace-nowrap">{last}<span style={{ textDecoration: 'none', display: 'inline' }}> <ExternalLink className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity inline align-middle" /></span></span></>;
                      })()}</h1>
                    </a>
                  ) : (
                    <h1 className={`text-3xl md:text-4xl font-body font-bold text-gray-900 tracking-normal leading-tight ${titleMb}`}>{product.title}</h1>
                  );
                })()}
                {product.description && product.description !== product.title && <p className="text-lg text-gray-500 font-normal leading-relaxed mb-8 md:mb-6 break-words overflow-hidden">{product.description}</p>}
                <div className="bg-gray-50 border border-gray-200 rounded-[6px] p-6 mt-2">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Advertisers</h3>
                    {product.advertisers && product.advertisers.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {[...product.advertisers].sort((a, b) => {
                          const aIdx = TOP_ADVERTISERS.indexOf(a.name);
                          const bIdx = TOP_ADVERTISERS.indexOf(b.name);
                          return (aIdx === -1 ? TOP_ADVERTISERS.length : aIdx) - (bIdx === -1 ? TOP_ADVERTISERS.length : bIdx);
                        }).map(adv => {
                          const logo = (adv.logo && adv.logo.startsWith('http') ? adv.logo : null) || (adv.url ? (() => { try { return `https://www.google.com/s2/favicons?domain=${new URL(adv.url!).hostname}&sz=128`; } catch { return ''; } })() : '');
                          return (
                            <Link key={adv.name} to={`/advertisers/${adv.name.replace(/\s+/g, '-')}`} className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-gray-200 rounded-[6px] text-base text-gray-900 font-medium hover:bg-gray-100 hover:border-gray-400 transition-all">
                              {logo && <img src={logo} alt={adv.name} className={`w-6 h-6 rounded shrink-0 ${shouldCropLogo(adv.name) ? 'object-cover' : 'object-contain'}`} style={getLogoStyle(adv.name)} />}
                              <span className="whitespace-nowrap">{adv.name}</span>
                            </Link>
                          );
                        })}
                                                {product.advertisers.length === 1 ? (() => {
                          const advName = product.advertisers![0].name;
                          const count = advertiserCounts[advName] || 0;
                          return (
                            <Link
                              to={`/advertisers/${advName.replace(/\s+/g, '-')}`}
                              className="px-4 py-2.5 text-base font-medium text-gray-900 bg-white border border-gray-200 rounded-[6px] hover:bg-gray-100 hover:border-gray-400 transition-all inline-flex items-center gap-2"
                            >
                              {count > 0 ? `Browse ${count.toLocaleString()} Ads` : 'Browse Ads'} →
                            </Link>
                          );
                        })() : (
                          <Link
                            to="/advertisers"
                            className="px-4 py-2.5 text-base font-medium text-gray-900 bg-white border border-gray-200 rounded-[6px] hover:bg-gray-100 hover:border-gray-400 transition-all inline-flex items-center gap-2"
                          >
                            Browse All →
                          </Link>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Discover top advertisers</span>
                    )}
                </div>
                {product.date && (
                  <p className="text-sm text-gray-400 font-normal mt-4">
                    {(() => {
                      const raw = product.date.includes('T') ? product.date : product.date + 'T00:00:00';
                      const d = new Date(raw);
                      return isNaN(d.getTime()) ? '' : `Published on ${d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
                    })()}
                  </p>
                )}
              </div>
              {/* Desktop thumbnail - hidden on mobile (shown above instead) */}
              {(product.htmlFile || product.thumbnail || product.url) && (
                <div ref={heroContainerRef} className="relative w-full bg-white border border-gray-200 rounded-[6px] overflow-hidden hidden lg:block" style={{ aspectRatio: '830 / 600' }}>
                  {product.htmlFile && !htmlFailed ? (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div
                        ref={heroDesktopRef}
                        className="absolute bg-white pointer-events-none"
                        style={{ transformOrigin: 'top left', transform: heroScale > 0 ? `scale(${heroScale})` : 'scale(0.4)', width: '800px', height: '1200px', maxWidth: 'none' }}
                      />
                    </div>
                  ) : (
                    <img
                      src={product.thumbnail || `https://s.wordpress.com/mshots/v1/${encodeURIComponent(product.url!)}?w=1200&h=900`}
                      alt={product.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 py-12">
          {/* Product Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-4 md:mb-12">
            {/* Publisher */}
            {product.publisher ? (
              <div className="bg-gray-50 border border-gray-200 rounded-[6px] p-6 flex items-center justify-between gap-4">
                {product.publisher!.url ? (
                  <a href={product.publisher!.url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 min-w-0">
                    {product.publisher!.logo && (
                      <img src={product.publisher!.logo} alt="" className="w-10 h-10 rounded object-contain shrink-0" />
                    )}
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Publisher</h3>
                      <span className="text-lg text-gray-900 font-medium group-hover:underline transition-colors truncate block">
                        {product.publisher.name}
                        <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity inline-block ml-1.5 align-middle" />
                      </span>
                    </div>
                  </a>
                ) : (
                  <Link to={`/publishers/${encodeURIComponent(product.author)}`} className="group flex items-center gap-4 min-w-0">
                    {product.publisher!.logo && (
                      <img src={product.publisher!.logo} alt="" className="w-10 h-10 rounded object-contain shrink-0" />
                    )}
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Publisher</h3>
                      <span className="text-lg text-gray-900 font-medium group-hover:underline transition-colors truncate block">
                        {product.publisher.name}
                      </span>
                    </div>
                  </Link>
                )}
                <Link
                  to={`/publishers/${encodeURIComponent(product.author)}`}
                  className="shrink-0 px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-[6px] hover:bg-gray-100 hover:border-gray-400 transition-all"
                >
                  View All
                </Link>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-[6px] p-6 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Author</h3>
                  <Link to={`/publishers/${encodeURIComponent(product.author)}`} className="text-lg text-gray-900 font-medium hover:text-brand-accent transition-colors">
                    {product.author}
                  </Link>
                </div>
                <Link
                  to={`/publishers/${encodeURIComponent(product.author)}`}
                  className="shrink-0 px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-[6px] hover:bg-gray-100 hover:border-gray-400 transition-all"
                >
                  View All
                </Link>
              </div>
            )}

            {/* Tags/Category */}
            {product.tags && product.tags.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-[6px] p-6 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Category</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map(tag => (
                      <Link key={tag} to={`/browse?tag=${tag}`} className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-900 hover:bg-gray-200 transition-colors">{tag}</Link>
                    ))}
                  </div>
                </div>
                <Link
                  to="/browse"
                  className="shrink-0 px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-[6px] hover:bg-gray-100 hover:border-gray-400 transition-all"
                >
                  Browse All
                </Link>
              </div>
            )}
          </div>

          {/* Product Preview - rendered directly via Shadow DOM */}
          {/* On mobile: edge-to-edge (no border/padding). On desktop: bordered container */}
          <div className="-mx-6 px-2 md:px-0 md:mx-0 mb-12">
          {htmlContent && !htmlFailed ? (
            <div
              ref={emailPreviewRef}
              className="w-full md:border md:border-gray-200 md:rounded-[6px] overflow-x-hidden"
              style={{ backgroundColor: product.bgColor || '#ffffff', minHeight: previewHeight > 0 ? `${previewHeight + 40}px` : '400px' }}
            />
          ) : (
            <div className="relative w-full md:border md:border-gray-200 md:rounded-[6px] overflow-hidden bg-white" style={{ minHeight: '600px' }}>
              {product.thumbnail ? (
                <img
                  src={product.thumbnail}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : product.url ? (
                <img
                  src={`https://s.wordpress.com/mshots/v1/${encodeURIComponent(product.url)}?w=1200&h=900`}
                  alt={product.title}
                  className="w-full object-contain"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ minHeight: '200px' }}>
                  <span className="text-8xl font-display font-bold text-gray-200">{product.title[0]}</span>
                </div>
              )}
            </div>
          )}
          </div>

        </div>

        <SubmitCTA />

        {relatedProducts.length > 0 && (
          <div className="max-w-[1280px] mx-auto px-6 lg:px-8 pb-16 pt-0">
            <div className="h-[1px] w-full bg-gray-200 mb-12"></div>
            <h2 className="text-3xl font-bold font-display text-gray-900 mb-8 uppercase">Related Ads</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map(item => <ProductCard key={item.id} item={item} />)}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Detail;
