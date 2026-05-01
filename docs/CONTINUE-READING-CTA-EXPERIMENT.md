# "Continue Reading" CTA Experiment

## Hypothesis
Adding contextually relevant "Continue Reading" CTAs at the end of high-traffic pages
(cleveland-420, events, blog posts) will:
1. Lift **pages per session** from 1.16 → 1.4+
2. Lift **avg session duration** from 38s → 60s+
3. Reduce **bounce rate** from 89.6% → 80%
4. Surface buyer-intent blog posts to events-traffic visitors → drive POTV affiliate clicks

## Baseline Metrics (May 1, 2026 — pre-change, last 14 days)

| Metric | Value |
|---|---|
| Total sessions | 1,480 |
| Avg pages per session | **1.16** |
| Avg session seconds | **37.7** |
| Median session seconds | 0 (high bounce signal) |
| Bounces (single-page sessions) | 1,326 |
| **Bounce rate** | **89.6%** |

### Per-page baseline (avg/median seconds, last 14 days)
| Page | Pageviews | Avg Time | Median |
|---|---|---|---|
| /events | 126 | 143s | 33.5s |
| /cleveland-420 | 125 | 187s | 80s |
| / (homepage) | 45 | 146s | 9s |
| /shop | 17 | 57s | 14s |
| /culture | 11 | 84s | 6s |
| /blog/the-nose-knows | 5 | 81s | 21s |

## Research-Backed Best Practices Applied

1. **End-of-content placement:** 20-30% conversion lift ([First Page Sage, 2026](https://firstpagesage.com/reports/cta-conversion-rates-report/))
2. **Contextually relevant links:** Pages with 3-5 relevant internal links have 25% higher dwell time
3. **Single primary CTA per section:** Multiple CTAs reduce conversion (266% lift from going to one)
4. **Centered alignment:** 682% more clicks than left-aligned
5. **Internal link CTAs > sidebar CTAs:** 121% higher CTR
6. **"Read next" framing:** Continuation tone outperforms "Related" or "More articles"

## Implementation

### Pages getting CTAs (in priority order):
1. **/cleveland-420.html** — strongest engagement (80s median), highest opportunity to redirect
2. **/events.html** — most traffic, biggest absolute lift potential
3. **/index.html** — homepage, low engagement currently (9s median)
4. **/blog/*.html** — already have some, audit and standardize

### CTA Design Pattern

```html
<section class="continue-reading">
  <div class="container">
    <p class="cr-eyebrow">Continue Reading</p>
    <h2 class="cr-title">[Contextual hook based on what they just read]</h2>
    <div class="cr-grid">
      <a href="/blog/X.html" class="cr-card">
        <span class="cr-card-tag">[Tag]</span>
        <h3>[Article title]</h3>
        <p>[1-line value prop]</p>
        <span class="cr-arrow">Read more →</span>
      </a>
      [2-3 cards total]
    </div>
  </div>
</section>
```

### Per-page CTA destinations

**Cleveland-420 → suggests:**
- Wake & Bake Protocol (Cleveland dispensaries already mentioned)
- Best Dry Herb Vaporizers (gear for the holiday)
- The Nose Knows (DaCut budtender story)

**Events → suggests:**
- Festival 2027 (next big thing)
- Best Dry Herb Vaporizers (gear for festivals)
- Cleveland 420 (deeper local content)

**Homepage → suggests:**
- Best Dry Herb Vaporizers (highest-conversion buyer page)
- Cleveland 420 (highest-engagement page)
- Festival 2027 (community building)

**Blog posts → cross-link series:**
- The Nose Knows ↔ Tasting Notes #1 ↔ Best Vaporizers
- Wake & Bake ↔ Best Vaporizers ↔ The Nose Knows

## Measurement Plan

**Re-query at:**
- T+7 days (May 8) — early signal
- T+14 days (May 15) — primary measurement window
- T+30 days (May 31) — full impact assessment

**Comparison query:** Same HogQL as baseline but `INTERVAL 14 DAY` ending May 15.

**Success criteria:**
- Pages per session: ≥ 1.30 (target 1.40+)
- Bounce rate: ≤ 85% (target 80%)
- POTV affiliate clicks: ≥ 50/14 days (current pace ~17/14 days)

**Failure criteria (revert):**
- Pages per session drops
- Bounce rate increases
- Any drop in median session duration on pages where CTA was added

## PostHog Annotation
Date: 2026-05-01
Title: "Continue Reading CTAs deployed"
Description: Added contextual end-of-page CTAs to cleveland-420, events, homepage, and audited blog posts
