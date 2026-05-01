# Cannabis Education Network — Authority & GEO Implementation Plan

> Built May 1, 2026. Goal: Position the 3-site network (420blazin.com,
> 365daysofweed.com, weedaseniorsguide.com) as the authority for AI search
> engines (ChatGPT, Perplexity, Claude, Google AI Overviews), capture cannabis
> calendar moments year-round, and sell more WEED books while compounding
> POTV affiliate revenue.

---

## The Strategic Insight

Three sites, one author identity (Bill Burkey / "Blazin Bill"), one book.
Each site targets a different audience but shares the same expertise core.

| Site | Audience | Primary monetization | Authority angle |
|---|---|---|---|
| **420blazin.com** | Cannabis culture / events / gear shoppers | POTV affiliate (15%) | Cleveland local + terpene/grower expertise |
| **365daysofweed.com** | Daily cannabis education / curious users | Pro upgrades + POTV | Year-round daily content (365 days) |
| **weedaseniorsguide.com** | Adults 50+ exploring cannabis | Amazon book + POTV | Author of *WEED: A Senior's Guide* (book) |

**The cross-site magic:** Bill Burkey is the author of all three. AI engines build
entity profiles. The more cohesive the authority signal across multiple properties,
the more likely AI cites Bill as a cannabis expert. One book + 3 sites + consistent
expertise = entity authority.

---

## PHASE 1 — GEO Foundation (Week 1, ~8 hours)

The "if we don't do this, we're invisible to AI" stack.

### Task 1.1: Audit + fix robots.txt for AI crawlers (30 min)
- All 3 sites must explicitly allow GPTBot, ClaudeBot, PerplexityBot, Google-Extended
- Currently: 420blazin allows `*` (good), but worth confirming no Disallow patterns block AI bots

### Task 1.2: Create `/llms.txt` for each site (1 hour)
Standard convention emerging in 2026 — AI engines look for this file as a curated
"here's what's important on this site" map.

Format: Markdown summary + key URLs grouped by topic.

### Task 1.3: JSON-LD Schema on top pages (3 hours)
**420blazin.com:**
- Best Dry Herb Vaporizers → `Article` + `Product` + `Review` schema
- The Nose Knows → `Article` + `Person` (author) schema
- Tasting Notes Runtz → `Article` + `Review` (Product = Runtz)
- Wake & Bake → `Article` + `HowTo` schema
- Best Vaporizers FAQ → `FAQPage` schema

**365daysofweed.com:**
- Each daily content card → `Article` schema (server-side rendered)

**weedaseniorsguide.com:**
- Home → `Book` schema (with ISBN, Amazon link, author)
- About → `Person` schema for William Burkey
- Recommended Vaporizers → `Product` + `Review` schema

### Task 1.4: Author entity infrastructure (2 hours)
Create canonical author bio that lives at:
- `420blazin.com/about` (Blazin Bill)
- `365daysofweed.com/about`
- `weedaseniorsguide.com/about`

Each page links to the others via `sameAs` schema property. AI engines see the
entity graph: "this person is the author of X book, runs Y sites, expertise Z."

E-E-A-T signals to include:
- Author of WEED book (Amazon ASIN B0GPG71T22)
- Cleveland-based cannabis writer
- Years researching cannabis culture
- Cross-references between all 3 sites
- Social media links (when X/Instagram launch)

### Task 1.5: TL;DR / Direct Answer boxes at top of every blog post (1.5 hours)
AI engines preferentially cite content that gives clear direct answers near the
top of the page. Add a 2-3 sentence "Quick Answer" box before the full article.

Example (Best Vaporizers):
> **Quick answer:** The Storz & Bickel Mighty+ ($275) is the best dry herb
> vaporizer for most people in 2026 — medical-grade reliability and the best
> overall vapor quality at a reasonable price. The Venty ($375) is the upgrade
> if money's no object; the XMAX V3 Pro ($100) is the best budget pick.

---

## PHASE 2 — Cannabis Calendar Content (Weeks 2-12, ongoing)

### The Year-Round Content Calendar

| Date | Holiday | Lead Content (which site) | Cross-promote |
|---|---|---|---|
| **Feb 6** | Bob Marley Birthday | 365weed daily card + 420blazin "Best Reggae Strains" post | Music events page |
| **Apr 20** | 4/20 (Tuesday 2027) | All 3 sites coordinated push | — |
| **Apr 18** | 420Blazin Festival 2027 | 420blazin festival page | All 3 sites |
| **Apr 29** | Willie Nelson Birthday | 365weed daily + 420blazin "Country & Cannabis" post | — |
| **Jun 18** | Jack Herer Birthday | 365weed + 420blazin advocacy + sativa strain post | seniors guide ch15 |
| **Jul 1-10** | 7/10 / Dab Day buildup | 420blazin "Best Concentrate Vapes" + 365weed daily content | culture-concentrates page |
| **Aug 8** | National CBD Day | weedaseniorsguide leads (CBD = senior favorite) | 365weed + 420blazin |
| **Oct 20** | Snoop Dogg Birthday | 365weed daily + 420blazin "Hip-Hop Strains" post | — |
| **Nov 22-25** | **Green Wednesday + Black Friday + Cyber Monday** | **MASSIVE 3-site coordinated push** | All POTV sales |
| **Dec 21** | Winter Solstice | 365weed "longest night" indica + edible content | seniors guide |

### Phase 2 Priority Order
1. **Green Wednesday 2026 deals page** (publish Oct 1, 2026) — affiliate goldmine
2. **7/10 Dab Day** content cluster (publish June 15, 2026) — captures July traffic
3. **Cannabis Calendar page** on each site — "Upcoming cannabis holidays" widget that
   updates automatically based on date

---

## PHASE 3 — Entertainment & Personality (Weeks 4-12, ongoing)

The site reads like a research paper. Cannabis culture is half memes, half reverence.
Add the meme layer.

### 3.1: "Stoner Movie + Strain Pairings" series (420blazin)
Weekly posts pairing iconic stoner films with strains and vaporizer settings:
- Half Baked → Northern Lights, low temp
- Pineapple Express → Pineapple Express strain (obvi), midrange temp
- Dazed and Confused → Maui Wowie, cerebral high
- Friday → Sour Diesel
- Cheech & Chong's Up in Smoke → Acapulco Gold (heritage strain)

Each post: strain rec + dispensary link + vaporizer affiliate.

### 3.2: "Strain of the Week" (extends Tasting Notes series)
Weekly tasting note — keeps the $600 haul story alive AND gives AI engines fresh
content signals every 7 days.

### 3.3: Cultural moment posts
- Cheech & Chong cultural retrospective
- Bob Marley + cannabis legacy
- Willie Nelson + the long game (longevity + cannabis)
- Snoop Dogg's Death Row to Cookies pipeline

### 3.4: 365daysofweed daily content audit
365weed is supposed to publish daily content. Are all 365 days populated? If gaps
exist, fill them with cultural moments + strain spotlights + affiliate hooks.

---

## PHASE 4 — Cross-Site Authority Linking (Week 2-3, 4 hours)

The compounding play. Currently each site is an island.

### 4.1: Footer "Network" section on all 3 sites
Standardized footer block:
> **Cannabis Education Network**
> [420Blazin.com](https://420blazin.com) — Cannabis culture & events
> [365 Days of Weed](https://365daysofweed.com) — Daily cannabis education
> [Weed: A Senior's Guide](https://weedaseniorsguide.com) — The book companion

Already exists on 420blazin, needs to be present on the other two.

### 4.2: Contextual cross-links in articles
- Vaporizer guide → "for seniors specifically, see our Senior's Guide vaporizer page"
- Tasting Notes → "the science behind why this strain works is in Chapter 4 of WEED"
- 365weed daily card → "deeper read on terpenes at 420blazin.com/blog/the-nose-knows"

### 4.3: Schema `sameAs` linking
Author Person schema includes all 3 sites + book Amazon page + (future) social.

### 4.4: Coordinated WEED book sales funnel
Each site has a clear path to the book:
- 420blazin: existing book promo on homepage + tasting notes pages
- 365weed: "Want to go deeper than daily tips?" → book CTA on home + relevant days
- weedaseniorsguide: the book IS the site (already optimized)

Goal: 1 book sale per 200 unique visitors across the network = ~150 books/month at
current traffic = ~$150/mo from book royalties (modest but compounds with traffic).

---

## PHASE 5 — Measurement & Iteration (Ongoing)

### KPIs by site

**420blazin.com:**
- Pages per session (currently 1.16 → target 1.40)
- POTV affiliate clicks/month (currently ~50/mo → target 200/mo)
- Google search clicks/month (currently 1,080/mo → target 3,000/mo)
- AI citations (currently 0 → target 5+ visible mentions in ChatGPT/Perplexity)

**365daysofweed.com:**
- Daily active users
- Pro upgrade conversion
- POTV clicks from vape content days

**weedaseniorsguide.com:**
- Amazon book sales (track via Amazon Associates)
- Vaporizer affiliate clicks
- Time on page (senior audience = longer reads)

### Quarterly review
Every 90 days: which sites compounded? Where's the highest ROI per hour invested?
Be willing to kill or merge if data says so (per the audit framework).

---

## Implementation Sequence (recommended order)

**Week 1 (this week):**
- Phase 1 GEO foundation (8 hours)
- Phase 4.1 footer network (1 hour)

**Week 2:**
- Phase 4.2 cross-linking (4 hours)
- Phase 3.1 first stoner movie pairing post (2 hours)

**Week 3-4:**
- Phase 2 calendar — outline Green Wednesday page (don't publish yet, optimize over months)
- Phase 3.2 first Strain of the Week (continues weekly)
- Phase 1.5 TL;DR boxes on all blog posts

**Week 5-8:**
- Phase 2 — 7/10 content cluster (publish mid-June)
- Phase 3.3 cultural moment posts (Bob Marley if Feb is past, otherwise Willie Nelson Apr 29)
- Phase 4.4 book funnel optimization

**Week 9-12:**
- Phase 5 review — what's working?
- Phase 2 — Green Wednesday content (publish Oct 1 for full holiday season runway)
- Continue weekly Strain of the Week + Stoner Movie pairings

---

## Investment vs. Return

**Total estimated implementation:** 40-60 hours of focused work over 12 weeks.

**Expected outcomes by Day 90:**
- 3-5 AI engine citations across ChatGPT/Perplexity for cannabis queries
- 50%+ lift in pages-per-session (continue-reading + cross-links)
- 100+ POTV affiliate clicks/month (4-6x current pace)
- First book sales from 420blazin and 365weed (currently zero)
- 8-12 new evergreen content pieces ranking in Google

**Expected outcomes by Day 180:**
- $500-1,000/month POTV affiliate revenue
- $50-150/month book royalties
- AI citation visibility growing month-over-month
- Network has compounding topical authority

**Why this works:** Cannabis is a high-LTV niche where AI search is eroding click-through.
Sites that build entity authority NOW (Bill Burkey = cannabis expert) will be cited for
years. Sites that don't will be invisible by 2027.

---

## What we DON'T do

- Build a 4th site (focus is the moat, not breadth)
- Compete for "best dry herb vaporizer" globally (we win on terpene angle)
- Add e-commerce / inventory (POTV does that, we do content)
- Chase TikTok/Instagram virality (those audiences don't convert affiliate)

---

## Memory hooks for future sessions

This plan lives at `docs/CANNABIS-NETWORK-AUTHORITY-PLAN.md`. Status updates should
be appended at the bottom as work completes. The priority sequence above is the path.
