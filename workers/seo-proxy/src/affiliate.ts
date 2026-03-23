interface AffiliateLink {
  url: string;
  network: string;
  product: string;
  commission_rate?: string;
  avg_price?: number;
  fallback_url?: string;
}

interface WaitUntilCtx {
  waitUntil(promise: Promise<unknown>): void;
}

const ALLOWED_DOMAINS = new Set([
  'www.planetofthevapes.com', 'planetofthevapes.com',
  'www.storz-bickel.com', 'storz-bickel.com',
  'www.pax.com', 'pax.com',
  'arizer.com', 'www.arizer.com',
  'www.tvape.com', 'tvape.com',
  'www.vapor.com', 'vapor.com',
  'www.awin1.com', 'awin1.com',
]);

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/;

export function isAllowedDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && ALLOWED_DOMAINS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function buildRedirectUrl(affiliateUrl: string, site: string): string {
  const sep = affiliateUrl.includes('?') ? '&' : '?';
  return `${affiliateUrl}${sep}utm_source=${site}&utm_medium=affiliate&utm_campaign=vaporizer-guide`;
}

export async function handleAffiliateRedirect(
  slug: string,
  site: string,
  referrer: string | null,
  userAgent: string | null,
  kv: KVNamespace,
  db: D1Database,
  ctx: WaitUntilCtx,
): Promise<Response> {
  if (!slug || !SLUG_PATTERN.test(slug)) {
    return new Response('Not Found', { status: 404 });
  }

  const raw = await kv.get(slug);
  if (!raw) {
    return new Response('Not Found', { status: 404 });
  }

  let link: AffiliateLink;
  try {
    link = JSON.parse(raw);
  } catch {
    return new Response('Bad Gateway', { status: 502 });
  }

  if (!link.url || !isAllowedDomain(link.url)) {
    return new Response('Bad Gateway', { status: 502 });
  }

  const redirectUrl = buildRedirectUrl(link.url, site);

  ctx.waitUntil(
    db.prepare(
      'INSERT INTO affiliate_clicks (slug, site, referrer, user_agent) VALUES (?, ?, ?, ?)'
    )
      .bind(slug, site, referrer, userAgent)
      .run()
      .catch(() => {})
  );

  return new Response(null, {
    status: 302,
    headers: {
      'Location': redirectUrl,
      'Cache-Control': 'no-store, no-cache',
      'X-Robots-Tag': 'noindex',
      'Referrer-Policy': 'no-referrer-when-downgrade',
    },
  });
}
