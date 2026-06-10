// Email capture + double opt-in lifecycle — all backed by the D1 `subscribers` table.
//   POST /subscribe      → store (confirmed=0) + send confirmation email via Resend
//   GET  /confirm?t=     → set confirmed=1, branded thank-you page
//   GET  /unsubscribe?t= → set unsubscribed_at, branded goodbye page
// The list is owned in D1; Resend is only the delivery pipe.

interface WaitUntilCtx {
  waitUntil(promise: Promise<unknown>): void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SOURCE_RE = /^[a-z0-9/_-]{0,64}$/i;
const TOKEN_RE = /^[a-f0-9]{48}$/;

const FROM = 'Blazin Bill <news@420blazin.com>';
const SITE = 'https://420blazin.com';

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

function page(title: string, heading: string, body: string): Response {
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} - 420Blazin.com</title><meta name="robots" content="noindex">
<link href="https://fonts.googleapis.com/css2?family=Righteous&family=Inter:wght@400;600&display=swap" rel="stylesheet">
<style>body{font-family:Inter,sans-serif;background:#f6f9f4;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:20px;}
.card{background:linear-gradient(135deg,#1a8754,#14663f);color:#fff;border-radius:16px;padding:44px 38px;max-width:520px;text-align:center;box-shadow:0 10px 30px rgba(20,102,63,.25);}
h1{font-family:Righteous,cursive;font-size:1.7rem;margin:0 0 14px;}p{color:#e8f5e9;line-height:1.6;margin:0 0 10px;}
a.btn{display:inline-block;margin-top:18px;background:#fff;color:#14663f;font-weight:700;padding:12px 26px;border-radius:8px;text-decoration:none;}
a{color:#bdf0d2;}</style></head>
<body><div class="card"><h1>${heading}</h1>${body}</div></body></html>`;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}

function newToken(): string {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

async function sendViaResend(apiKey: string, to: string, subject: string, html: string, unsubUrl: string): Promise<void> {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject,
      html,
      headers: {
        'List-Unsubscribe': `<${unsubUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  });
}

function confirmEmailHtml(confirmUrl: string, unsubUrl: string): string {
  return `<div style="font-family:-apple-system,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:36px 20px;">
  <h1 style="font-size:22px;color:#14663f;margin:0 0 14px;">One click and you're in 🌿</h1>
  <p style="font-size:16px;color:#444;line-height:1.6;">You (or someone with your email) signed up for the 420Blazin newsletter &mdash; strain breakdowns by terpene, honest gear guides, and Cleveland cannabis news.</p>
  <p style="font-size:16px;color:#444;line-height:1.6;">Confirm your subscription to start getting it:</p>
  <a href="${confirmUrl}" style="display:inline-block;background:#1a8754;color:#fff;padding:13px 28px;text-decoration:none;border-radius:8px;font-size:15px;font-weight:700;margin:10px 0 18px;">Confirm subscription</a>
  <p style="font-size:13px;color:#999;line-height:1.5;">If you didn't sign up, just ignore this email &mdash; you won't get anything else. Or <a href="${unsubUrl}" style="color:#999;">unsubscribe</a>.<br>420Blazin.com &middot; Cleveland, OH</p>
</div>`;
}

export async function handleSubscribe(
  request: Request,
  db: D1Database,
  apiKey: string,
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

  ctx.waitUntil((async () => {
    try {
      const token = newToken();
      await db.prepare(
        'INSERT OR IGNORE INTO subscribers (email, source, referrer, user_agent, token) VALUES (?, ?, ?, ?, ?)'
      ).bind(email, source, referrer, userAgent, token).run();

      // Re-signup after unsubscribing = consent again; clear the flag.
      const row = await db.prepare(
        'UPDATE subscribers SET unsubscribed_at = NULL WHERE email = ? RETURNING token, confirmed'
      ).bind(email).first<{ token: string; confirmed: number }>();
      if (!row) return;

      // Already confirmed → nothing to send. Unconfirmed (new or repeat) → (re)send confirmation.
      if (row.confirmed === 1) return;
      const t = row.token || token;
      const confirmUrl = `${SITE}/confirm?t=${t}`;
      const unsubUrl = `${SITE}/unsubscribe?t=${t}`;
      await sendViaResend(apiKey, email, 'Confirm your 420Blazin subscription', confirmEmailHtml(confirmUrl, unsubUrl), unsubUrl);
    } catch { /* capture must never throw to the visitor */ }
  })());

  return json({ ok: true });
}

export async function handleConfirm(url: URL, db: D1Database): Promise<Response> {
  const t = url.searchParams.get('t') || '';
  if (!TOKEN_RE.test(t)) return page('Hmm', 'That link looks off', '<p>This confirmation link is invalid or incomplete. Try the link in your email again, or re-subscribe on the site.</p><a class="btn" href="/">Back to 420Blazin</a>');

  const res = await db.prepare(
    "UPDATE subscribers SET confirmed = 1, confirmed_at = COALESCE(confirmed_at, datetime('now')) WHERE token = ?"
  ).bind(t).run();

  if (!res.meta || res.meta.changes === 0) {
    return page('Hmm', 'Link not found', '<p>We couldn&rsquo;t find that subscription &mdash; the link may be stale. Re-subscribe on the site and we&rsquo;ll send a fresh one.</p><a class="btn" href="/">Back to 420Blazin</a>');
  }
  return page("You're in", "You're in 🌿", '<p>Subscription confirmed. Expect strain breakdowns, honest gear guides, and Cleveland cannabis news &mdash; and nothing spammy.</p><p>Meanwhile, try the tool readers love:</p><a class="btn" href="/strain-finder">Find your strain by terpene</a>');
}

export async function handleUnsubscribe(request: Request, url: URL, db: D1Database): Promise<Response> {
  const t = url.searchParams.get('t') || '';
  if (!TOKEN_RE.test(t)) return page('Hmm', 'That link looks off', '<p>This unsubscribe link is invalid. Use the link at the bottom of any of our emails.</p>');

  // Support RFC 8058 one-click POST as well as the browser GET.
  await db.prepare(
    "UPDATE subscribers SET unsubscribed_at = datetime('now') WHERE token = ?"
  ).bind(t).run();

  if (request.method === 'POST') return json({ ok: true });
  return page('Unsubscribed', "You're unsubscribed", '<p>Done &mdash; no more emails from us. No hard feelings. 🌿</p><p>Change your mind? You can re-subscribe on the site anytime.</p><a class="btn" href="/">Back to 420Blazin</a>');
}
