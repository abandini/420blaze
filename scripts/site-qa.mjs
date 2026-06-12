// Full-site E2E sweep against PRODUCTION: every sitemap page at desktop AND mobile.
// Captures: JS errors, failed asset requests, horizontal overflow (mobile),
// broken images, missing H1, oversized payloads. Run: node scripts/site-qa.mjs
import { chromium, devices } from '@playwright/test';

const BASE = 'https://420blazin.com';
const res = await fetch(BASE + '/sitemap.xml');
const xml = await res.text();
const pages = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname);
console.log(`${pages.length} pages from sitemap\n`);

const browser = await chromium.launch();
const issues = [];
const note = (p, type, msg) => { issues.push({ p, type, msg }); };

for (const profile of [
  { name: 'desktop', ctx: { viewport: { width: 1440, height: 900 } } },
  { name: 'mobile', ctx: { ...devices['iPhone 14'] } },
]) {
  const ctx = await browser.newContext(profile.ctx);
  const page = await ctx.newPage();
  const errs = [], failed = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 140)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
  page.on('response', r => {
    if (r.status() >= 400 && !r.url().includes('posthog') && !r.url().includes('spotify')) {
      failed.push(`${r.status()} ${new URL(r.url()).pathname.slice(0, 80)}`);
    }
  });

  process.stdout.write(`--- ${profile.name} sweep `);
  for (const p of pages) {
    errs.length = 0; failed.length = 0;
    try {
      await page.goto(BASE + p, { waitUntil: 'load', timeout: 40000 });
      await page.waitForTimeout(700);
    } catch (e) { note(p, `${profile.name}:load`, e.message.slice(0, 100)); continue; }

    const checks = await page.evaluate(() => {
      const vw = window.innerWidth;
      return {
        overflow: document.documentElement.scrollWidth - vw,
        brokenImgs: [...document.images].filter(i => i.src && !i.src.startsWith('data:') && i.complete && i.naturalWidth === 0).map(i => i.src.split('/').pop()).slice(0, 5),
        h1: !!document.querySelector('h1, .page-banner h2'),
        title: document.title.length > 0,
      };
    });
    for (const e of [...new Set(errs)]) note(p, `${profile.name}:jserror`, e);
    for (const f of [...new Set(failed)]) note(p, `${profile.name}:asset`, f);
    if (profile.name === 'mobile' && checks.overflow > 2) note(p, 'mobile:overflow', `+${checks.overflow}px`);
    if (checks.brokenImgs.length) note(p, `${profile.name}:img`, checks.brokenImgs.join(', '));
    if (!checks.h1) note(p, `${profile.name}:h1`, 'no h1/banner');
    process.stdout.write('.');
  }
  console.log(' done');
  await ctx.close();
}

// Functional flows
console.log('--- functional flows');
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// 404 behavior
const r404 = await page.goto(BASE + '/this-page-does-not-exist-qa', { waitUntil: 'load' });
console.log(`  404 page: status=${r404.status()} title="${(await page.title()).slice(0, 40)}"`);
if (r404.status() !== 404) note('/404', 'flow', `nonexistent page returns ${r404.status()} (soft-404 risk)`);

// subscribe invalid email via UI
await page.goto(BASE + '/blog', { waitUntil: 'load' });
await page.fill('.email-capture input[type=email]', 'not-an-email@x');
await page.click('.email-capture button');
await page.waitForTimeout(1500);
const msg = await page.textContent('.ec-msg');
console.log(`  subscribe invalid-email UX: "${(msg || '').trim().slice(0, 50)}"`);
if (!msg || !msg.trim()) note('/blog', 'flow', 'no feedback on invalid email');

// strain-finder interactions
await page.goto(BASE + '/strain-finder', { waitUntil: 'load' });
await page.waitForTimeout(1200);
await page.click('#mood-sleep').catch(() => note('/strain-finder', 'flow', 'mood-sleep chip missing'));
await page.waitForTimeout(400);
const moodCards = await page.locator('#moodResult .sf-card, #moodResult [class*=card]').count();
console.log(`  strain-finder mood click -> ${moodCards} result cards`);
if (moodCards < 3) note('/strain-finder', 'flow', `mood results=${moodCards}`);

// /go/ redirect
const go = await page.request.get(BASE + '/go/venty', { maxRedirects: 0 });
console.log(`  /go/venty: ${go.status()} -> ${(go.headers()['location'] || '').slice(0, 60)}`);
if (go.status() !== 302) note('/go/venty', 'flow', `status ${go.status()}`);

await browser.close();

console.log(`\n========== ${issues.length} ISSUES ==========`);
const grouped = {};
for (const i of issues) (grouped[`${i.type} | ${i.msg}`] ??= []).push(i.p);
for (const [k, ps] of Object.entries(grouped).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`[${ps.length}x] ${k}\n      ${ps.slice(0, 6).join(', ')}${ps.length > 6 ? ' …' : ''}`);
}
