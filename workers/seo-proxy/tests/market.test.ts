import { describe, it, expect, vi } from 'vitest';
import { marketKey, parseMarketRequest, handleMarketRequest } from '../src/market.js';

describe('marketKey', () => {
  it('builds a stable state-city key', () => {
    expect(marketKey('Bonita Springs', 'FL')).toBe('fl-bonita-springs');
    expect(marketKey('  Naples ', 'FL')).toBe('fl-naples');
    expect(marketKey("Coeur d'Alene", 'ID')).toBe('id-coeur-dalene');
  });
});

describe('parseMarketRequest', () => {
  it('accepts a minimal request', () => {
    const r = parseMarketRequest({ city: 'Naples', state: 'fl' });
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.req.state).toBe('FL'); expect(r.req.email).toBeNull(); expect(r.req.role).toBe('consumer'); expect(r.req.marketKey).toBe('fl-naples'); }
  });
  it('rejects a bad state or city', () => {
    expect(parseMarketRequest({ city: 'Naples', state: 'Florida' })).toEqual({ ok: false, error: 'invalid-state' });
    expect(parseMarketRequest({ city: 'N', state: 'FL' })).toEqual({ ok: false, error: 'invalid-city' });
  });
  it('rejects a malformed email but tolerates a junk menu url', () => {
    expect(parseMarketRequest({ city: 'Naples', state: 'FL', email: 'nope' })).toEqual({ ok: false, error: 'invalid-email' });
    const r = parseMarketRequest({ city: 'Naples', state: 'FL', menu_url: 'javascript:alert(1)', role: 'budtender' });
    expect(r.ok).toBe(true); if (r.ok) { expect(r.req.menuUrl).toBeNull(); expect(r.req.role).toBe('budtender'); }
  });
});

function mocks() {
  const run = vi.fn().mockResolvedValue({});
  const bind = vi.fn(() => ({ run }));
  const db = { prepare: vi.fn(() => ({ bind })) } as unknown as D1Database;
  const subscribe = vi.fn().mockResolvedValue(undefined);
  const waits: Promise<unknown>[] = [];
  const ctx = { waitUntil: (p: Promise<unknown>) => { waits.push(p); } };
  return { db, bind, subscribe, ctx, waits };
}

describe('handleMarketRequest', () => {
  it('stores the request and subscribes the email', async () => {
    const m = mocks();
    const req = new Request('https://420blazin.com/request-market', { method: 'POST', headers: { 'Content-Type': 'application/json', Referer: 'https://420blazin.com/strain-finder' },
      body: JSON.stringify({ city: 'Bonita Springs', state: 'FL', email: 'Pat@Example.com', role: 'budtender', dispensary: 'RISE', source: 'strain-finder' }) });
    const res = await handleMarketRequest(req, m.db, m.subscribe, m.ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, market: 'fl-bonita-springs' });
    await Promise.all(m.waits);
    expect(m.bind).toHaveBeenCalledWith('pat@example.com', 'budtender', 'Bonita Springs', 'FL', 'fl-bonita-springs', 'RISE', null, 'strain-finder', 'https://420blazin.com/strain-finder', '');
    expect(m.subscribe).toHaveBeenCalledWith('pat@example.com', 'market-fl-bonita-springs');
  });
  it('honeypot: pretends success, stores nothing', async () => {
    const m = mocks();
    const req = new Request('https://420blazin.com/request-market', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ city: 'Naples', state: 'FL', hp: 'x' }) });
    const res = await handleMarketRequest(req, m.db, m.subscribe, m.ctx);
    expect(await res.json()).toEqual({ ok: true });
    expect(m.waits.length).toBe(0);
  });
  it('rejects non-POST and invalid input', async () => {
    const m = mocks();
    expect((await handleMarketRequest(new Request('https://x/request-market'), m.db, m.subscribe, m.ctx)).status).toBe(405);
    const bad = new Request('https://x/request-market', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ city: 'Naples', state: 'Florida' }) });
    expect((await handleMarketRequest(bad, m.db, m.subscribe, m.ctx)).status).toBe(422);
  });
});
