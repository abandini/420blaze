#!/usr/bin/env python3
"""validate-feeds.py — sanity gate for the rebuilt data feeds.

The watcher (refresh-feeds.sh) runs this AFTER rebuilding and BEFORE committing.
Exit 0 = feeds are plausible, safe to ship. Non-zero = refuse to deploy.

It compares the freshly-built working-tree feeds against the last-committed (HEAD)
versions plus absolute floors, so a half-finished source edit, a missing/corrupt
spreadsheet, or a build regression can't silently push a gutted feed to production.

Manual use:  python3 scripts/validate-feeds.py   (validates current working tree)
"""
import json, re, subprocess, sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
MAX_DROP = 0.35  # reject if a feed shrinks to < 65% of the currently-deployed count

FLOWER_TERPS = ["myrcene", "limonene", "caryophyllene", "linalool",
                "humulene", "apinene", "bpinene", "bisabolol"]

CHECKS = {
    "data/strain-terpenes.json": {"floor": 800,  "terp_keys": FLOWER_TERPS, "min_cov": 0.90},
    "data/edible-products.json": {"floor": 1500, "terp_keys": None,          "min_cov": None},
}

def head_json(path):
    """The version currently committed/deployed (HEAD), or None if unavailable."""
    try:
        out = subprocess.run(["git", "show", f"HEAD:{path}"], cwd=REPO,
                             capture_output=True, text=True, check=True).stdout
        return json.loads(out)
    except Exception:
        return None

def reject(msg):
    print(f"REJECT  {msg}")
    return False

def check(path, cfg):
    try:
        d = json.loads((REPO / path).read_text())
    except Exception as e:
        return reject(f"{path}: not valid JSON ({e})")

    prods = d.get("products")
    if not isinstance(prods, list):
        return reject(f"{path}: missing products[] array")
    n = len(prods)

    if d.get("count") != n:
        return reject(f"{path}: header count={d.get('count')} != len(products)={n}")
    if n < cfg["floor"]:
        return reject(f"{path}: {n} products is below the absolute floor of {cfg['floor']}")
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", str(d.get("updated", ""))):
        return reject(f"{path}: 'updated' is not a YYYY-MM-DD date ({d.get('updated')!r})")
    empty = sum(1 for p in prods if not p.get("name"))
    if empty:
        return reject(f"{path}: {empty} products have an empty name")

    if cfg["terp_keys"]:
        cov = sum(1 for p in prods if any(float(p.get(k, 0) or 0) > 0 for k in cfg["terp_keys"])) / n
        if cov < cfg["min_cov"]:
            return reject(f"{path}: terpene coverage {cov:.0%} < required {cfg['min_cov']:.0%}")

    hd = head_json(path)
    if hd and isinstance(hd.get("products"), list) and hd["products"]:
        prev = len(hd["products"])
        if n < prev * (1 - MAX_DROP):
            drop = 100 * (prev - n) // prev
            return reject(f"{path}: {n} products is a {drop}% drop from deployed {prev} "
                          f"(max allowed {int(MAX_DROP*100)}%) — likely a broken source pull")

    print(f"OK      {path}: {n} products, updated {d['updated']}")
    return True

if __name__ == "__main__":
    ok = all(check(p, c) for p, c in CHECKS.items())
    print("PASS — feeds are safe to ship" if ok else "FAIL — feeds will NOT be deployed")
    sys.exit(0 if ok else 1)
