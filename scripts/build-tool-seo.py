#!/usr/bin/env python3
"""build-tool-seo.py — make the JS-rendered tool data crawlable by AI answer engines.

The Strain Finder and Edible Decoder render their rows in client-side JS, so
GPTBot/ClaudeBot/PerplexityBot/Google-AI (which don't execute JS) see an empty
shell. This stamps machine-readable JSON-LD (schema.org Dataset + ItemList with
the actual terpene rows, dominant terpene, and effect) into the static HTML of
both pages, between <!-- TOOL-SEO START/END --> markers. Idempotent + deterministic.

Runs in the feed-refresh pipeline (refresh-feeds.sh) so the structured data stays
in lockstep with data/*.json. Manual: python3 scripts/build-tool-seo.py
"""
import json, re
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
STRAIN = REPO / "data" / "strain-terpenes.json"
EDIBLE = REPO / "data" / "edible-products.json"
START, END = "<!-- TOOL-SEO START -->", "<!-- TOOL-SEO END -->"

# Non-medical, hedged effect language mirroring the tools' own copy.
EFFECT = {
    "myrcene": "sedation and heavy-body effects",
    "limonene": "mood-lift and an uplifting, social feel",
    "caryophyllene": "calm and easing tension",
    "linalool": "relaxation and a calming feel",
    "humulene": "appetite suppression",
    "pinene": "alertness and focus",
    "bisabolol": "soothing, calming effects",
}
LABEL = {"myrcene": "Myrcene", "limonene": "Limonene", "caryophyllene": "Beta-Caryophyllene",
         "linalool": "Linalool", "humulene": "Humulene", "pinene": "Pinene", "bisabolol": "Bisabolol"}

def dominant(p):
    vals = {k: float(p.get(k, 0) or 0) for k in ["myrcene", "limonene", "caryophyllene", "linalool", "humulene", "bisabolol"]}
    vals["pinene"] = float(p.get("apinene", 0) or 0) + float(p.get("bpinene", 0) or 0)
    k = max(vals, key=vals.get)
    return (k, round(vals[k], 2)) if vals[k] > 0 else (None, 0)

def inject(path, blocks):
    """Replace the TOOL-SEO block if present, else insert before </head>."""
    html = path.read_text(encoding="utf-8")
    payload = START + "\n" + "\n".join(blocks) + "\n" + END
    if START in html and END in html:
        html = re.sub(re.escape(START) + r".*?" + re.escape(END), payload, html, flags=re.S)
    else:
        html = html.replace("</head>", payload + "\n</head>", 1)
    path.write_text(html, encoding="utf-8")

def ld(obj):
    return '<script type="application/ld+json">\n' + json.dumps(obj, indent=1, ensure_ascii=False) + '\n</script>'

def build_strain():
    d = json.loads(STRAIN.read_text())
    prods = d["products"]
    # representative, citable set: top 40 by total terpenes (richest/most characterful)
    top = sorted(prods, key=lambda p: float(p.get("terps", 0) or 0), reverse=True)[:40]
    items = []
    for i, p in enumerate(top, 1):
        dom, dv = dominant(p)
        desc = f"{p.get('type','Hybrid')}; {p.get('thc','?')}% THC; {p.get('terps','?')}% total terpenes"
        if dom:
            desc += f"; dominant terpene {LABEL[dom]} ({dv}%) — associated with {EFFECT[dom]} (folk/preliminary)"
        items.append({"@type": "ListItem", "position": i,
                      "item": {"@type": "Thing", "name": p["name"], "description": desc + "."}})
    dataset = {"@context": "https://schema.org", "@type": "Dataset",
        "name": "Cleveland-Area Dispensary Flower Terpene Profiles",
        "description": "Lab-reported terpene percentages (myrcene, limonene, beta-caryophyllene, linalool, humulene, pinene, bisabolol) and THC for cannabis flower on real Ohio & Michigan dispensary menus. Powers the 420Blazin Strain Finder terpene-to-effect matcher.",
        "url": "https://420blazin.com/strain-finder",
        "creator": {"@type": "Person", "name": "Bill Burkey", "url": "https://420blazin.com/about"},
        "keywords": ["cannabis terpenes", "myrcene", "limonene", "beta-caryophyllene", "linalool", "strain effects", "terpene profile", "Cleveland dispensary"],
        "variableMeasured": ["THC %", "Total terpenes %", "Myrcene", "Limonene", "Beta-Caryophyllene", "Linalool", "Humulene", "Pinene", "Bisabolol"],
        "temporalCoverage": d.get("updated", ""), "isAccessibleForFree": True,
        "distribution": {"@type": "DataDownload", "encodingFormat": "application/json",
                         "contentUrl": "https://420blazin.com/data/strain-terpenes.json"}}
    itemlist = {"@context": "https://schema.org", "@type": "ItemList",
        "name": "Terpene-rich cannabis strains and their associated effects",
        "description": f"Representative sample of {len(items)} terpene-rich flowers from Ohio & Michigan dispensary menus (of {len(prods)} tracked), each with its dominant terpene and associated effect.",
        "numberOfItems": len(items), "itemListElement": items}
    inject(REPO / "strain-finder.html", [ld(dataset), ld(itemlist)])
    return len(items), len(prods), d.get("updated", "")

def build_edible():
    d = json.loads(EDIBLE.read_text())
    prof = [p for p in d["products"] if p.get("profile") not in (None, "none")]
    items = []
    for i, p in enumerate(sorted(prof, key=lambda p: p["name"]), 1):
        dom, dv = dominant(p)
        dose = f"{p['thcMg']} mg/piece" if p.get("thcMg") else (f"{p['thcMgPkg']} mg/package" if p.get("thcMgPkg") else "dose n/a")
        desc = f"{p.get('form','edible')} · {p.get('extractType','')} · {dose}"
        if dom:
            desc += f"; terpene profile {'inherited from ' + p['matchedCultivar'] if p.get('matchedCultivar') else 'published COA'}, dominant {LABEL[dom]} — associated with {EFFECT[dom]} (folk/preliminary)"
        items.append({"@type": "ListItem", "position": i,
                      "item": {"@type": "Thing", "name": p["name"], "description": desc + "."}})
    webapp = {"@context": "https://schema.org", "@type": "WebApplication",
        "name": "The Edible Decoder", "url": "https://420blazin.com/edibles",
        "applicationCategory": "LifestyleApplication", "operatingSystem": "Web",
        "description": "Find full-spectrum (non-distillate) cannabis edibles by terpene profile, dial the dose in mg, filter a heart-smart low-THC lane, and scope by dispensary — from real Ohio & Michigan menus.",
        "creator": {"@type": "Person", "name": "Bill Burkey", "url": "https://420blazin.com/about"},
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}}
    dataset = {"@context": "https://schema.org", "@type": "Dataset",
        "name": "Full-Spectrum Cannabis Edibles — Terpene & Dose Data",
        "description": f"Terpene-profiled (non-distillate) cannabis edibles from Ohio & Michigan dispensary menus with dose (mg), extract type, and inherited/COA terpene profile. {len(prof)} of {d.get('count','?')} tracked edibles carry a real terpene profile; the rest are terpene-dead distillate.",
        "url": "https://420blazin.com/edibles",
        "creator": {"@type": "Person", "name": "Bill Burkey", "url": "https://420blazin.com/about"},
        "keywords": ["cannabis edibles", "full-spectrum edibles", "live rosin gummies", "THC dose mg", "edible terpenes", "distillate"],
        "variableMeasured": ["THC mg per piece", "THC mg per package", "Extract type", "Terpene profile", "Dispensary"],
        "temporalCoverage": d.get("updated", ""), "isAccessibleForFree": True,
        "distribution": {"@type": "DataDownload", "encodingFormat": "application/json",
                         "contentUrl": "https://420blazin.com/data/edible-products.json"}}
    itemlist = {"@context": "https://schema.org", "@type": "ItemList",
        "name": "Terpene-profiled full-spectrum cannabis edibles",
        "numberOfItems": len(items), "itemListElement": items}
    inject(REPO / "edibles.html", [ld(webapp), ld(dataset), ld(itemlist)])
    return len(items), d.get("count", "?"), d.get("updated", "")

if __name__ == "__main__":
    s = build_strain(); print(f"strain-finder: Dataset + ItemList of {s[0]}/{s[1]} strains (updated {s[2]})")
    e = build_edible(); print(f"edibles: WebApplication + Dataset + ItemList of {e[0]} profiled of {e[1]} (updated {e[2]})")
