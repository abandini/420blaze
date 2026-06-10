// Email capture endpoint — POST /subscribe → D1 `subscribers` table.
// Owns the list outright (no third-party ESP). Sending is a later, separate step.

interface WaitUntilCtx {
  waitUntil(promise: Promise<unknown>): void;
}

// Conservative email check — good enough to reject garbage without over-rejecting.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SOURCE_RE = /^[a-z0-9/_-]{0,64}$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}

export async function handleSubscribe(
  request: Request,
  db: D1Database,
  ctx: WaitUntilCtx,
): Promise<Response> {
  if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  let data: Record<string, unknown> = {};
  try {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      data = await request.json();
    } else {
      const form = await request.formData();
      form.forEach((v, k) => { data[k] = v; });
    }
  } catch {
    return json({ ok: false, error: 'bad-request' }, 400);
  }

  // Honeypot: bots fill hidden fields. Pretend success, store nothing.
  if (typeof data.hp === 'string' && data.hp.trim() !== '') return json({ ok: true });

  const email = String(data.email || '').trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return json({ ok: false, error: 'invalid-email' }, 422);
  }

  let source = String(data.source || '').trim();
  if (!SOURCE_RE.test(source)) source = 'unknown';
  const referrer = (request.headers.get('Referer') || '').slice(0, 300);
  const userAgent = (request.headers.get('User-Agent') || '').slice(0, 300);

  // INSERT OR IGNORE → dedupe on the UNIQUE email; a repeat signup is still a success to the user.
  ctx.waitUntil(
    db.prepare(
      'INSERT OR IGNORE INTO subscribers (email, source, referrer, user_agent) VALUES (?, ?, ?, ?)'
    )
      .bind(email, source, referrer, userAgent)
      .run()
      .catch(() => {})
  );

  return json({ ok: true });
}
