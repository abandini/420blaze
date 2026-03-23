/**
 * 420Blazin BEAST SEO Proxy
 * Sits in front of CF Pages, applies KV-driven meta tag mutations via HTMLRewriter.
 */

import { handleAffiliateRedirect } from './affiliate.js';

interface Env {
  BEAST_SEO: KVNamespace;
  AFFILIATE_LINKS: KVNamespace;
  AFFILIATE_DB: D1Database;
}

const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://420blazin.com/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>https://420blazin.com/events</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc>https://420blazin.com/cleveland-420</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>https://420blazin.com/contact</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
</urlset>`;

const ROBOTS = `User-agent: *
Allow: /
Disallow: /go/
Sitemap: https://420blazin.com/sitemap.xml`;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Serve sitemap and robots.txt
    if (url.pathname === '/sitemap.xml') {
      return new Response(SITEMAP, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' } });
    }
    if (url.pathname === '/robots.txt') {
      return new Response(ROBOTS, { headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=3600' } });
    }

    // Affiliate redirects — must be before origin fetch
    if (url.pathname.startsWith('/go/')) {
      const slug = url.pathname.replace('/go/', '');
      if (!slug) return new Response('Not Found', { status: 404 });
      return handleAffiliateRedirect(
        slug,
        '420blazin',
        request.headers.get('Referer'),
        request.headers.get('User-Agent'),
        env.AFFILIATE_LINKS,
        env.AFFILIATE_DB,
        ctx,
      );
    }

    // Fetch from CF Pages origin
    const response = await fetch(request);

    // Only rewrite HTML responses
    const ct = response.headers.get('content-type') || '';
    if (!ct.includes('text/html')) return response;

    // Check for BEAST SEO mutation
    const path = url.pathname;
    const raw = await env.BEAST_SEO.get(`mutation:420blazin:${path}`);
    if (!raw) {
      const newRes = new Response(response.body, response);
      newRes.headers.set('x-beast-seo', `no-mutation:${path}`);
      return newRes;
    }

    try {
      const m = JSON.parse(raw) as { title: string; description: string };
      const rewritten = new HTMLRewriter()
        .on('title', { element(e) { e.setInnerContent(m.title); } })
        .on('meta[name="description"]', { element(e) { e.setAttribute('content', m.description); } })
        .on('meta[property="og:title"]', { element(e) { e.setAttribute('content', m.title); } })
        .on('meta[property="og:description"]', { element(e) { e.setAttribute('content', m.description); } })
        .on('meta[name="twitter:title"]', { element(e) { e.setAttribute('content', m.title); } })
        .on('meta[name="twitter:description"]', { element(e) { e.setAttribute('content', m.description); } })
        .transform(response);
      rewritten.headers.set('x-beast-seo', `rewritten:${path}`);
      return rewritten;
    } catch {
      return response;
    }
  },
} satisfies ExportedHandler<Env>;
