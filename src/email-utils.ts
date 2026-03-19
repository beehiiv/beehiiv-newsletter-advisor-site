const BLOB_BASE = 'https://n84hmzrh3ry6qofu.public.blob.vercel-storage.com';
const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

/** Resolve htmlFile path — local in dev, blob URL in prod */
export function resolveEmailUrl(htmlFile: string): string {
  if (!htmlFile) return '';
  if (htmlFile.startsWith('http')) return htmlFile;
  if (isDev) return htmlFile;
  // /emails/foo.html → https://blob-base/emails/foo.html
  return `${BLOB_BASE}${htmlFile}`;
}

/** Strip scripts, tracking pixel placeholders, and other junk from email HTML */
export function cleanEmailHtml(raw: string): string {
  return raw
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove template placeholders like {{OPEN_TRACKING_PIXEL}}, {{UNSUBSCRIBE_URL}}, etc.
    .replace(/\{\{[A-Z_]+\}\}/g, '');
}

/** Render cleaned HTML into a shadow DOM on the given host element.
 *  responsive: inject styles to constrain email content to container width (for full previews, not scaled thumbnails)
 */
export function renderToShadow(host: HTMLElement, html: string, responsive = false): ShadowRoot {
  let shadow = host.shadowRoot;
  if (!shadow) {
    shadow = host.attachShadow({ mode: 'open' });
  }
  const prefix = responsive ? `<style>
    :host { display: block; overflow-x: hidden; overflow-y: visible; }
    @media (max-width: 767px) {
      body, table, div, td { max-width: 100% !important; }
      img { max-width: 100% !important; height: auto !important; }
      table[width], td[width] { width: auto !important; max-width: 100% !important; }
    }
  </style>` : '';
  shadow.innerHTML = prefix + html;
  return shadow;
}
