# 420blazin: Dosage & Effect Drift in Commercial Gummies

**Audit-Driven Prompting workflow**

Instead of telling the model how to write the article, we give it the rubric the article must survive, then run an isolated auditor against the same rubric.

---

## Working title

*Dosage & Effect Drift in Commercial Gummies: Why "10mg" Isn't 10mg*

## Audience & voice

- **Brand:** 420blazin.com — cannabis culture / education
- **Reader profile:** Cannabis-positive adult, not naive, has bought gummies and been surprised by them. Allergic to both DARE-style fear-mongering and dispensary-budtender hype.
- **Voice anchor:** Pull from `brand-voice.json` for 420blazin. Informed peer, not lecturer.

## The job

Explain four things, in order:
1. Label drift is real and measured (advertised vs. actual total).
2. Within-package piece-to-piece drift is also real, and is a separate phenomenon.
3. What causes both.
4. What a smart consumer does about it.

Without crossing into medical advice or making FDA-actionable health claims.

---

## Source list (verified live as of 2026-05-14)

The creator agent should use these as the citation pool. The auditor must `web_fetch` each cited URL to confirm the claim.

| # | Source | Use for |
|---|--------|---------|
| S1 | Vandrey et al., *Cannabinoid Dose and Label Accuracy in Edible Medical Cannabis Products*, JAMA 2015;313:2491–2493 | Foundational label-accuracy study: 75 products, 17% accurate (±10%), 23% over, 60% under |
| S2 | *Dazed and confused: variability in reported and measured tetrahydrocannabinol content in cannabis edibles*, PubMed PMID 41025251 (Mississippi, 2025) | Updated GC-MS data; Δ8/Δ9 discrepancies ranging from 288mg less to 5,491mg more than label |
| S3 | *Cannabidiol Gummy Products: LC-MS/MS Assessment of Cannabinoid Concentrations*, PubMed PMID 40454463 (2025) | Within-product CV: 2.1–27.1% for CBD, 3.1–23.5% for Δ9-THC across gummies in the same bottle |
| S4 | *Accuracy of labeled THC potency across flower and concentrate cannabis products*, Sci Rep 2025 (nature.com/articles/s41598-025-03854-3) | Colorado data; over-labeling in flower and edibles |
| S5 | *Commercial Cannabis Product Testing: Fidelity to Labels and Regulations*, PMC11952622 | Colorado, n=74, label-vs-observed |
| S6 | Weedmaps, *Precision dosing in cannabis edibles: Why consistency is hard at scale* (2026) | COA checklist, batch info, lay explainer (use sparingly — secondary source) |

Auditor note: S6 is the only non-peer-reviewed source. Acceptable for the "what to look for on a label" practical section. Not acceptable as the sole support for any potency or pharmacology claim.

---

## The rubric (v1 — 35 items, hard pass/fail)

No "partially met." Each item is yes or no.

### Gate 1 — Factual integrity

1. Every numeric claim about label inaccuracy is sourced to a named, retrievable study (author + year minimum; URL preferred).
2. The Vandrey 2015 JAMA study is cited correctly: 75 products, 17% accurate (within ±10% of label), 60% over-labeled, 23% under-labeled. (Over-labeled = product contains LESS THC than the label claims.)
3. Any "piece-to-piece variability" claim uses real CV numbers from S3 (3.1–23.5% for Δ9-THC), not invented ranges.
4. No claim uses "studies show" without naming a specific study.
5. Every cited URL resolves to a live page that contains the claim attributed to it. **Auditor must fetch each one.**
6. No citation older than 2015 unless historically necessary (Vandrey is the only standing exception).
7. No invented author names, journals, DOIs, or PMIDs.

### Gate 2 — Conceptual completeness

8. The article distinguishes **label drift** (advertised vs. actual total) from **piece-to-piece drift** (variability within one package). Different phenomena, different causes.
9. The article explains the physical reason for piece-to-piece drift: THC is fat-soluble and doesn't homogenize evenly in a water/sugar/pectin matrix at scale.
10. The article notes storage and age affect potency (THC degrades, especially with heat/light).
11. The article notes onset and intensity depend on more than dose (fed/fasted state, individual metabolism, tolerance).
12. The article doesn't conflate Δ9-THC, Δ8-THC, and hemp-derived products — different regulatory and quality landscapes.
13. The article addresses regulated dispensary product *and* unregulated hemp-derived gummies as separate categories with different drift profiles.

### Gate 3 — Brand voice (420blazin)

14. Tone is informed peer, not lecturer. No "as responsible adults, we must…"
15. No anti-cannabis framing; no pro-cannabis evangelism. Reader chose to be here.
16. Uses cannabis-community vocabulary correctly (edible, gummy, COA, batch, terps) without condescending over-explanation.
17. Humor is allowed; cheap humor at users' expense is not. ("Lol stoner can't math" → fail.)
18. No medical claims. No "helps with anxiety," no "treats insomnia." Effects described as effects, not therapeutic outcomes.
19. No "consult your doctor" boilerplate as a substitute for actual information.

### Gate 4 — Reader utility

20. The article gives the reader at least three concrete, actionable practices to reduce dose surprise.
21. At least one practice involves the COA — what it is, where to find it, what to look at.
22. The article gives a defensible "start low" number without prescribing a dose (descriptive: "many experienced consumers re-baseline at 2.5–5mg with a new product" — not "you should take X mg").
23. The article explains the two-hour onset window without folk-wisdom framing.
24. The article tells the reader what to do if a gummy hits harder than expected — practical, not medical (hydration, wait it out, note the CBD-counters-THC idea is contested).

### Gate 5 — What it must not do

25. No dosage chart by body weight. (Evidence doesn't support it for edibles; the fake precision is exactly what the article is critiquing.)
26. No brand-by-brand "best gummies" rankings without independent lab data.
27. No claims about specific medical conditions.
28. No state-by-state legal advice.
29. No comparison to alcohol that minimizes either substance.
30. No claim that the FDA is about to fix this.

### Gate 6 — Structure

31. Lede establishes stakes in ≤3 sentences. No "Cannabis edibles have become increasingly popular in recent years…" warmup.
32. Subheads are descriptive, not listicle-bait.
33. One pull-quote-worthy line per major section.
34. Closing gives the reader a posture, not a moral.
35. Reading level: roughly 9th–11th grade Flesch-Kincaid. Cannabis vocabulary doesn't count against this.

---

## Workflow

### Step 1 — Creator agent
Fresh context. Inputs: this document + brand-voice.json. Produce an article that passes every one of the 35 audit items. The rubric is the complete specification. Use only the sources in the source list. Cite each numeric/factual claim. Output Markdown only, no rubric, no annotations.

### Step 2 — Auditor agent
Fresh context, MUST NOT share context with creator. Inputs: the draft + this rubric. Web fetch access required. For each of the 35 items output PASS or FAIL with one-sentence justification. For Gate 1 (items 1–7) must web_fetch every cited URL and confirm the claim is supported. Output audit report + summary (Passed X/35, Failed list). Do not rewrite.

### Step 3 — Corrector agent
Inputs: draft + audit report. Fix only FAIL items. Do not rewrite passing sections. Output full revised article in Markdown.

### Step 4 — Loop
Re-audit with fresh auditor. Repeat until 35/35 PASS or 5 cycles.
