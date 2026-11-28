#!/usr/bin/env node
/**
 * Sitemap generator for 420blazin.com.
 *
 * Walks the repo for *.html files, applies priority/changefreq rules by URL pattern,
 * pulls `lastmod` from git log (a file with uncommitted changes gets today; an untracked
 * file falls back to its mtime), and writes sitemap.xml at the repo root. Cloudflare Pages
 * serves that file; the SEO Worker passes /sitemap.xml through to it (see
 * workers/seo-proxy/src/seo-files.ts). So the git push that ships a page ships its
 * sitemap entry too. No worker deploy.
 *
 * Normally you never run this by hand: scripts/git-hooks/pre-commit runs it whenever a
 * commit adds, removes, renames or changes an .html file (activate once per clone with
 * `git config core.hooksPath scripts/git-hooks`). Manual run from repo root:
 *   node scripts/generate-sitemap.mjs [--quiet]
 *   npm run sitemap:gen
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://420blazin.com';
const OUTPUT = path.join(ROOT, 'sitemap.xml');
const QUIET = process.argv.includes('--quiet');

// Files to skip even though they exist as .html (thank-you / checkout-flow / noindex)
const EXCLUDE_FILES = new Set([
  '404.html',      // noindex error page — GSC flagged it as a sitemap URL excluded by noindex
  'returns.html',
  'shipping.html',
  'thank-you.html',
]);

// Directories never to recurse into
const EXCLUDE_DIRS = new Set([
  'node_modules', '.wrangler', 'dist', 'workers', 'test-results',
  '.playwright-mcp', 'videos', '.git', 'images', 'css', 'js',
  'scripts', 'docs', '.vscode', 'archive',
  'research_notes', 'reports', 'terrasana',   // local-only research + data folders, never deployed
]);

/**
 * Priority + changefreq rules — first match wins.
 * `slug` is the URL path with leading slash stripped (e.g. "blog/the-nose-knows", "cleveland-420", "index" for root).
 */
const RULES = [
  { match: /^index$/,                                                   priority: '1.0', changefreq: 'weekly'  },
  { match: /^cleveland-420$/,                                           priority: '0.9', changefreq: 'weekly'  },
  { match: /^(events|music-events)$/,                                   priority: '0.9', changefreq: 'daily'   },
  // Flagship interactive tools — feeds rebuild 3x/day, so signal daily + high priority
  { match: /^(strain-finder|edibles)$/,                                 priority: '0.9', changefreq: 'daily'   },
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

// Paths with staged or unstaged changes: their git log date is stale, so lastmod = today.
function gitDirtyPaths() {
  try {
    const out = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], {
      cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8',
    });
    const set = new Set();
    for (const line of out.split('\n')) {
      if (line.length < 4) continue;
      const p = line.slice(3);
      set.add(p.includes(' -> ') ? p.split(' -> ')[1] : p);
    }
    return set;
  } catch {
    return new Set();
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
  const dirty = gitDirtyPaths();
  const today = new Date().toISOString().split('T')[0];
  const entries = files.map(f => {
    const urlPath = toUrlPath(f.relPath);
    const rule = applyRule(urlPath);
    const lastmod = dirty.has(f.relPath) ? today : (gitLastMod(f.relPath) ||
      new Date(fs.statSync(f.full).mtime).toISOString().split('T')[0]);
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

  const xmlBody = entries
    .map(e => `  <url><loc>${e.loc}</loc><lastmod>${e.lastmod}</lastmod><changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`)
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlBody}
</urlset>
`;
  fs.writeFileSync(OUTPUT, xml);

  if (QUIET) return;
  console.log(`✓ Generated ${entries.length} sitemap entries → ${path.relative(ROOT, OUTPUT)}`);
  console.log('');
  console.log('  Priority  Changefreq  URL');
  console.log('  --------  ----------  ---');
  for (const e of entries) {
    console.log(`  ${e.priority}       ${e.changefreq.padEnd(10)} ${e.loc}`);
  }
}

main();
