/**
 * sitemap.xml and llms.txt live in the repo root and are served by the Cloudflare Pages
 * origin. The worker passes these paths through so one git push updates both the pages
 * and the files that describe them. The worker's only job here is header hygiene.
 */

export const SEO_FILES: Record<string, { path: string; type: string }> = {
  '/sitemap.xml': { path: '/sitemap.xml', type: 'application/xml; charset=utf-8' },
  '/llms.txt': { path: '/llms.txt', type: 'text/plain; charset=utf-8' },
  '/llms-full.txt': { path: '/llms.txt', type: 'text/plain; charset=utf-8' },
};

/** The origin request for a managed SEO file, or null when the path is not one. */
export function seoFileRequest(url: URL, request: Request): Request | null {
  const file = SEO_FILES[url.pathname];
  if (!file) return null;
  const target = new URL(url.toString());
  target.pathname = file.path;
  target.search = '';
  return new Request(target.toString(), {
    method: request.method === 'HEAD' ? 'HEAD' : 'GET',
    headers: request.headers,
  });
}

/** Fix content-type and cache headers on the origin response; mark where it came from. */
export function shapeSeoFileResponse(res: Response, pathname: string): Response {
  const file = SEO_FILES[pathname];
  const out = new Response(res.body, res);
  if (res.ok && file) {
    out.headers.set('Content-Type', file.type);
    out.headers.set('Cache-Control', 'public, max-age=3600');
  }
  out.headers.set('x-seo-source', res.ok ? 'origin' : `origin-${res.status}`);
  return out;
}
