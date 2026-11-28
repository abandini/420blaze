import { describe, it, expect } from 'vitest';
import { seoFileRequest, shapeSeoFileResponse } from '../src/seo-files.js';

const req = (u: string, method = 'GET') => new Request(u, { method, headers: { 'User-Agent': 'test' } });

describe('seoFileRequest', () => {
  it('passes sitemap.xml and llms.txt through to the same origin path', () => {
    const s = seoFileRequest(new URL('https://420blazin.com/sitemap.xml'), req('https://420blazin.com/sitemap.xml'));
    expect(s?.url).toBe('https://420blazin.com/sitemap.xml');
    const l = seoFileRequest(new URL('https://420blazin.com/llms.txt'), req('https://420blazin.com/llms.txt'));
    expect(l?.url).toBe('https://420blazin.com/llms.txt');
  });

  it('maps llms-full.txt onto llms.txt and drops the query string', () => {
    const r = seoFileRequest(new URL('https://420blazin.com/llms-full.txt?x=1'), req('https://420blazin.com/llms-full.txt?x=1'));
    expect(r?.url).toBe('https://420blazin.com/llms.txt');
  });

  it('keeps HEAD as HEAD and turns anything else into GET', () => {
    expect(seoFileRequest(new URL('https://420blazin.com/sitemap.xml'), req('https://420blazin.com/sitemap.xml', 'HEAD'))?.method).toBe('HEAD');
    expect(seoFileRequest(new URL('https://420blazin.com/sitemap.xml'), req('https://420blazin.com/sitemap.xml', 'POST'))?.method).toBe('GET');
  });

  it('ignores every other path, including lookalikes', () => {
    for (const p of ['/', '/robots.txt', '/sitemap.xml.bak', '/blog/sitemap.xml', '/llms', '/sitemap']) {
      expect(seoFileRequest(new URL('https://420blazin.com' + p), req('https://420blazin.com' + p))).toBeNull();
    }
  });
});

describe('shapeSeoFileResponse', () => {
  it('sets content-type and cache headers on a good origin response', async () => {
    const origin = new Response('<?xml version="1.0"?>', { status: 200, headers: { 'Content-Type': 'text/xml', 'Cache-Control': 'no-store' } });
    const out = shapeSeoFileResponse(origin, '/sitemap.xml');
    expect(out.status).toBe(200);
    expect(out.headers.get('Content-Type')).toBe('application/xml; charset=utf-8');
    expect(out.headers.get('Cache-Control')).toBe('public, max-age=3600');
    expect(out.headers.get('x-seo-source')).toBe('origin');
    expect(await out.text()).toBe('<?xml version="1.0"?>');
  });

  it('uses text/plain for llms.txt and its alias', () => {
    expect(shapeSeoFileResponse(new Response('x'), '/llms.txt').headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(shapeSeoFileResponse(new Response('x'), '/llms-full.txt').headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
  });

  it('leaves an origin error alone but labels it', () => {
    const out = shapeSeoFileResponse(new Response('nope', { status: 404, headers: { 'Content-Type': 'text/html' } }), '/sitemap.xml');
    expect(out.status).toBe(404);
    expect(out.headers.get('Content-Type')).toBe('text/html');
    expect(out.headers.get('x-seo-source')).toBe('origin-404');
  });
});
