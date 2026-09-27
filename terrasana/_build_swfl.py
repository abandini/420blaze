#!/usr/bin/env python3
"""Build the SW Florida ("Naples area") flower terpene grids: RISE Bonita Springs (iHeartJane
store 773, MEDICAL menu) and AYR Bonita Springs (Dutchie api-3, MEDICAL pricing).
Same contract as the other stores (Arial, freeze B2, autofilter, bold-green >=0.50
/ light-green 0.25-0.49, Notes sheet w/ ISO pull date). No Size column.
Sources: risecannabis.com RSC flight payloads (RISE) and Dutchie GraphQL api-3 (AYR).
Florida is medical-only; both menus are the medical menu. Reads _<key>_rows.json written by
_f_relay2rows.py; run counts come from _run_counts.json (missing key -> blanks, no crash).
"""
import json, datetime, os, re
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

INFUSED=re.compile(r"infus|moon ?rock", re.I)  # plain flower only; exclude infused/moonrock

FOLDER = os.path.dirname(os.path.abspath(__file__))
PULL_DATE = datetime.date.today().isoformat()
TERPS = ["Beta Myrcene","Limonene","Beta Caryophyllene","Linalool","Humulene",
         "Alpha Pinene","Beta Pinene","Bisabolol","Caryophyllene Oxide","Eucalyptol","Nerolidol"]
ARIAL="Arial"
BOLD_GREEN=PatternFill("solid",start_color="00B050")
LIGHT_GREEN=PatternFill("solid",start_color="C6EFCE")
HDR_FILL=PatternFill("solid",start_color="D9D9D9")

def parse_terps(s):
    d={}
    if not s: return d
    for kv in s.split("|"):
        if ":" in kv:
            k,v=kv.split(":",1)
            try: d[k.strip()]=r2(float(v))
            except: pass
    return d


def r2(v):
    """Dutchie now returns full-precision doubles (3.5300000000000002); source precision
    is 2dp, so round for display/diff stability. Non-numeric passes through."""
    return round(v, 2) if isinstance(v, (int, float)) else v

def norm_type(t):
    if not t or t=="N/A": return "N/A"
    return " ".join(w.capitalize() for w in t.replace("-"," ").split())

def build(rows, out_fn, source, total_active, no_terp):
    rows=[r for r in rows if not INFUSED.search(r[0] or "")]  # plain flower only
    rows=sorted(rows,key=lambda r:(r[4] if isinstance(r[4],(int,float)) else 0),reverse=True)
    wb=Workbook(); ws=wb.active; ws.title="Flower Terpenes"
    header=["Product","Brand","Type","THC %","Total Terps %"]+TERPS
    ws.append(header)
    for c in range(1,len(header)+1):
        cell=ws.cell(row=1,column=c); cell.font=Font(name=ARIAL,bold=True); cell.fill=HDR_FILL
        cell.alignment=Alignment(horizontal="center",vertical="center",wrap_text=True)
    for r in rows:
        name,brand,typ,thc,tt,ts=r
        terps=parse_terps(ts)
        thc_cell = thc if (isinstance(thc,(int,float)) and thc>0) else ""  # 0/None = scrape gap -> n/a
        rowvals=[name,brand,norm_type(typ),thc_cell,r2(tt)]+[terps[t] if t in terps else "—" for t in TERPS]
        ws.append(rowvals)
    nrows=len(rows)+1; ncols=len(header); terp_start=6
    for ri in range(2,nrows+1):
        for ci in range(1,ncols+1):
            cell=ws.cell(row=ri,column=ci); cell.font=Font(name=ARIAL)
            if ci>=terp_start:
                v=cell.value
                if isinstance(v,(int,float)):
                    if v>=0.50: cell.fill=BOLD_GREEN; cell.font=Font(name=ARIAL,bold=True)
                    elif v>=0.25: cell.fill=LIGHT_GREEN
    ws.column_dimensions["A"].width=40; ws.column_dimensions["B"].width=24; ws.column_dimensions["C"].width=12
    for ci in range(terp_start,ncols+1): ws.column_dimensions[get_column_letter(ci)].width=11
    ws.freeze_panes="B2"; ws.auto_filter.ref=f"A1:{get_column_letter(ncols)}{nrows}"
    ns=wb.create_sheet("Notes")
    notes=[["Field","Value"],["Pull date",PULL_DATE],["Source",source],
           ["Total active flower products",total_active],
           ["Terpene-tested products (rows in grid)",nrows-1],
           ["Active flower with NO terpene data",no_terp],
           ["Note","Highlight: bold-green >=0.50%, light green 0.25-0.49%. '—' = unreported (treated as 0). Pulled "+PULL_DATE+"."]]
    for row in notes: ns.append(row)
    for r in range(1,len(notes)+1):
        ns.cell(row=r,column=1).font=Font(name=ARIAL,bold=(r==1))
        ns.cell(row=r,column=2).font=Font(name=ARIAL,bold=(r==1))
    ns.column_dimensions["A"].width=36; ns.column_dimensions["B"].width=95
    wb.save(os.path.join(FOLDER,out_fn))

RC=json.load(open(os.path.join(FOLDER,"_run_counts.json")))
def rc(key, field):
    return RC.get(key, {}).get(field, "")
STORES=[
  ("_rise_bonita_rows.json","rise_bonita_springs_flower_terpenes.xlsx",
   "iHeartJane listing RSC product-object descriptions - RISE Bonita Springs FL, MEDICAL, Jane store_id 773",rc("rise_bonita","total"),rc("rise_bonita","noterp")),
  ("_ayr_bonita_rows.json","ayr_bonita_springs_flower_terpenes.xlsx",
   "Dutchie GraphQL (api-3) - AYR Bonita Springs FL, MEDICAL, dutchieSlug ayr-fl-bonita-springs",rc("ayr_bonita","total"),rc("ayr_bonita","noterp")),  ("_jungleboys_bonita_rows.json","jungle_boys_bonita_springs_flower_terpenes.xlsx",
   "Dutchie GraphQL (api-3) - Jungle Boys Bonita Springs FL, MEDICAL, dispensaryId 64d3ef5b6d1beb00099c7f8a",rc("jungleboys_bonita","total"),rc("jungleboys_bonita","noterp")),
  ("_planet13_bonita_rows.json","planet13_bonita_springs_flower_terpenes.xlsx",
   "Dutchie GraphQL (api-3) - Planet 13 Bonita Springs FL, MEDICAL, dispensaryId 667b3948cbf457a368d3b2a1",rc("planet13_bonita","total"),rc("planet13_bonita","noterp")),
  ("_planet13_capecoral_rows.json","planet13_cape_coral_flower_terpenes.xlsx",
   "Dutchie GraphQL (api-3) - Planet 13 Cape Coral FL, MEDICAL, dispensaryId 667b39b0a92b42ca87fce184",rc("planet13_capecoral","total"),rc("planet13_capecoral","noterp")),
  ("_cookies_fortmyers_rows.json","cookies_fort_myers_flower_terpenes.xlsx",
   "Dutchie GraphQL (api-3) - Cookies Fort Myers FL, MEDICAL, dispensaryId 67366da98578fbbad2f0eb80",rc("cookies_fortmyers","total"),rc("cookies_fortmyers","noterp")),
  ("_ayr_fortmyers_rows.json","ayr_fort_myers_flower_terpenes.xlsx",
   "Dutchie GraphQL (api-3) - AYR Fort Myers (Cleveland Ave) FL, MEDICAL, dispensaryId 6074e5f6c2e3a100accf3239",rc("ayr_fortmyers","total"),rc("ayr_fortmyers","noterp")),
  ("_ayr_capecoral_rows.json","ayr_cape_coral_flower_terpenes.xlsx",
   "Dutchie GraphQL (api-3) - AYR Cape Coral FL, MEDICAL, dispensaryId 6074e56d9bf22d00ae8f55e4",rc("ayr_capecoral","total"),rc("ayr_capecoral","noterp")),
]
def write_tsv(rows,fn):
    rows2=sorted(rows,key=lambda r:(r[4] if isinstance(r[4],(int,float)) else 0),reverse=True)
    with open(os.path.join(FOLDER,fn),"w") as f:
        for r in rows2:
            name,brand,typ,thc,tt,ts=r; d=parse_terps(ts)
            f.write("\t".join([name or "",brand or "",norm_type(typ),str(thc),str(r2(tt))]+[str(d.get(t,0)) for t in TERPS])+"\n")

if __name__=="__main__":
    for src_fn,out_fn,source,total,noterp in STORES:
        path=os.path.join(FOLDER,src_fn)
        if not os.path.exists(path):
            print(f"skip {out_fn}: {src_fn} not found (store not pulled this run)"); continue
        rows=json.load(open(path))
        build(rows,out_fn,source,total,noterp)
        write_tsv(rows,src_fn.replace("rows.json","terp_data.tsv"))
        print(f"built {out_fn}: {len(rows)} tested / {total} active")
