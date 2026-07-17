/**
 * PostHog reverse proxy.
 *
 * The client SDK normally calls us.i.posthog.com directly, which uBlock Origin,
 * Brave, Firefox ETP and Safari block by hostname — so a meaningful share of
 * pageviews never arrive. Routing through 420blazin.com/ingest makes the request
 * first-party, which those blockers do not drop.
 *
 * Ingestion goes to the API host; array.js / recorder.js live on the assets host.
 */

const API_HOST = 'us.i.posthog.com';
const ASSET_HOST = 'us-assets.i.posthog.com';

export const INGEST_PREFIX = '/ingest';

export function isIngestPath(pathname: string): boolean {
  return pathname === INGEST_PREFIX || pathname.startsWith(INGEST_PREFIX + '/');
}

/**
 * Map an inbound /ingest/* URL onto its upstream PostHog URL.
 * Pure, so it can be asserted in tests without a network.
 */
export function buildProxyTarget(inbound: URL): URL {
  const path = inbound.pathname.slice(INGEST_PREFIX.length) || '/';
  const host = path.startsWith('/static/') ? ASSET_HOST : API_HOST;

  const target = new URL(inbound.toString());
  target.protocol = 'https:';
  target.hostname = host;
  target.port = '';
  target.pathname = path;
  return target;
}

export async function handlePostHogProxy(request: Request): Promise<Response> {
  const target = buildProxyTarget(new URL(request.url));

  const headers = new Headers(request.headers);
  headers.set('Host', target.hostname);
  // First-party cookies are for 420blazin.com, not PostHog. Don't leak them upstream.
  headers.delete('cookie');

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const upstream = new Request(target.toString(), {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    redirect: 'manual',
  });

  return fetch(upstream);
}
