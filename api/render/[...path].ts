import type { VercelRequest, VercelResponse } from '@vercel/node';

const SITE_NAME = 'Very Good Ads';
const SITE_DESC = 'Browse our curated collection of newsletter ad examples ready to inspire your next campaign.';
const OG_IMAGE = 'https://media.beehiiv.com/cdn-cgi/image/format=auto,fit=scale-down,onerror=redirect/uploads/asset/file/7debea83-ba69-448c-b3df-7d361eed2d95/Ads.png';
const FAVICON = 'https://media.beehiiv.com/cdn-cgi/image/format=auto,fit=scale-down,onerror=redirect/uploads/asset/file/277adb52-e45e-4e79-a799-c3a6262c1b01/logo.png';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function html(title: string, description: string, canonicalPath: string, body: string, ogImage?: string): string {
  const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
  const img = ogImage || OG_IMAGE;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="icon" type="image/png" href="${FAVICON}">
<link rel="canonical" href="https://www.goodads.io${canonicalPath}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:url" content="https://www.goodads.io${canonicalPath}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(fullTitle)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(img)}">
</head>
<body>
${body}
</body>
</html>`;
}

async function fetchJSON(origin: string, path: string): Promise<any> {
  const res = await fetch(`${origin}/data/${path}`);
  if (!res.ok) return null;
  return res.json();
}

async function renderHome(origin: string): Promise<string> {
  const [manifest, advertisers, showcase] = await Promise.all([
    fetchJSON(origin, 'manifest.json'),
    fetchJSON(origin, 'advertisers.json'),
    fetchJSON(origin, 'top-showcase.json'),
  ]);

  const total = manifest?.total || 0;
  const advCount = advertisers ? Object.keys(advertisers).length : 0;
  const topAdvs = showcase?.slice(0, 20) || [];

  let body = `<h1>${SITE_NAME}</h1>
<p>${SITE_DESC}</p>
<p>${total.toLocaleString()} ads from ${advCount.toLocaleString()} advertisers</p>
<nav><a href="/browse">Browse All Ads</a> | <a href="/advertisers">Browse All Advertisers</a></nav>`;

  if (topAdvs.length > 0) {
    body += '\n<h2>Featured Advertisers</h2>\n<ul>';
    for (const adv of topAdvs) {
      body += `\n<li><a href="/advertisers/${esc(encodeURIComponent(adv.name))}">${esc(adv.name)}</a> (${adv.count?.toLocaleString() || ''} ads)</li>`;
    }
    body += '\n</ul>';
  }

  return html(SITE_NAME, SITE_DESC, '/', body);
}

async function renderAdDetail(origin: string, slug: string): Promise<string | null> {
  const slugIndex = await fetchJSON(origin, 'slug-index.json');
  if (!slugIndex || !slugIndex[slug]) return null;

  const pageNum = slugIndex[slug];
  const page = await fetchJSON(origin, `page-${String(pageNum).padStart(4, '0')}.json`);
  if (!page) return null;

  const item = page.find((p: any) => p.id === slug);
  if (!item) return null;

  const title = item.title || slug;
  const advNames = (item.advertisers || []).map((a: any) => a.name).join(', ');
  const pubName = item.publisher?.name || item.author || '';
  const date = item.date || '';
  const desc = `${title}${advNames ? ` — ad by ${advNames}` : ''}${pubName ? ` in ${pubName}` : ''}`;

  let body = `<article>
<h1>${esc(title)}</h1>`;
  if (date) body += `\n<time datetime="${esc(date)}">${esc(date)}</time>`;
  if (advNames) body += `\n<p>Advertiser${item.advertisers.length > 1 ? 's' : ''}: ${item.advertisers.map((a: any) =>
    `<a href="/advertisers/${esc(encodeURIComponent(a.name))}">${esc(a.name)}</a>`).join(', ')}</p>`;
  if (pubName) body += `\n<p>Publisher: <a href="/publishers/${esc(encodeURIComponent(pubName))}">${esc(pubName)}</a></p>`;
  if (item.url) body += `\n<p><a href="${esc(item.url)}">View original newsletter</a></p>`;
  if (item.tags?.length) body += `\n<p>Tags: ${item.tags.map((t: string) => esc(t)).join(', ')}</p>`;
  body += '\n</article>';

  return html(title, desc, `/ads/${slug}`, body);
}

async function renderBrowse(origin: string): Promise<string> {
  const [manifest, page1] = await Promise.all([
    fetchJSON(origin, 'manifest.json'),
    fetchJSON(origin, 'page-0001.json'),
  ]);

  const total = manifest?.total || 0;
  const items = (page1 || []).slice(0, 50);
  const desc = `Browse ${total.toLocaleString()} newsletter ad examples.`;

  let body = `<h1>Browse All Ads</h1>
<p>${desc}</p>
<ul>`;
  for (const item of items) {
    const advs = (item.advertisers || []).map((a: any) => a.name).join(', ');
    body += `\n<li><a href="/ads/${esc(item.id)}">${esc(item.title || item.id)}</a>${advs ? ` — ${esc(advs)}` : ''}${item.date ? ` (${esc(item.date)})` : ''}</li>`;
  }
  body += '\n</ul>';
  if (total > 50) body += `\n<p>Showing 50 of ${total.toLocaleString()} ads. <a href="/browse">View all</a></p>`;

  return html('Browse Ads', desc, '/browse', body);
}

async function renderAdvertisers(origin: string): Promise<string> {
  const details = await fetchJSON(origin, 'advertiser-details.json');
  if (!details) return html('Advertisers', 'All advertisers', '/advertisers', '<h1>Advertisers</h1>');

  const desc = `Browse ${details.length.toLocaleString()} advertisers with newsletter ads.`;
  let body = `<h1>All Advertisers</h1>\n<p>${desc}</p>\n<ul>`;
  for (const adv of details) {
    body += `\n<li><a href="/advertisers/${esc(encodeURIComponent(adv.name))}">${esc(adv.name)}</a> — ${adv.count.toLocaleString()} ads</li>`;
  }
  body += '\n</ul>';

  return html('All Advertisers', desc, '/advertisers', body);
}

async function renderAdvertiser(origin: string, name: string): Promise<string | null> {
  const decoded = decodeURIComponent(name).replace(/-/g, ' ');
  // Try exact file match first, then with original hyphens
  let items = await fetchJSON(origin, `adv/${encodeURIComponent(name)}.json`);
  if (!items) items = await fetchJSON(origin, `adv/${name}.json`);
  if (!items || items.length === 0) return null;

  const advName = items[0]?.advertisers?.find((a: any) =>
    a.name.toLowerCase() === decoded.toLowerCase() ||
    a.name.replace(/\s+/g, '-').toLowerCase() === name.toLowerCase()
  )?.name || decoded;

  const desc = `${items.length.toLocaleString()} newsletter ad examples from ${advName}.`;
  let body = `<h1>${esc(advName)}</h1>\n<p>${desc}</p>\n<ul>`;
  for (const item of items.slice(0, 100)) {
    body += `\n<li><a href="/ads/${esc(item.id)}">${esc(item.title || item.id)}</a>${item.date ? ` (${esc(item.date)})` : ''}</li>`;
  }
  body += '\n</ul>';
  if (items.length > 100) body += `\n<p>Showing 100 of ${items.length.toLocaleString()} ads.</p>`;

  return html(advName, desc, `/advertisers/${name}`, body);
}

async function renderPublisher(origin: string, name: string): Promise<string | null> {
  let items = await fetchJSON(origin, `pub/${encodeURIComponent(name)}.json`);
  if (!items) items = await fetchJSON(origin, `pub/${name}.json`);
  if (!items || items.length === 0) return null;

  const pubName = items[0]?.publisher?.name || decodeURIComponent(name).replace(/-/g, ' ');
  const desc = `${items.length.toLocaleString()} ads from ${pubName} newsletter.`;
  let body = `<h1>${esc(pubName)}</h1>\n<p>${desc}</p>\n<ul>`;
  for (const item of items.slice(0, 100)) {
    const advs = (item.advertisers || []).map((a: any) => a.name).join(', ');
    body += `\n<li><a href="/ads/${esc(item.id)}">${esc(item.title || item.id)}</a>${advs ? ` — ${esc(advs)}` : ''}${item.date ? ` (${esc(item.date)})` : ''}</li>`;
  }
  body += '\n</ul>';

  return html(pubName, desc, `/publishers/${name}`, body);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathSegments = (req.query.path as string[]) || [];
  const origin = `https://${req.headers.host || 'www.goodads.io'}`;

  let result: string | null = null;

  try {
    if (pathSegments[0] === 'home' || pathSegments.length === 0) {
      result = await renderHome(origin);
    } else if (pathSegments[0] === 'browse') {
      result = await renderBrowse(origin);
    } else if (pathSegments[0] === 'ads' && pathSegments[1]) {
      result = await renderAdDetail(origin, pathSegments[1]);
    } else if (pathSegments[0] === 'advertisers' && pathSegments[1]) {
      result = await renderAdvertiser(origin, pathSegments[1]);
    } else if (pathSegments[0] === 'advertisers') {
      result = await renderAdvertisers(origin);
    } else if (pathSegments[0] === 'publishers' && pathSegments[1]) {
      result = await renderPublisher(origin, pathSegments[1]);
    }
  } catch (e) {
    console.error('Render error:', e);
  }

  if (!result) {
    // Fallback: redirect to SPA
    res.setHeader('Location', `/${pathSegments.join('/')}`);
    return res.status(302).end();
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  return res.send(result);
}
