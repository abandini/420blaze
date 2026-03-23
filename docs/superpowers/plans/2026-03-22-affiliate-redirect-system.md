# Affiliate Redirect System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an affiliate link redirect system with click analytics, FTC disclosure, and blog post integration across 420blazin.com and weedaseniorsguide.com.

**Architecture:** Both sites share one KV namespace (affiliate link mappings) and one D1 database (click analytics). 420blaze extends its existing seo-proxy worker; weedbook extends its existing weedbook-api worker with a route on the main domain. Redirect logic is a small standalone module in each worker. Blog posts use `/go/:slug` links with `rel="nofollow sponsored"`.

**Tech Stack:** Cloudflare Workers (TypeScript), D1, KV, Vitest (unit tests), Playwright (E2E tests), 11ty (weedbook)

---

## File Structure

### 420blaze (420blazin.com)

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `workers/seo-proxy/wrangler.toml` | Add AFFILIATE_LINKS KV + AFFILIATE_DB D1 bindings |
| Modify | `workers/seo-proxy/src/index.ts` | Add /go/:slug handler + update robots.txt |
| Create | `workers/seo-proxy/src/affiliate.ts` | Redirect logic: KV lookup, D1 logging, 302 redirect |
| Create | `workers/seo-proxy/tests/affiliate.test.ts` | Unit tests for redirect logic |
| Modify | `workers/seo-proxy/package.json` | Add vitest + @cloudflare/workers-types |
| Modify | `workers/seo-proxy/tsconfig.json` | Add test paths if needed |
| Modify | `css/style.css` | Add `.affiliate-disclosure` styles |
| Modify | `blog/cannabis-vaporizer-guide.html` | Add FTC disclosure + /go/ links |
| Modify | `blog/wake-and-bake-protocol.html` | Add FTC disclosure + /go/ links where applicable |
| Create | `tests/affiliate-redirects.spec.ts` | Playwright E2E: redirects, disclosure, link attributes |

### Weedbook (weedaseniorsguide.com)

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `worker/wrangler.toml` | Add AFFILIATE_LINKS KV + AFFILIATE_DB D1 bindings + route |
| Modify | `worker/src/index.ts` | Add /go/:slug handler |
| Create | `worker/src/affiliate.ts` | Redirect logic (same as 420blaze) |
| Create | `worker/tests/affiliate.test.ts` | Unit tests for redirect logic |
| Modify | `worker/package.json` | Add vitest |
| Modify | `src/robots.txt` | Add Disallow: /go/ |
| Modify | `src/blog/cannabis-vaporizer-guide.md` | Add /go/ links (HTML anchors in markdown) |
| Modify | `src/_includes/layouts/blog-post.njk` | Conditional FTC disclosure |
| Modify | `src/assets/css/style.css` | Add `.affiliate-disclosure` styles |
| Create | `tests/affiliate-redirects.spec.ts` | Playwright E2E tests |

---

## Task 1: Create Shared Cloudflare Infrastructure

**Files:** None (CLI commands only)

- [ ] **Step 1: Create shared KV namespace**

```bash
cd /Users/billburkey/CascadeProjects/420blaze
wrangler kv namespace create AFFILIATE_LINKS
```

Record the returned namespace ID. This single KV namespace will be referenced by both workers.

- [ ] **Step 2: Create shared D1 database**

```bash
wrangler d1 create affiliate-analytics
```

Record the returned database ID.

- [ ] **Step 3: Apply D1 schema locally**

Create file `schema-affiliate.sql`:

```sql
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  site TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  country TEXT,
  clicked_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clicks_slug ON affiliate_clicks(slug);
CREATE INDEX IF NOT EXISTS idx_clicks_date ON affiliate_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS idx_clicks_site ON affiliate_clicks(site);
```

Apply locally:
```bash
wrangler d1 execute affiliate-analytics --local --file=schema-affiliate.sql
```

Apply to production:
```bash
wrangler d1 execute affiliate-analytics --remote --file=schema-affiliate.sql
```

- [ ] **Step 4: Commit**

```bash
git add schema-affiliate.sql
git commit -m "feat: create affiliate analytics D1 schema"
```

---

## Task 2: Write Affiliate Redirect Module + Unit Tests (420blaze)

**Files:**
- Create: `workers/seo-proxy/src/affiliate.ts`
- Create: `workers/seo-proxy/tests/affiliate.test.ts`
- Modify: `workers/seo-proxy/package.json`

- [ ] **Step 1: Add vitest to seo-proxy worker**

```bash
cd /Users/billburkey/CascadeProjects/420blaze/workers/seo-proxy
npm install -D vitest @cloudflare/workers-types
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Write the failing tests**

Create `workers/seo-proxy/tests/affiliate.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { handleAffiliateRedirect, buildRedirectUrl, isAllowedDomain } from '../src/affiliate.js';

describe('isAllowedDomain', () => {
  it('allows known affiliate domains', () => {
    expect(isAllowedDomain('https://www.planetofthevapes.com/products/venty')).toBe(true);
    expect(isAllowedDomain('https://www.storz-bickel.com/products/volcano')).toBe(true);
    expect(isAllowedDomain('https://www.pax.com/products/pax-plus')).toBe(true);
    expect(isAllowedDomain('https://arizer.com/solo3')).toBe(true);
    expect(isAllowedDomain('https://www.tvape.com/vaporizers')).toBe(true);
  });

  it('rejects unknown domains', () => {
    expect(isAllowedDomain('https://evil.com/phishing')).toBe(false);
  });

  it('rejects non-HTTPS protocols', () => {
    expect(isAllowedDomain('javascript:alert(1)')).toBe(false);
    expect(isAllowedDomain('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isAllowedDomain('http://www.planetofthevapes.com/products/venty')).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(isAllowedDomain('')).toBe(false);
    expect(isAllowedDomain('not-a-url')).toBe(false);
  });
});

describe('buildRedirectUrl', () => {
  it('appends UTM params for 420blazin', () => {
    const url = 'https://www.planetofthevapes.com/products/venty?rfsn=XXXXX';
    const result = buildRedirectUrl(url, '420blazin');
    expect(result).toContain('utm_source=420blazin');
    expect(result).toContain('utm_medium=affiliate');
    expect(result).toContain('utm_campaign=vaporizer-guide');
  });

  it('appends UTM params for weedbook', () => {
    const url = 'https://www.planetofthevapes.com/products/venty?rfsn=XXXXX';
    const result = buildRedirectUrl(url, 'weedbook');
    expect(result).toContain('utm_source=weedbook');
  });

  it('handles URLs without existing query params', () => {
    const url = 'https://www.storz-bickel.com/products/volcano-hybrid';
    const result = buildRedirectUrl(url, '420blazin');
    expect(result).toContain('?utm_source=420blazin');
  });

  it('handles URLs with existing query params', () => {
    const url = 'https://www.planetofthevapes.com/products/venty?rfsn=XXXXX';
    const result = buildRedirectUrl(url, '420blazin');
    expect(result).toContain('&utm_source=420blazin');
  });
});

describe('handleAffiliateRedirect', () => {
  const mockKV = {
    get: vi.fn(),
  };
  const mockDB = {
    prepare: vi.fn(() => ({
      bind: vi.fn(() => ({
        run: vi.fn(() => Promise.resolve()),
      })),
    })),
  };

  it('returns 302 redirect for valid slug', async () => {
    mockKV.get.mockResolvedValueOnce(JSON.stringify({
      url: 'https://www.planetofthevapes.com/products/venty?rfsn=XXXXX',
      network: 'potv-refersion',
      product: 'Storz & Bickel Venty',
    }));

    const response = await handleAffiliateRedirect(
      'venty',
      '420blazin',
      'https://420blazin.com/blog/guide.html',
      'Mozilla/5.0',
      mockKV as any,
      mockDB as any,
      { waitUntil: vi.fn() } as any,
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toContain('planetofthevapes.com');
    expect(response.headers.get('Cache-Control')).toBe('no-store, no-cache');
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer-when-downgrade');
  });

  it('returns 404 for unknown slug', async () => {
    mockKV.get.mockResolvedValueOnce(null);

    const response = await handleAffiliateRedirect(
      'nonexistent',
      '420blazin',
      null,
      'Mozilla/5.0',
      mockKV as any,
      mockDB as any,
      { waitUntil: vi.fn() } as any,
    );

    expect(response.status).toBe(404);
  });

  it('returns 400 for empty slug', async () => {
    const response = await handleAffiliateRedirect(
      '',
      '420blazin',
      null,
      'Mozilla/5.0',
      mockKV as any,
      mockDB as any,
      { waitUntil: vi.fn() } as any,
    );

    expect(response.status).toBe(404);
  });

  it('returns 403 for slug with path traversal', async () => {
    const response = await handleAffiliateRedirect(
      '../../etc/passwd',
      '420blazin',
      null,
      'Mozilla/5.0',
      mockKV as any,
      mockDB as any,
      { waitUntil: vi.fn() } as any,
    );

    expect(response.status).toBe(404);
  });

  it('returns 502 when KV returns malformed JSON', async () => {
    mockKV.get.mockResolvedValueOnce('not valid json');

    const response = await handleAffiliateRedirect(
      'broken',
      '420blazin',
      null,
      'Mozilla/5.0',
      mockKV as any,
      mockDB as any,
      { waitUntil: vi.fn() } as any,
    );

    expect(response.status).toBe(502);
  });

  it('returns 502 when KV data has non-HTTPS url', async () => {
    mockKV.get.mockResolvedValueOnce(JSON.stringify({
      url: 'javascript:alert(1)',
      network: 'evil',
      product: 'Hack',
    }));

    const response = await handleAffiliateRedirect(
      'evil',
      '420blazin',
      null,
      'Mozilla/5.0',
      mockKV as any,
      mockDB as any,
      { waitUntil: vi.fn() } as any,
    );

    expect(response.status).toBe(502);
  });

  it('returns 502 when KV data has disallowed domain', async () => {
    mockKV.get.mockResolvedValueOnce(JSON.stringify({
      url: 'https://evil.com/phishing',
      network: 'unknown',
      product: 'Scam',
    }));

    const response = await handleAffiliateRedirect(
      'scam',
      '420blazin',
      null,
      'Mozilla/5.0',
      mockKV as any,
      mockDB as any,
      { waitUntil: vi.fn() } as any,
    );

    expect(response.status).toBe(502);
  });

  it('logs click to D1 via waitUntil', async () => {
    mockKV.get.mockResolvedValueOnce(JSON.stringify({
      url: 'https://www.planetofthevapes.com/products/venty?rfsn=XXXXX',
      network: 'potv-refersion',
      product: 'Storz & Bickel Venty',
    }));

    const waitUntil = vi.fn();

    await handleAffiliateRedirect(
      'venty',
      '420blazin',
      'https://420blazin.com/blog/guide.html',
      'Mozilla/5.0',
      mockKV as any,
      mockDB as any,
      { waitUntil } as any,
    );

    expect(waitUntil).toHaveBeenCalledTimes(1);
  });

  it('still redirects when D1 write fails', async () => {
    mockKV.get.mockResolvedValueOnce(JSON.stringify({
      url: 'https://www.planetofthevapes.com/products/venty?rfsn=XXXXX',
      network: 'potv-refersion',
      product: 'Storz & Bickel Venty',
    }));

    const failingDB = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          run: vi.fn(() => Promise.reject(new Error('D1 down'))),
        })),
      })),
    };

    const response = await handleAffiliateRedirect(
      'venty',
      '420blazin',
      null,
      'Mozilla/5.0',
      mockKV as any,
      failingDB as any,
      { waitUntil: vi.fn() } as any,
    );

    expect(response.status).toBe(302);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd /Users/billburkey/CascadeProjects/420blaze/workers/seo-proxy
npx vitest run
```

Expected: FAIL — `affiliate.ts` does not exist yet.

- [ ] **Step 4: Write the affiliate redirect module**

Create `workers/seo-proxy/src/affiliate.ts`:

```typescript
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

// Security: only redirect to known affiliate/retailer domains
const ALLOWED_DOMAINS = new Set([
  'www.planetofthevapes.com', 'planetofthevapes.com',
  'www.storz-bickel.com', 'storz-bickel.com',
  'www.pax.com', 'pax.com',
  'arizer.com', 'www.arizer.com',
  'www.tvape.com', 'tvape.com',
  'www.vapor.com', 'vapor.com',
  'www.awin1.com', 'awin1.com', // AWIN redirect domain
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
  // Validate slug format (alphanumeric + hyphens, 2-50 chars)
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

  // Security: validate URL is HTTPS and on an allowed domain
  if (!link.url || !isAllowedDomain(link.url)) {
    return new Response('Bad Gateway', { status: 502 });
  }

  const redirectUrl = buildRedirectUrl(link.url, site);

  // Log click non-blocking — analytics must never block redirects
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
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/billburkey/CascadeProjects/420blaze/workers/seo-proxy
npx vitest run
```

Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/billburkey/CascadeProjects/420blaze
git add workers/seo-proxy/src/affiliate.ts workers/seo-proxy/tests/affiliate.test.ts workers/seo-proxy/package.json workers/seo-proxy/package-lock.json
git commit -m "feat: add affiliate redirect module with unit tests"
```

---

## Task 3: Integrate Affiliate Redirects into 420blaze SEO Proxy

**Files:**
- Modify: `workers/seo-proxy/wrangler.toml`
- Modify: `workers/seo-proxy/src/index.ts`

- [ ] **Step 1: Add KV + D1 bindings to wrangler.toml**

Add to `workers/seo-proxy/wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "AFFILIATE_LINKS"
id = "<KV_NAMESPACE_ID_FROM_TASK_1>"

[[d1_databases]]
binding = "AFFILIATE_DB"
database_name = "affiliate-analytics"
database_id = "<D1_DATABASE_ID_FROM_TASK_1>"
```

- [ ] **Step 2: Update Env interface and add /go/ handler to index.ts**

In `workers/seo-proxy/src/index.ts`, update the Env interface:

```typescript
interface Env {
  BEAST_SEO: KVNamespace;
  AFFILIATE_LINKS: KVNamespace;
  AFFILIATE_DB: D1Database;
}
```

Add /go/ handler and update robots.txt BEFORE the `fetch(request)` call:

```typescript
import { handleAffiliateRedirect } from './affiliate.js';

// ... inside fetch handler, after sitemap and BEFORE the origin fetch:

    // Affiliate redirects
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
```

Update the ROBOTS constant to add Disallow:

```typescript
const ROBOTS = `User-agent: *
Allow: /
Disallow: /go/
Sitemap: https://420blazin.com/sitemap.xml`;
```

Note: The `fetch` handler needs `ctx` (ExecutionContext) as the third parameter. Update the handler signature:

```typescript
async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
```

- [ ] **Step 3: Run unit tests to verify nothing broke**

```bash
cd /Users/billburkey/CascadeProjects/420blaze/workers/seo-proxy
npx vitest run
```

Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
cd /Users/billburkey/CascadeProjects/420blaze
git add workers/seo-proxy/wrangler.toml workers/seo-proxy/src/index.ts
git commit -m "feat: wire affiliate redirects into 420blazin seo-proxy"
```

---

## Task 4: Integrate Affiliate Redirects into Weedbook Worker

**Files:**
- Modify: `worker/wrangler.toml` (in weedbook project)
- Modify: `worker/src/index.ts` (in weedbook project)
- Create: `worker/src/affiliate.ts` (in weedbook project)
- Create: `worker/tests/affiliate.test.ts` (in weedbook project)
- Modify: `worker/package.json` (in weedbook project)
- Modify: `src/robots.txt` (in weedbook project)

- [ ] **Step 1: Add vitest to weedbook worker**

```bash
cd /Users/billburkey/CascadeProjects/weedbook/worker
npm install -D vitest
```

Add to `worker/package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Copy affiliate module to weedbook worker**

Create `worker/src/affiliate.ts` — identical to the 420blaze version (same file from Task 2, Step 4).

- [ ] **Step 3: Copy unit tests to weedbook worker**

Create `worker/tests/affiliate.test.ts` — identical to the 420blaze version (same file from Task 2, Step 2), but update the site name in tests from `'420blazin'` to `'weedbook'` where relevant.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/billburkey/CascadeProjects/weedbook/worker
npx vitest run
```

Expected: ALL PASS

- [ ] **Step 5: Add KV + D1 bindings and route to wrangler.toml**

Note: Workers routes take precedence over CF Pages for matching patterns on the same zone. Adding `weedaseniorsguide.com/go/*` as a route means the worker handles ONLY /go/* requests; all other traffic continues to CF Pages normally.

Update `worker/wrangler.toml`:

```toml
name = "weedbook-api"
main = "src/index.ts"
compatibility_date = "2024-12-01"

[[d1_databases]]
binding = "DB"
database_name = "weedbook-subscribers"
database_id = "eb038ff4-a2b6-4a7c-a1dd-9a0d07995d90"

[[d1_databases]]
binding = "AFFILIATE_DB"
database_name = "affiliate-analytics"
database_id = "<D1_DATABASE_ID_FROM_TASK_1>"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "weedbook-assets"

[[kv_namespaces]]
binding = "AFFILIATE_LINKS"
id = "<KV_NAMESPACE_ID_FROM_TASK_1>"

[[routes]]
pattern = "weedaseniorsguide.com/go/*"
zone_name = "weedaseniorsguide.com"
```

- [ ] **Step 6: Add /go/ handler to weedbook worker index.ts**

In `worker/src/index.ts`, update the Env interface:

```typescript
interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  RESEND_API_KEY: string;
  AFFILIATE_LINKS: KVNamespace;
  AFFILIATE_DB: D1Database;
}
```

Add the /go/ handler in the fetch function, before the 404 return:

```typescript
import { handleAffiliateRedirect } from './affiliate.js';

// ... inside fetch handler, after OPTIONS and before 404:

    if (url.pathname.startsWith('/go/')) {
      const slug = url.pathname.replace('/go/', '');
      if (!slug) return new Response('Not Found', { status: 404 });
      return handleAffiliateRedirect(
        slug,
        'weedbook',
        request.headers.get('Referer'),
        request.headers.get('User-Agent'),
        env.AFFILIATE_LINKS,
        env.AFFILIATE_DB,
        ctx,
      );
    }
```

Update the fetch handler signature to include `ctx`:

```typescript
async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
```

- [ ] **Step 7: Update robots.txt**

In `src/robots.txt`, add the Disallow line:

```
User-agent: *
Allow: /
Disallow: /go/

Sitemap: https://weedaseniorsguide.com/sitemap.xml
```

- [ ] **Step 8: Run unit tests**

```bash
cd /Users/billburkey/CascadeProjects/weedbook/worker
npx vitest run
```

Expected: ALL PASS

- [ ] **Step 9: Commit**

```bash
cd /Users/billburkey/CascadeProjects/weedbook
git add worker/src/affiliate.ts worker/src/index.ts worker/wrangler.toml worker/tests/affiliate.test.ts worker/package.json worker/package-lock.json src/robots.txt
git commit -m "feat: add affiliate redirect system to weedbook worker"
```

---

## Task 5: Add FTC Disclosure Styles to Both Sites

**Files:**
- Modify: `/Users/billburkey/CascadeProjects/420blaze/css/style.css`
- Modify: `/Users/billburkey/CascadeProjects/weedbook/src/assets/css/style.css`

- [ ] **Step 1: Add disclosure CSS to 420blaze**

Append to `css/style.css`:

```css
/* Affiliate Disclosure */
.affiliate-disclosure {
  background: #f0f7f2;
  border: 1px solid #d4e8d4;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin: 0 0 2rem;
  font-size: 0.85rem;
  color: #555;
  line-height: 1.6;
}
.affiliate-disclosure strong {
  color: #333;
}
.aff-tag {
  font-size: 0.75rem;
  color: #888;
  font-style: italic;
}
```

- [ ] **Step 2: Add disclosure CSS to weedbook**

Append to `src/assets/css/style.css`:

```css
/* Affiliate Disclosure */
.affiliate-disclosure {
  background: #faf8f5;
  border: 1px solid #e0ddd4;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin: 0 0 2rem;
  font-size: 0.85rem;
  color: #666;
  line-height: 1.6;
}
.affiliate-disclosure strong {
  color: var(--text-color, #333);
}
```

- [ ] **Step 3: Commit both**

```bash
cd /Users/billburkey/CascadeProjects/420blaze
git add css/style.css
git commit -m "feat: add affiliate disclosure CSS"

cd /Users/billburkey/CascadeProjects/weedbook
git add src/assets/css/style.css
git commit -m "feat: add affiliate disclosure CSS"
```

---

## Task 6: Update 420blaze Blog Posts with Affiliate Links + Disclosure

**Files:**
- Modify: `blog/cannabis-vaporizer-guide.html`
- Modify: `blog/wake-and-bake-protocol.html`

- [ ] **Step 1: Add FTC disclosure to vaporizer guide**

In `blog/cannabis-vaporizer-guide.html`, insert immediately after the `<div class="blog-content">` opening tag (BEFORE the `<p class="blog-lead">` paragraph):

```html
            <div class="affiliate-disclosure">
                <strong>Affiliate Disclosure:</strong> This article contains affiliate links to vaporizer products. If you purchase through these links, we may earn a commission at no extra cost to you. Our recommendations are based on hands-on research and are not influenced by affiliate partnerships. <a href="../about.html">Learn more</a>.
            </div>
```

- [ ] **Step 2: Replace product names with /go/ links in vaporizer guide**

In `blog/cannabis-vaporizer-guide.html`, add affiliate links to the FIRST mention of each device in its review section heading, and in the "Bottom Line" section. Also update the "Where to Buy" retailer table.

Device headings — wrap the device name in an affiliate link:

```html
<!-- In each device section heading, link the device name -->
<h3>1. Storz &amp; Bickel Venty &mdash; Best Overall Portable ($314&ndash;$449)</h3>
<!-- becomes: -->
<h3>1. <a href="/go/venty" rel="nofollow sponsored" target="_blank">Storz &amp; Bickel Venty</a> &mdash; Best Overall Portable ($314&ndash;$449)</h3>
```

Apply the same pattern for:
- `mighty-plus` → Mighty+ heading
- `arizer-solo-3` → Solo 3 heading
- `pax-plus` → PAX Plus heading
- `potv-lobo` → POTV Lobo heading
- `volcano-hybrid` → Volcano Hybrid desktop section
- `xmax-v3-pro` → XMAX V3 Pro mention

Bottom Line section — link device names:
```html
<strong>First vaporizer:</strong> Get the <strong><a href="/go/mighty-plus" rel="nofollow sponsored" target="_blank">Storz &amp; Bickel Mighty+</a></strong>
```

Where to Buy table — link retailer names:
```html
<td><strong><a href="/go/potv-store" rel="nofollow sponsored" target="_blank">Planet of the Vapes</a></strong></td>
<td><strong><a href="/go/sb-store" rel="nofollow sponsored" target="_blank">Storz &amp; Bickel Direct</a></strong></td>
```

**Important:** Only link FIRST mention in each section + the Bottom Line + Where to Buy. Do NOT link every occurrence.

- [ ] **Step 3: Add disclosure to wake-and-bake post (if vaporizer devices are mentioned)**

In `blog/wake-and-bake-protocol.html`, check if vaporizer devices are mentioned. If so, add the same disclosure block after `<div class="blog-content">` and link any device mentions with /go/ slugs.

- [ ] **Step 4: Commit**

```bash
cd /Users/billburkey/CascadeProjects/420blaze
git add blog/cannabis-vaporizer-guide.html blog/wake-and-bake-protocol.html
git commit -m "feat: add affiliate links and FTC disclosure to 420blazin blog posts"
```

---

## Task 7: Update Weedbook Blog Posts with Affiliate Links + Disclosure

**Files:**
- Modify: `src/_includes/layouts/blog-post.njk`
- Modify: `src/blog/cannabis-vaporizer-guide.md`

- [ ] **Step 1: Add conditional FTC disclosure to blog-post.njk**

In `src/_includes/layouts/blog-post.njk`, add a conditional disclosure block inside the content area, before `{{ content | safe }}`:

```nunjucks
---
layout: layouts/base.njk
---
<article class="blog-post">
  <div class="content-width">
    <header class="blog-post-header">
      <time datetime="{{ date | htmlDateString }}">{{ date | readableDate }}</time>
      <h1>{{ title }}</h1>
    </header>
    <div class="blog-post-content">
      {% if hasAffiliateLinks %}
      <div class="affiliate-disclosure">
        <strong>Affiliate Disclosure:</strong> This article contains affiliate links to vaporizer products. If you purchase through these links, we may earn a commission at no extra cost to you. Our recommendations are based on hands-on research and are not influenced by affiliate partnerships.
      </div>
      {% endif %}
      {{ content | safe }}
    </div>
    {% include "components/share-buttons.njk" %}
    {% set bannerText = "Get the complete cannabis guide for seniors" %}
    {% set bannerUrl = "/newsletter/" %}
    {% set bannerButton = "Download Free Chapter" %}
    {% include "components/cta-banner.njk" %}
    {% include "components/disclaimer.njk" %}
  </div>
</article>
```

- [ ] **Step 2: Add frontmatter flag and affiliate links to vaporizer guide**

In `src/blog/cannabis-vaporizer-guide.md`, add `hasAffiliateLinks: true` to frontmatter:

```yaml
---
title: "The Complete Guide to Cannabis Vaporizers for Seniors: Devices, Temperature Science, and Best Practices"
date: 2026-03-22
excerpt: "If you're considering switching from smoking to vaporizing cannabis, this guide covers everything."
metaTitle: "Cannabis Vaporizer Guide for Seniors 2026"
metaDescription: "Everything seniors need to know about dry herb cannabis vaporizers."
hasAffiliateLinks: true
---
```

Replace device name first-mentions and the "Where to Buy" section with HTML affiliate links:

```html
### Best Overall: <a href="/go/mighty-plus" rel="nofollow sponsored" target="_blank">Storz and Bickel Mighty+</a> (~$250–$300)
```

And in the Bottom Line section:

```html
**If you are ready to try:** The <a href="/go/mighty-plus" rel="nofollow sponsored" target="_blank">Storz and Bickel Mighty+</a> ($250 to $300) is the safest recommendation.

**If you want to test the waters:** The <a href="/go/xmax-v3-pro" rel="nofollow sponsored" target="_blank">XMAX V3 Pro</a> ($80 to $110) will show you what vaporization is about.

**If flavor matters most:** The <a href="/go/arizer-solo-3" rel="nofollow sponsored" target="_blank">Arizer Solo 3</a> ($180) delivers the purest taste.
```

And in the Where to Buy table, convert to HTML table with affiliate links:

```html
<table>
<thead><tr><th>Retailer</th><th>Why Buy Here</th></tr></thead>
<tbody>
<tr><td><a href="/go/potv-store" rel="nofollow sponsored" target="_blank"><strong>Planet of the Vapes</strong></a></td><td>Largest selection, expert reviews, free shipping</td></tr>
<tr><td><a href="/go/sb-store" rel="nofollow sponsored" target="_blank"><strong>Storz and Bickel Direct</strong></a></td><td>Factory-direct, 3-year warranty</td></tr>
<tr><td><strong>Arizer Direct</strong> (arizer.com)</td><td>Best Solo 3 prices, lifetime heater warranty</td></tr>
<tr><td><strong>PAX Direct</strong> (pax.com)</td><td>Only guaranteed authentic source, 10-year warranty</td></tr>
</tbody>
</table>
```

Note: Arizer and PAX are NOT linked as affiliate links since POTV pays 0% on PAX and Arizer direct doesn't have a confirmed program yet. Link only where there's an active affiliate relationship.

- [ ] **Step 3: Build 11ty and verify output**

```bash
cd /Users/billburkey/CascadeProjects/weedbook
npm run build
```

Check `_site/blog/cannabis-vaporizer-guide/index.html` to verify:
- Disclosure div appears before content
- Affiliate links have correct `rel` and `target` attributes
- Links point to `/go/` paths

- [ ] **Step 4: Commit**

```bash
cd /Users/billburkey/CascadeProjects/weedbook
git add src/_includes/layouts/blog-post.njk src/blog/cannabis-vaporizer-guide.md
git commit -m "feat: add affiliate links and FTC disclosure to weedbook vaporizer guide"
```

---

## Task 8: Seed KV with Affiliate Link Mappings

**Files:** None (CLI commands)

- [ ] **Step 1: Create seed script**

Create `seed-affiliate-links.sh` (in 420blaze root):

```bash
#!/bin/bash
# Seed affiliate link KV data
# NOTE: Replace XXXXX with actual Refersion affiliate codes once Bill has them
# For now, use placeholder URLs that will be updated after POTV/AWIN approval

KV_NS_ID="<KV_NAMESPACE_ID_FROM_TASK_1>"

# POTV products (15% commission)
wrangler kv key put --namespace-id=$KV_NS_ID "venty" '{"url":"https://www.planetofthevapes.com/products/storz-and-bickel-venty?rfsn=PLACEHOLDER","network":"potv-refersion","product":"Storz & Bickel Venty","commission_rate":"15%","avg_price":375}'

wrangler kv key put --namespace-id=$KV_NS_ID "mighty-plus" '{"url":"https://www.planetofthevapes.com/products/mighty-plus-vaporizer?rfsn=PLACEHOLDER","network":"potv-refersion","product":"Storz & Bickel Mighty+","commission_rate":"15%","avg_price":275}'

wrangler kv key put --namespace-id=$KV_NS_ID "arizer-solo-3" '{"url":"https://www.planetofthevapes.com/products/arizer-solo-3?rfsn=PLACEHOLDER","network":"potv-refersion","product":"Arizer Solo 3","commission_rate":"10%","avg_price":220}'

wrangler kv key put --namespace-id=$KV_NS_ID "potv-lobo" '{"url":"https://www.planetofthevapes.com/products/potv-lobo?rfsn=PLACEHOLDER","network":"potv-refersion","product":"POTV Lobo","commission_rate":"15%","avg_price":150}'

wrangler kv key put --namespace-id=$KV_NS_ID "xmax-v3-pro" '{"url":"https://www.planetofthevapes.com/products/xmax-v3-pro?rfsn=PLACEHOLDER","network":"potv-refersion","product":"XMAX V3 Pro","commission_rate":"15%","avg_price":100}'

# S&B Direct via AWIN (5% commission) - Volcano excluded from POTV
wrangler kv key put --namespace-id=$KV_NS_ID "volcano-hybrid" '{"url":"https://www.storz-bickel.com/products/volcano-hybrid?AWIN_PLACEHOLDER","network":"awin-sb","product":"Storz & Bickel Volcano Hybrid","commission_rate":"5%","avg_price":600}'

# PAX - no confirmed affiliate program, link direct without tracking
wrangler kv key put --namespace-id=$KV_NS_ID "pax-plus" '{"url":"https://www.pax.com/products/pax-plus","network":"direct","product":"PAX Plus","commission_rate":"0%","avg_price":175}'

wrangler kv key put --namespace-id=$KV_NS_ID "pax-flow" '{"url":"https://www.pax.com/products/pax-flow","network":"direct","product":"PAX Flow","commission_rate":"0%","avg_price":250}'

# Store homepages
wrangler kv key put --namespace-id=$KV_NS_ID "potv-store" '{"url":"https://www.planetofthevapes.com/?rfsn=PLACEHOLDER","network":"potv-refersion","product":"POTV Store","commission_rate":"15%"}'

wrangler kv key put --namespace-id=$KV_NS_ID "sb-store" '{"url":"https://www.storz-bickel.com/?AWIN_PLACEHOLDER","network":"awin-sb","product":"S&B Store","commission_rate":"5%"}'

echo "Done. Remember to update PLACEHOLDER values after affiliate program approval."
```

- [ ] **Step 2: Run the seed script**

```bash
cd /Users/billburkey/CascadeProjects/420blaze
chmod +x seed-affiliate-links.sh
bash seed-affiliate-links.sh
```

- [ ] **Step 3: Verify KV data**

```bash
wrangler kv key get --namespace-id=<KV_NS_ID> "venty"
wrangler kv key get --namespace-id=<KV_NS_ID> "mighty-plus"
```

Expected: JSON objects with url, network, product fields.

- [ ] **Step 4: Commit seed script**

```bash
cd /Users/billburkey/CascadeProjects/420blaze
git add seed-affiliate-links.sh
git commit -m "feat: add affiliate link KV seed script"
```

---

## Task 9: Playwright E2E Tests — 420blaze

**Files:**
- Create: `tests/affiliate-redirects.spec.ts` (in 420blaze)

- [ ] **Step 1: Write E2E tests**

Create `tests/affiliate-redirects.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

const SLUGS = [
  'venty', 'mighty-plus', 'arizer-solo-3', 'potv-lobo',
  'xmax-v3-pro', 'volcano-hybrid', 'pax-plus', 'pax-flow',
  'potv-store', 'sb-store',
];

test.describe('Affiliate Redirect System', () => {
  test.describe('/go/ redirects', () => {
    for (const slug of SLUGS) {
      test(`/go/${slug} returns 302 redirect`, async ({ request }) => {
        const response = await request.get(`/go/${slug}`, {
          maxRedirects: 0,
        });
        expect(response.status()).toBe(302);
        expect(response.headers()['location']).toBeTruthy();
        expect(response.headers()['cache-control']).toBe('no-store, no-cache');
        expect(response.headers()['x-robots-tag']).toBe('noindex');
      });
    }

    test('/go/nonexistent returns 404', async ({ request }) => {
      const response = await request.get('/go/nonexistent', {
        maxRedirects: 0,
      });
      expect(response.status()).toBe(404);
    });

    test('/go/ with no slug returns 404', async ({ request }) => {
      const response = await request.get('/go/', {
        maxRedirects: 0,
      });
      expect(response.status()).toBe(404);
    });
  });

  test.describe('robots.txt', () => {
    test('robots.txt disallows /go/', async ({ request }) => {
      const response = await request.get('/robots.txt');
      const text = await response.text();
      expect(text).toContain('Disallow: /go/');
    });
  });
});

test.describe('Blog Post Affiliate Integration', () => {
  test.describe('Vaporizer Guide', () => {
    test('has FTC disclosure at top of content', async ({ page }) => {
      await page.goto('/blog/cannabis-vaporizer-guide.html');
      const disclosure = page.locator('.affiliate-disclosure');
      await expect(disclosure).toBeVisible();
      await expect(disclosure).toContainText('Affiliate Disclosure');
      await expect(disclosure).toContainText('affiliate links');

      // Disclosure should appear before the first heading
      const disclosureBox = await disclosure.boundingBox();
      const firstH2 = page.locator('.blog-content h2').first();
      const h2Box = await firstH2.boundingBox();
      expect(disclosureBox!.y).toBeLessThan(h2Box!.y);
    });

    test('affiliate links use /go/ paths', async ({ page }) => {
      await page.goto('/blog/cannabis-vaporizer-guide.html');
      const affiliateLinks = page.locator('a[href^="/go/"]');
      const count = await affiliateLinks.count();
      expect(count).toBeGreaterThan(5); // At least the major devices + retailers
    });

    test('affiliate links have correct rel attributes', async ({ page }) => {
      await page.goto('/blog/cannabis-vaporizer-guide.html');
      const affiliateLinks = page.locator('a[href^="/go/"]');
      const count = await affiliateLinks.count();

      for (let i = 0; i < count; i++) {
        const rel = await affiliateLinks.nth(i).getAttribute('rel');
        expect(rel).toContain('nofollow');
        expect(rel).toContain('sponsored');
      }
    });

    test('affiliate links open in new tab', async ({ page }) => {
      await page.goto('/blog/cannabis-vaporizer-guide.html');
      const affiliateLinks = page.locator('a[href^="/go/"]');
      const count = await affiliateLinks.count();

      for (let i = 0; i < count; i++) {
        const target = await affiliateLinks.nth(i).getAttribute('target');
        expect(target).toBe('_blank');
      }
    });

    test('no raw affiliate URLs in page source', async ({ page }) => {
      await page.goto('/blog/cannabis-vaporizer-guide.html');
      const content = await page.content();
      expect(content).not.toContain('rfsn=');
      expect(content).not.toContain('planetofthevapes.com/products');
      expect(content).not.toContain('AWIN_');
    });
  });
});

test.describe('Regression — Existing Functionality', () => {
  test('homepage still loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('blog index still loads', async ({ page }) => {
    await page.goto('/blog.html');
    await expect(page).toHaveTitle(/420Blazin/);
  });

  test('wake-and-bake post still loads', async ({ page }) => {
    await page.goto('/blog/wake-and-bake-protocol.html');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('navigation still works', async ({ page }) => {
    await page.goto('/');
    const navLinks = page.locator('nav a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(5);
  });

  test('merch page still loads', async ({ page }) => {
    await page.goto('/merch.html');
    await expect(page).toHaveTitle(/420Blazin/);
  });
});
```

- [ ] **Step 2: Run E2E tests locally**

This requires the site running locally or against production. For local testing against deployed site:

```bash
cd /Users/billburkey/CascadeProjects/420blaze
npx playwright test tests/affiliate-redirects.spec.ts --reporter=list
```

Note: /go/ redirects require the worker to be deployed. Run against production URL or use `wrangler dev` for the seo-proxy worker.

- [ ] **Step 3: Commit**

```bash
cd /Users/billburkey/CascadeProjects/420blaze
git add tests/affiliate-redirects.spec.ts
git commit -m "test: add Playwright E2E tests for affiliate redirect system"
```

---

## Task 10: Playwright E2E Tests — Weedbook

**Files:**
- Create: `tests/affiliate-redirects.spec.ts` (in weedbook)

- [ ] **Step 1: Write E2E tests**

Create `tests/affiliate-redirects.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

const SLUGS = [
  'mighty-plus', 'arizer-solo-3', 'xmax-v3-pro',
  'potv-store', 'sb-store',
];

test.describe('Affiliate Redirect System', () => {
  test.describe('/go/ redirects', () => {
    // Note: These tests require the worker deployed or running via wrangler dev
    // They test against the live domain, not the local 11ty server
    for (const slug of SLUGS) {
      test.skip(`/go/${slug} returns 302 redirect`, async ({ request }) => {
        const response = await request.get(`https://weedaseniorsguide.com/go/${slug}`, {
          maxRedirects: 0,
        });
        expect(response.status()).toBe(302);
        expect(response.headers()['location']).toBeTruthy();
        expect(response.headers()['cache-control']).toBe('no-store, no-cache');
      });
    }
  });
});

test.describe('Blog Post Affiliate Integration', () => {
  test('vaporizer guide has FTC disclosure', async ({ page }) => {
    await page.goto('/blog/cannabis-vaporizer-guide/');
    const disclosure = page.locator('.affiliate-disclosure');
    await expect(disclosure).toBeVisible();
    await expect(disclosure).toContainText('Affiliate Disclosure');
  });

  test('vaporizer guide has affiliate links with /go/ paths', async ({ page }) => {
    await page.goto('/blog/cannabis-vaporizer-guide/');
    const affiliateLinks = page.locator('a[href^="/go/"]');
    const count = await affiliateLinks.count();
    expect(count).toBeGreaterThan(3);
  });

  test('affiliate links have nofollow sponsored rel', async ({ page }) => {
    await page.goto('/blog/cannabis-vaporizer-guide/');
    const affiliateLinks = page.locator('a[href^="/go/"]');
    const count = await affiliateLinks.count();

    for (let i = 0; i < count; i++) {
      const rel = await affiliateLinks.nth(i).getAttribute('rel');
      expect(rel).toContain('nofollow');
      expect(rel).toContain('sponsored');
    }
  });

  test('non-affiliate blog posts do NOT have disclosure', async ({ page }) => {
    await page.goto('/blog/thc-dosage-guide-seniors/');
    const disclosure = page.locator('.affiliate-disclosure');
    await expect(disclosure).toHaveCount(0);
  });

  test('no raw affiliate URLs in vaporizer guide', async ({ page }) => {
    await page.goto('/blog/cannabis-vaporizer-guide/');
    const content = await page.content();
    expect(content).not.toContain('rfsn=');
    expect(content).not.toContain('planetofthevapes.com/products');
  });
});

test.describe('Regression — Existing Functionality', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('blog index loads with all posts', async ({ page }) => {
    await page.goto('/blog/');
    const posts = page.locator('article, .blog-post-link, a[href*="/blog/"]');
    const count = await posts.count();
    expect(count).toBeGreaterThan(3);
  });

  test('dosage guide still loads without disclosure', async ({ page }) => {
    await page.goto('/blog/thc-dosage-guide-seniors/');
    await expect(page.locator('h1')).toContainText('Dosage');
  });

  test('safety page still loads', async ({ page }) => {
    await page.goto('/safety/');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('newsletter form still exists', async ({ page }) => {
    await page.goto('/newsletter/');
    const form = page.locator('form');
    await expect(form).toBeVisible();
  });

  test('robots.txt has /go/ disallow', async ({ page }) => {
    const response = await page.goto('/robots.txt');
    const text = await response!.text();
    expect(text).toContain('Disallow: /go/');
  });
});
```

- [ ] **Step 2: Build site and run tests locally**

```bash
cd /Users/billburkey/CascadeProjects/weedbook
npm run build
npx playwright test tests/affiliate-redirects.spec.ts --reporter=list
```

Note: The local 11ty server serves blog content. /go/ redirect tests are marked `.skip` since they require the deployed worker.

- [ ] **Step 3: Run existing smoke tests to verify no regression**

```bash
cd /Users/billburkey/CascadeProjects/weedbook
npm run test:smoke
```

Expected: ALL 99+ existing tests PASS

- [ ] **Step 4: Commit**

```bash
cd /Users/billburkey/CascadeProjects/weedbook
git add tests/affiliate-redirects.spec.ts
git commit -m "test: add Playwright E2E and regression tests for affiliate system"
```

---

## Task 11: Deploy and Production Smoke Test

- [ ] **Step 1: Deploy 420blaze seo-proxy worker**

```bash
cd /Users/billburkey/CascadeProjects/420blaze/workers/seo-proxy
npm install
wrangler deploy
```

- [ ] **Step 2: Deploy weedbook worker**

```bash
cd /Users/billburkey/CascadeProjects/weedbook/worker
npm install
wrangler deploy
```

- [ ] **Step 3: Deploy weedbook static site**

```bash
cd /Users/billburkey/CascadeProjects/weedbook
npm run build
wrangler pages deploy _site/
```

- [ ] **Step 4: Production smoke test — 420blaze**

```bash
# Test redirect
curl -I https://420blazin.com/go/venty
# Expected: HTTP/2 302, Location: planetofthevapes.com...

# Test 404
curl -I https://420blazin.com/go/nonexistent
# Expected: HTTP/2 404

# Test robots.txt
curl https://420blazin.com/robots.txt
# Expected: Contains "Disallow: /go/"

# Test blog post
curl -s https://420blazin.com/blog/cannabis-vaporizer-guide.html | grep -c 'affiliate-disclosure'
# Expected: 1

# Test no raw affiliate URLs
curl -s https://420blazin.com/blog/cannabis-vaporizer-guide.html | grep -c 'rfsn='
# Expected: 0
```

- [ ] **Step 5: Production smoke test — weedbook**

```bash
# Test redirect
curl -I https://weedaseniorsguide.com/go/mighty-plus
# Expected: HTTP/2 302, Location: planetofthevapes.com...

# Test robots.txt
curl https://weedaseniorsguide.com/robots.txt
# Expected: Contains "Disallow: /go/"

# Test blog post
curl -s https://weedaseniorsguide.com/blog/cannabis-vaporizer-guide/ | grep -c 'affiliate-disclosure'
# Expected: 1
```

- [ ] **Step 6: Run full Playwright E2E against production**

```bash
# 420blaze
cd /Users/billburkey/CascadeProjects/420blaze
BASE_URL=https://420blazin.com npx playwright test tests/affiliate-redirects.spec.ts

# Weedbook
cd /Users/billburkey/CascadeProjects/weedbook
BASE_URL=https://weedaseniorsguide.com npx playwright test tests/affiliate-redirects.spec.ts
```

- [ ] **Step 7: Verify D1 analytics captured clicks**

```bash
wrangler d1 execute affiliate-analytics --remote --command "SELECT slug, site, COUNT(*) as clicks FROM affiliate_clicks GROUP BY slug, site"
```

Expected: Rows showing test clicks from the curl/playwright tests above.

- [ ] **Step 8: Final commit with deployment notes**

```bash
cd /Users/billburkey/CascadeProjects/420blaze
git add -A
git commit -m "deploy: affiliate redirect system live on 420blazin.com"

cd /Users/billburkey/CascadeProjects/weedbook
git add -A
git commit -m "deploy: affiliate redirect system live on weedaseniorsguide.com"
```

---

## Post-Deployment: Bill's Manual Steps

These are NOT Claude Code tasks. Bill needs to do these himself:

1. **Sign up for POTV Refersion** at `planetofthevapes.refersion.com`
2. **Sign up for AWIN** at `awin.com` ($5 refundable deposit)
3. **Apply to S&B program** on AWIN (Advertiser ID 15607)
4. **Once approved:** Update KV values with real affiliate codes:
   ```bash
   wrangler kv key put --namespace-id=<ID> "venty" '{"url":"https://www.planetofthevapes.com/products/storz-and-bickel-venty?rfsn=REAL_CODE",...}'
   ```
5. **Set up ACH payments** from Refersion (NOT PayPal)
6. **Verify bank** accepts vaporizer affiliate deposits
7. **Set weekly reminder** to check Refersion + AWIN dashboards
