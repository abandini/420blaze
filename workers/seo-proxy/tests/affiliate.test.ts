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
  function freshMocks() {
    return {
      kv: { get: vi.fn() },
      db: {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            run: vi.fn(() => Promise.resolve()),
          })),
        })),
      },
      ctx: { waitUntil: vi.fn() },
    };
  }

  it('returns 302 redirect for valid slug', async () => {
    const { kv, db, ctx } = freshMocks();
    kv.get.mockResolvedValueOnce(JSON.stringify({
      url: 'https://www.planetofthevapes.com/products/venty?rfsn=XXXXX',
      network: 'potv-refersion',
      product: 'Storz & Bickel Venty',
    }));

    const response = await handleAffiliateRedirect(
      'venty', '420blazin', 'https://420blazin.com/blog/guide.html', 'Mozilla/5.0',
      kv as any, db as any, ctx as any,
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toContain('planetofthevapes.com');
    expect(response.headers.get('Cache-Control')).toBe('no-store, no-cache');
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer-when-downgrade');
  });

  it('returns 404 for unknown slug', async () => {
    const { kv, db, ctx } = freshMocks();
    kv.get.mockResolvedValueOnce(null);
    const response = await handleAffiliateRedirect(
      'nonexistent', '420blazin', null, 'Mozilla/5.0',
      kv as any, db as any, ctx as any,
    );
    expect(response.status).toBe(404);
  });

  it('returns 404 for empty slug', async () => {
    const { kv, db, ctx } = freshMocks();
    const response = await handleAffiliateRedirect(
      '', '420blazin', null, 'Mozilla/5.0',
      kv as any, db as any, ctx as any,
    );
    expect(response.status).toBe(404);
  });

  it('returns 404 for slug with path traversal', async () => {
    const { kv, db, ctx } = freshMocks();
    const response = await handleAffiliateRedirect(
      '../../etc/passwd', '420blazin', null, 'Mozilla/5.0',
      kv as any, db as any, ctx as any,
    );
    expect(response.status).toBe(404);
  });

  it('returns 502 when KV returns malformed JSON', async () => {
    const { kv, db, ctx } = freshMocks();
    kv.get.mockResolvedValueOnce('not valid json');
    const response = await handleAffiliateRedirect(
      'broken', '420blazin', null, 'Mozilla/5.0',
      kv as any, db as any, ctx as any,
    );
    expect(response.status).toBe(502);
  });

  it('returns 502 when KV data has non-HTTPS url', async () => {
    const { kv, db, ctx } = freshMocks();
    kv.get.mockResolvedValueOnce(JSON.stringify({
      url: 'javascript:alert(1)', network: 'evil', product: 'Hack',
    }));
    const response = await handleAffiliateRedirect(
      'evil', '420blazin', null, 'Mozilla/5.0',
      kv as any, db as any, ctx as any,
    );
    expect(response.status).toBe(502);
  });

  it('returns 502 when KV data has disallowed domain', async () => {
    const { kv, db, ctx } = freshMocks();
    kv.get.mockResolvedValueOnce(JSON.stringify({
      url: 'https://evil.com/phishing', network: 'unknown', product: 'Scam',
    }));
    const response = await handleAffiliateRedirect(
      'scam', '420blazin', null, 'Mozilla/5.0',
      kv as any, db as any, ctx as any,
    );
    expect(response.status).toBe(502);
  });

  it('logs click to D1 via waitUntil', async () => {
    const { kv, db, ctx } = freshMocks();
    kv.get.mockResolvedValueOnce(JSON.stringify({
      url: 'https://www.planetofthevapes.com/products/venty?rfsn=XXXXX',
      network: 'potv-refersion', product: 'Storz & Bickel Venty',
    }));
    await handleAffiliateRedirect(
      'venty', '420blazin', 'https://420blazin.com/blog/guide.html', 'Mozilla/5.0',
      kv as any, db as any, ctx as any,
    );
    expect(ctx.waitUntil).toHaveBeenCalledTimes(1);
  });

  it('still redirects when D1 write fails', async () => {
    const { kv, ctx } = freshMocks();
    kv.get.mockResolvedValueOnce(JSON.stringify({
      url: 'https://www.planetofthevapes.com/products/venty?rfsn=XXXXX',
      network: 'potv-refersion', product: 'Storz & Bickel Venty',
    }));
    const failingDB = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          run: vi.fn(() => Promise.reject(new Error('D1 down'))),
        })),
      })),
    };
    const response = await handleAffiliateRedirect(
      'venty', '420blazin', null, 'Mozilla/5.0',
      kv as any, failingDB as any, ctx as any,
    );
    expect(response.status).toBe(302);
  });
});
