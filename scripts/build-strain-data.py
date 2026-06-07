#!/usr/bin/env python3
"""
build-strain-data.py — convert the Terrasana flower terpene spreadsheet into the
JSON the /strain-finder page reads.

Data flow:  coworker's schedule -> updated .xlsx -> THIS SCRIPT -> data/strain-terpenes.json -> page fetch

Usage:
    python3 scripts/build-strain-data.py [path/to/terrasana_cleveland_flower_terpenes.xlsx]

Default input is $TERRASANA_XLSX or ~/Downloads/terrasana_cleveland_flower_terpenes.xlsx
Output: data/strain-terpenes.json (relative to repo root)

The xlsx is expected to have a "Terpene Grid" sheet with columns:
Product, Size, Brand, Type, THC %, Total Terps %, Beta Myrcene, Limonene,
Beta Caryophyllene, Linalool, Humulene, Alpha Pinene, Beta Pinene, Bisabolol,
Caryophyllene Oxide, Eucalyptol, Nerolidol
and a "Notes" sheet whose 2nd line contains the pull date.
"""
import json, os, re, sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
# Default input is the in-repo /terrasana folder that "claude cowork" keeps refreshed on a schedule.
DEFAULT_XLSX = os.environ.get("TERRASANA_XLSX",
    str(REPO / "terrasana" / "terrasana_cleveland_flower_terpenes.xlsx"))
OUT = REPO / "data" / "strain-terpenes.json"

def num(x):
    if x is None or x == "—" or x == "":
        return 0.0
    try:
        return round(float(x), 3)
    except (TypeError, ValueError):
        return 0.0

def main():
    try:
        import openpyxl
    except ImportError:
        sys.exit("openpyxl required:  pip install openpyxl")

    xlsx = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(DEFAULT_XLSX)
    if not xlsx.exists():
        sys.exit(f"input spreadsheet not found: {xlsx}")

    wb = openpyxl.load_workbook(xlsx, data_only=True)
    ws = wb["Terpene Grid"]
    rows = list(ws.iter_rows(values_only=True))

    # try to read the pull date from the Notes sheet
    pulled = ""
    if "Notes" in wb.sheetnames:
        for r in wb["Notes"].iter_rows(values_only=True):
            if r and r[0] and "pulled" in str(r[0]).lower():
                m = re.search(r"(\d{4}-\d{2}-\d{2})", str(r[0]))
                if m:
                    pulled = m.group(1)

    products = []
    for r in rows[1:]:
        if not r or not r[0]:
            continue
        products.append({
            "name": r[0], "size": r[1], "brand": r[2], "type": r[3],
            "thc": num(r[4]), "terps": num(r[5]),
            "myrcene": num(r[6]), "limonene": num(r[7]), "caryophyllene": num(r[8]),
            "linalool": num(r[9]), "humulene": num(r[10]), "apinene": num(r[11]),
            "bpinene": num(r[12]), "bisabolol": num(r[13]),
            "caryophylleneoxide": num(r[14]), "eucalyptol": num(r[15]), "nerolidol": num(r[16]),
        })

    payload = {
        "source": "Terrasana Cleveland (Garfield Heights) — medical menu",
        "updated": pulled or "",
        "count": len(products),
        "products": products,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=1))
    print(f"wrote {OUT}  ({len(products)} products, updated {payload['updated'] or 'unknown'})")

if __name__ == "__main__":
    main()
