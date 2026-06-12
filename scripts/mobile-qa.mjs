// Mobile E2E against PRODUCTION at a true emulated viewport (390x844, iPhone-class).
// Window-resize can't go this narrow on macOS; CDP emulation can.
// Run: node scripts/mobile-qa.mjs [more-paths...]   Screenshots -> test-results/mobile/
import { chromium, devices } from '@playwright/test';
import fs from 'node:fs';

const BASE = 'https://420blazin.com';
const PAGES = ['/playlists', '/music-events', '/strain-finder', '/culture', '/', ...process.argv.slice(2)];
const OUT = 'test-results/mobile';
fs.mkdirSync(OUT, { recursive: true });

const iphone = devices['iPhone 14'];
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...iphone });
const page = await ctx.newPage();

let failures = 0;
const fail = (p, msg) => { failures++; console.log(`  ✗ FAIL ${p}: ${msg}`); };
const pass = (msg) => console.log(`  ✓ ${msg}`);

for (const path of PAGES) {
  console.log(`\n=== ${path} @ ${iphone.viewport.width}x${iphone.viewport.height} ===`);
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 45000 }).catch(e => fail(path, 'load: ' + e.message));

  // 1. No horizontal overflow (the classic broken-mobile symptom)
  const widths = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth,
  }));
  widths.scrollW <= widths.innerW + 1
    ? pass(`no horizontal overflow (${widths.scrollW} <= ${widths.innerW})`)
    : fail(path, `horizontal overflow: content ${widths.scrollW}px > viewport ${widths.innerW}px`);

  // 2. Hamburger present and the mobile menu opens with Playlists reachable
  const burger = page.locator('button.hamburger');
  if (await burger.isVisible()) {
    pass('hamburger visible');
    await burger.click();
    const link = page.locator('nav a[href$="playlists"]').first();
    (await link.isVisible())
      ? pass('Playlists link reachable in mobile menu')
      : fail(path, 'Playlists link NOT visible after opening menu');
    await burger.click(); // close
  } else fail(path, 'hamburger not visible at mobile width');

  // 3. Page-specific checks
  if (path === '/playlists') {
    const checks = await page.evaluate(() => {
      const vw = window.innerWidth;
      const iframes = [...document.querySelectorAll('iframe[src*="spotify"]')];
      const ol = document.querySelector('.pl-tracks ol');
      const form = document.querySelector('.email-capture form');
      return {
        iframeCount: iframes.length,
        iframesFit: iframes.every(f => f.getBoundingClientRect().width <= vw),
        trackCols: ol ? getComputedStyle(ol).columnCount : null,
        formFits: form ? form.getBoundingClientRect().width <= vw : false,
        followBtns: document.querySelectorAll('.pl-follow').length,
      };
    });
    checks.iframeCount === 4 && checks.iframesFit ? pass('4 Spotify embeds fit viewport') : fail(path, `embeds: ${JSON.stringify(checks)}`);
    (checks.trackCols === '1' || checks.trackCols === 'auto') ? pass(`tracklist single-column (column-count=${checks.trackCols})`) : fail(path, `tracklist columns=${checks.trackCols} at mobile width`);
    checks.formFits ? pass('email form fits viewport') : fail(path, 'email form overflows');
    checks.followBtns === 4 ? pass('4 follow buttons present') : fail(path, `follow buttons=${checks.followBtns}`);
    // expand a tracklist on touch
    await page.locator('.pl-tracks summary').first().tap();
    (await page.locator('.pl-tracks[open] li').count()) > 20 ? pass('tracklist expands on tap') : fail(path, 'tracklist did not expand on tap');
  }
  if (path === '/music-events') {
    const t = await page.locator('#playlists a[href="playlists"]').isVisible();
    t ? pass('playlist teaser visible + linked') : fail(path, 'teaser missing');
  }
  if (path === '/strain-finder') {
    const moods = await page.locator('.mood-chip').count();
    moods >= 4 ? pass(`mood grid renders (${moods} chips)`) : fail(path, `mood chips=${moods}`);
  }

  const shot = `${OUT}${path === '/' ? '/home' : path.replaceAll('/', '_')}.png`.replace('/_', '/');
  await page.screenshot({ path: shot, fullPage: false });
  console.log(`  📸 ${shot}`);
}

await browser.close();
console.log(failures === 0 ? '\nALL MOBILE CHECKS PASSED ✓' : `\n${failures} FAILURES ✗`);
process.exit(failures === 0 ? 0 : 1);
