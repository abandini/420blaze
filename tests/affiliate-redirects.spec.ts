import { test, expect } from '@playwright/test';

test.describe('Blog Post Affiliate Integration — Vaporizer Guide', () => {
  test('has FTC disclosure at top of content', async ({ page }) => {
    await page.goto('/blog/cannabis-vaporizer-guide.html');
    const disclosure = page.locator('.affiliate-disclosure');
    await expect(disclosure).toBeVisible();
    await expect(disclosure).toContainText('Affiliate Disclosure');
    await expect(disclosure).toContainText('affiliate links');

    // Disclosure should appear before the first h2
    const disclosureBox = await disclosure.boundingBox();
    const firstH2 = page.locator('.blog-content h2').first();
    const h2Box = await firstH2.boundingBox();
    expect(disclosureBox!.y).toBeLessThan(h2Box!.y);
  });

  test('affiliate links use /go/ paths', async ({ page }) => {
    await page.goto('/blog/cannabis-vaporizer-guide.html');
    const affiliateLinks = page.locator('a[href^="/go/"]');
    const count = await affiliateLinks.count();
    expect(count).toBeGreaterThanOrEqual(8);
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

test.describe('Regression — Existing Functionality', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('blog index loads', async ({ page }) => {
    await page.goto('/blog.html');
    await expect(page).toHaveTitle(/420Blazin/);
  });

  test('wake-and-bake post loads', async ({ page }) => {
    await page.goto('/blog/wake-and-bake-protocol.html');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('navigation has all links', async ({ page }) => {
    await page.goto('/');
    const navLinks = page.locator('nav a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(5);
  });

  test('merch page loads', async ({ page }) => {
    await page.goto('/merch.html');
    await expect(page).toHaveTitle(/420Blazin/);
  });

  test('culture page loads', async ({ page }) => {
    await page.goto('/culture.html');
    await expect(page).toHaveTitle(/420Blazin/);
  });
});
