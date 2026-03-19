import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const title = (req.query.title as string) || 'Very Good Downloads';

  // Escape HTML entities
  const safeTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .substring(0, 80);

  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ff72e3"/>
      <stop offset="100%" stop-color="#3843D0"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="#000000"/>
  <rect width="1200" height="8" fill="url(#grad)"/>
  <text x="80" y="100" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#ffffff">Very Good Downloads</text>
  <text x="80" y="420" font-family="Arial, sans-serif" font-size="56" font-weight="bold" fill="#ffffff">${safeTitle}</text>
  <rect x="80" y="480" width="120" height="6" rx="3" fill="url(#grad)"/>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 's-maxage=31536000, stale-while-revalidate');
  return res.send(svg);
}
