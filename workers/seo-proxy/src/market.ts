// "Next market" waitlist — POST /request-market → D1 `market_requests`.
// Why a waitlist and not a public vote tally: votes invite duplicates, favour big cities whose
// menus may publish no terpene panel, and set a launch expectation we can't meet. A request is
// demand discovery + a contact we can email when (if) the market goes live. The market status
// board the visitor sees is the committed data/markets.json, not live counts.
// If an email is supplied and not yet on the list, the caller (index.ts) also runs the normal
// double-opt-in subscribe path so the address is verified before we ever email it.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ROLES = new Set(['consumer', 'budtender', 'dispensary', 'caregiver', 'other']);
const STATE_RE = /^[A-Z]{2}$/;

export interface MarketRequest {
  email: string | null;
  role: string;
  city: string;
  state: string;
  marketKey: string;
  dispensary: string | null;
  menuUrl: string | null;
  source: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}

/** "Bonita Springs" + "FL" → "fl-bonita-springs" (stable key for grouping requests). */
export function marketKey(city: string, state: string): string {
  const c = city.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-');
  return `${state.toLowerCase()}-${c}`.slice(0, 80);
}

/** Validate raw form data; returns the cleaned request or an error code. */
export function parseMarketRequest(data: Record<string, unknown>): { ok: true; req: MarketRequest } | { ok: false; error: string } {
  const city = String(data.city || '').trim().replace(/\s+/g, ' ');
  const state = String(data.state || '').trim().toUpperCase();
  if (city.length < 2 || city.length > 80) return { ok: false, error: 'invalid-city' };
  if (!STATE_RE.test(state)) return { ok: false, error: 'invalid-state' };

  let email: string | null = String(data.email || '').trim().toLowerCase() || null;
  if (email && (email.length > 254 || !EMAIL_RE.test(email))) return { ok: false, error: 'invalid-email' };

  let role = String(data.role || 'consumer').trim().toLowerCase();
  if (!ROLES.has(role)) role = 'other';

  const dispensary = String(data.dispensary || '').trim().slice(0, 120) || null;
  let menuUrl: string | null = String(data.menu_url || data.menuUrl || '').trim().slice(0, 300) || null;
  if (menuUrl && !/^https?:\/\/[^\s]+$/i.test(menuUrl)) menuUrl = null; // keep junk out, never fail the request over it

  let source = String(data.source || '').trim();
  if (!/^[a-z0-9/_-]{0,64}$/i.test(source)) source = 'unknown';

  return { ok: true, req: { email, role, city, state, marketKey: marketKey(city, state), dispensary, menuUrl, source } };
}

export async function handleMarketRequest(
  request: Request,
  db: D1Database,
  subscribe: (email: string, source: string) => Promise<void>,
  ctx: { waitUntil(p: Promise<unknown>): void },
): Promise<Response> {
  if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  let data: Record<string, unknown> = {};
  try {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) data = await request.json();
    else { const form = await request.formData(); form.forEach((v, k) => { data[k] = v; }); }
  } catch {
    return json({ ok: false, error: 'bad-request' }, 400);
  }

  // Honeypot: bots fill hidden fields. Pretend success, store nothing.
  if (typeof data.hp === 'string' && data.hp.trim() !== '') return json({ ok: true });

  const parsed = parseMarketRequest(data);
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, 422);
  const r = parsed.req;
  const referrer = (request.headers.get('Referer') || '').slice(0, 300);
  const userAgent = (request.headers.get('User-Agent') || '').slice(0, 300);

  ctx.waitUntil((async () => {
    try {
      await db.prepare(
        'INSERT INTO market_requests (email, role, city, state, market_key, dispensary, menu_url, source, referrer, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(r.email, r.role, r.city, r.state, r.marketKey, r.dispensary, r.menuUrl, r.source, referrer, userAgent).run();
      if (r.email) await subscribe(r.email, `market-${r.marketKey}`.slice(0, 64));
    } catch { /* capture must never throw to the visitor */ }
  })());

  return json({ ok: true, market: r.marketKey });
}
