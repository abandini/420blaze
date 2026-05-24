#!/usr/bin/env node
/**
 * Sitemap generator for 420blazin.com.
 *
 * Walks the repo for *.html files, applies priority/changefreq rules by URL pattern,
 * pulls `lastmod` from git log (falls back to file mtime), and writes a TypeScript
 * artifact at workers/seo-proxy/src/sitemap-data.ts that the SEO Worker imports.
 *
 * Run from repo root:
 *   node scripts/generate-sitemap.mjs
 *   npm run sitemap:gen
 *
 * Deploy is still manual:
 *   cd workers/seo-proxy && wrangler deploy
 *
 * Why an artifact and not runtime FS access?
 *   Workers can't read the filesystem; they execute on the edge with no disk. A build-time
 *   artifact gives us zero-latency serving + git-tracked transparency on what's in the index.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://420blazin.com';
const OUTPUT = path.join(ROOT, 'workers/seo-proxy/src/sitemap-data.ts');

// Files to skip even though they exist as .html (thank-you / checkout-flow / noindex)
const EXCLUDE_FILES = new Set([
  'returns.html',
  'shipping.html',
  'thank-you.html',
]);

// Directories never to recurse into
const EXCLUDE_DIRS = new Set([
  'node_modules', '.wrangler', 'dist', 'workers', 'test-results',
  '.playwright-mcp', 'videos', '.git', 'images', 'css', 'js',
  'scripts', 'docs', '.vscode', 'archive',
]);

/**
 * Priority + changefreq rules — first match wins.
 * `slug` is the URL path with leading slash stripped (e.g. "blog/the-nose-knows", "cleveland-420", "index" for root).
 */
const RULES = [
  { match: /^index$/,                                                   priority: '1.0', changefreq: 'weekly'  },
  { match: /^cleveland-420$/,                                           priority: '0.9', changefreq: 'weekly'  },
  { match: /^(events|music-events)$/,                                   priority: '0.9', changefreq: 'daily'   },
  { match: /^(cannabis-holidays|710-dab-day|green-wednesday)-\d{4}$/,   priority: '0.9', changefreq: 'weekly'  },
  { match: /^festival$/,                                                priority: '0.9', changefreq: 'monthly' },
  { match: /^(stoner-movies|blog)$/,                                    priority: '0.8', changefreq: 'monthly' },
  { match: /^culture(-.*)?$/,                                           priority: '0.8', changefreq: 'monthly' },
  { match: /^merch$/,                                                   priority: '0.8', changefreq: 'weekly'  },
  { match: /^blog\//,                                                   priority: '0.7', changefreq: 'monthly' },
  { match: /^(about|contact)$/,                                         priority: '0.5', changefreq: 'monthly' },
  { match: /^(privacy|terms)$/,                                         priority: '0.3', changefreq: 'yearly'  },
  // fallback
  { match: /./,                                                         priority: '0.6', changefreq: 'monthly' },
];

function walk(dir, rel = '') {
  const out = [];
  for (const name of fs.readdirSync(dir).sort()) {
    if (name.startsWith('.')) continue;
    const full = path.join(dir, name);
    const sub = rel ? path.posix.join(rel, name) : name;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (EXCLUDE_DIRS.has(name)) continue;
      out.push(...walk(full, sub));
    } else if (name.endsWith('.html') && !EXCLUDE_FILES.has(sub)) {
      out.push({ relPath: sub, full });
    }
  }
  return out;
}

// Uses execFileSync (no shell, no injection surface) and ignores stderr.
function gitLastMod(relPath) {
  try {
    const iso = execFileSync('git', ['log', '-1', '--format=%cI', '--', relPath], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();
    return iso ? iso.split('T')[0] : null;
  } catch {
    return null;
  }
}

function toUrlPath(relPath) {
  // Strip .html (Cloudflare Pages serves no-ext URLs natively)
  const p = relPath.replace(/\.html$/, '');
  if (p === 'index') return '/';
  return '/' + p;
}

function applyRule(urlPath) {
  const slug = urlPath === '/' ? 'index' : urlPath.replace(/^\//, '');
  for (const r of RULES) if (r.match.test(slug)) return r;
  return RULES[RULES.length - 1];
}

function main() {
  const files = walk(ROOT);
  const entries = files.map(f => {
    const urlPath = toUrlPath(f.relPath);
    const rule = applyRule(urlPath);
    const lastmod = gitLastMod(f.relPath) ||
      new Date(fs.statSync(f.full).mtime).toISOString().split('T')[0];
    return { loc: BASE + urlPath, lastmod, changefreq: rule.changefreq, priority: rule.priority };
  });

  // Root first, then top-level alphabetical, then /blog/* alphabetical.
  entries.sort((a, b) => {
    const aRoot = a.loc === `${BASE}/`;
    const bRoot = b.loc === `${BASE}/`;
    if (aRoot) return -1;
    if (bRoot) return 1;
    const aBlog = a.loc.includes('/blog/');
    const bBlog = b.loc.includes('/blog/');
    if (aBlog !== bBlog) return aBlog ? 1 : -1;
    return a.loc.localeCompare(b.loc);
  });

  const ts = `// AUTO-GENERATED by scripts/generate-sitemap.mjs — DO NOT HAND-EDIT.
// Regenerate: \`npm run sitemap:gen\` from repo root, then \`cd workers/seo-proxy && wrangler deploy\`.
// Last generated: ${new Date().toISOString().split('T')[0]} (${entries.length} URLs).

export interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}

export const SITEMAP_ENTRIES: SitemapEntry[] = ${JSON.stringify(entries, null, 2)};

const xmlBody = SITEMAP_ENTRIES
  .map(e => \`  <url><loc>\${e.loc}</loc><lastmod>\${e.lastmod}</lastmod><changefreq>\${e.changefreq}</changefreq><priority>\${e.priority}</priority></url>\`)
  .join('\\n');

export const SITEMAP_XML = \`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
\${xmlBody}
</urlset>\`;
`;

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, ts);

  console.log(`✓ Generated ${entries.length} sitemap entries → ${path.relative(ROOT, OUTPUT)}`);
  console.log('');
  console.log('  Priority  Changefreq  URL');
  console.log('  --------  ----------  ---');
  for (const e of entries) {
    console.log(`  ${e.priority}       ${e.changefreq.padEnd(10)} ${e.loc}`);
  }
  console.log('');
  console.log('Next step: cd workers/seo-proxy && wrangler deploy');
}

main();
