#!/usr/bin/env python3
"""Import stock items from the inventory workbook into public.stock_items.

Source: sheet "MATEROS HECHOS EN CASA" of docs/INVENTARIO NACER GROUP..xlsx.
Only three columns are taken: FOTO DE PRODUCTO (D), NOMBRE (E) and #REF (I).

  * #REF 1..199    -> made in the workshop: CM + ref (CM0001), origin
                      'workshop'. A ref shared by several rows (one per
                      color/model) gets -01, -02... in sheet order.
  * #REF 200 and up -> purchased inventory: IC0001..ICnnnn, renumbered in
                      sheet order, origin 'purchased'.
  * Rows without a name are skipped.
  * Names are trimmed, whitespace collapsed and sentence-cased. A leading
    "Materito", "Matera", "Materia"... becomes "Matero".
  * The photo is the first image anchored to the row in column D. Images are
    read from the drawing XML directly (openpyxl drops them).

Only the standard library is used. Without --apply it prints a dry-run preview
and touches nothing. With --apply it uploads the photos to
catalogo_nacergroup/stock-items/<sku>.jpg, upserts the rows by sku and then
realigns the SKU sequences (rpc/sync_stock_item_sequences) so the panel keeps
generating free numbers. Re-runs never overwrite stock_qty.

This is the INITIAL LOAD only. After it, the database is the source of truth
and new insumos are created from the panel with a generated SKU. --apply
refuses to run when stock_items already has components, because IC numbers
come from sheet order: inserting a row in the middle of the sheet would shift
every later IC and the upsert would silently swap names and photos between
existing items. --force skips that guard; use it only on an empty table or
when the sheet order is known to be unchanged.

Usage:
  python3 scripts/import-stock-items.py                 # preview
  python3 scripts/import-stock-items.py --images-dir D  # preview + dump photos
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \\
    python3 scripts/import-stock-items.py --apply [--force]
"""

import argparse
import json
import os
import posixpath
import re
import sys
import urllib.request
import zipfile
from collections import Counter, defaultdict
from xml.etree import ElementTree as ET

DEFAULT_WORKBOOK = "docs/INVENTARIO NACER GROUP..xlsx"
SHEET_NAME = "MATEROS HECHOS EN CASA"
BUCKET = "catalogo_nacergroup"
FOLDER = "stock-items"

PHOTO_COL, NAME_COL, REF_COL = 3, 4, 8  # zero-based: D, E, I
WORKSHOP_MAX_REF = 199
PURCHASED_MIN_REF = 200

NS = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pr": "http://schemas.openxmlformats.org/package/2006/relationships",
    "xdr": "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
}
R_ID = "{%s}id" % NS["r"]
R_EMBED = "{%s}embed" % NS["r"]

MATERO_PREFIX = re.compile(r"^(materit[oa]s?|mater[oa]s?|materia)\b", re.IGNORECASE)


def clean_name(raw):
    name = " ".join(str(raw).split()).capitalize()
    return MATERO_PREFIX.sub("Matero", name)


def col_index(cell_ref):
    letters = re.match(r"[A-Z]+", cell_ref).group(0)
    index = 0
    for ch in letters:
        index = index * 26 + ord(ch) - ord("A") + 1
    return index - 1


def rels_of(zf, part):
    """Relationship id -> absolute part path, for the part at `part`."""
    folder, file = posixpath.split(part)
    rels_path = posixpath.join(folder, "_rels", file + ".rels")
    root = ET.fromstring(zf.read(rels_path))
    return {
        r.get("Id"): posixpath.normpath(posixpath.join(folder, r.get("Target")))
        for r in root.findall("pr:Relationship", NS)
    }


def sheet_part(zf, sheet_name):
    workbook = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = rels_of(zf, "xl/workbook.xml")
    for sheet in workbook.find("m:sheets", NS):
        if sheet.get("name") == sheet_name:
            return rels[sheet.get(R_ID)]
    raise SystemExit(f"Sheet not found: {sheet_name}")


def shared_strings(zf):
    if "xl/sharedStrings.xml" not in zf.namelist():
        return []
    root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    return ["".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])) for si in root]


def read_cells(zf, part, strings, wanted_cols):
    """Row number (1-based) -> {col: value} for the wanted columns."""
    rows = defaultdict(dict)
    root = ET.fromstring(zf.read(part))
    for c in root.iter("{%s}c" % NS["m"]):
        col = col_index(c.get("r"))
        if col not in wanted_cols:
            continue
        row = int(re.search(r"\d+", c.get("r")).group(0))
        kind = c.get("t")
        if kind == "s":
            value = strings[int(c.find("m:v", NS).text)]
        elif kind == "inlineStr":
            value = "".join(t.text or "" for t in c.iter("{%s}t" % NS["m"]))
        else:
            v = c.find("m:v", NS)
            value = v.text if v is not None else None
        if value is not None and str(value).strip() != "":
            rows[row][col] = value
    return rows


def read_photos(zf, part):
    """Row number (1-based) -> media part of the first image anchored in column D."""
    photos = {}
    drawing_ids = [
        target for target in rels_of(zf, part).values() if "/drawings/" in target
    ]
    for drawing in drawing_ids:
        media = rels_of(zf, drawing)
        root = ET.fromstring(zf.read(drawing))
        for anchor in root:
            start = anchor.find("xdr:from", NS)
            blip = anchor.find(".//a:blip", NS)
            if start is None or blip is None:
                continue
            if int(start.find("xdr:col", NS).text) != PHOTO_COL:
                continue
            row = int(start.find("xdr:row", NS).text) + 1
            photos.setdefault(row, media[blip.get(R_EMBED)])
    return photos


def parse_ref(value):
    try:
        ref = float(value)
    except (TypeError, ValueError):
        return None
    return int(ref) if ref.is_integer() else None


def build_items(workbook):
    with zipfile.ZipFile(workbook) as zf:
        part = sheet_part(zf, SHEET_NAME)
        cells = read_cells(zf, part, shared_strings(zf), {NAME_COL, REF_COL})
        photos = read_photos(zf, part)

        workshop, purchased, skipped = [], [], []
        for row in sorted(cells):
            if row == 1:
                continue
            name, ref = cells[row].get(NAME_COL), parse_ref(cells[row].get(REF_COL))
            if not name:
                skipped.append({"row": row, "ref": ref, "reason": "no name"})
                continue
            entry = {"row": row, "ref": ref, "name": clean_name(name), "photo": photos.get(row)}
            if ref is not None and 1 <= ref <= WORKSHOP_MAX_REF:
                workshop.append({**entry, "origin": "workshop"})
            elif ref is not None and ref >= PURCHASED_MIN_REF:
                purchased.append({**entry, "origin": "purchased"})
            else:
                skipped.append({"row": row, "ref": ref, "reason": "ref out of range"})

        per_ref = Counter(e["ref"] for e in workshop)
        seen = Counter()
        for e in workshop:
            base = f"CM{e['ref']:04d}"
            if per_ref[e["ref"]] > 1:
                seen[e["ref"]] += 1
                e["sku"] = f"{base}-{seen[e['ref']]:02d}"
            else:
                e["sku"] = base
        for n, e in enumerate(purchased, start=1):
            e["sku"] = f"IC{n:04d}"

        items = workshop + purchased
        for e in items:
            e["image"] = zf.read(e["photo"]) if e["photo"] else None
        return items, skipped


def request(method, url, key, body, content_type, extra_headers=None):
    headers = {
        "Authorization": f"Bearer {key}",
        "apikey": key,
        "Content-Type": content_type,
        **(extra_headers or {}),
    }
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    with urllib.request.urlopen(req) as res:
        return res.status


def get_json(url, key):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {key}", "apikey": key})
    with urllib.request.urlopen(req) as res:
        return json.load(res)


def table_has_components(base_url, key):
    rows = get_json(f"{base_url}/rest/v1/stock_items?select=id&kind=eq.component&limit=1", key)
    return len(rows) > 0


def apply(items, base_url, key):
    for e in items:
        if e["image"] is None:
            e["image_url"] = None
            continue
        path = f"{BUCKET}/{FOLDER}/{e['sku']}.jpg"
        request("POST", f"{base_url}/storage/v1/object/{path}", key, e["image"],
                "image/jpeg", {"x-upsert": "true"})
        e["image_url"] = f"{base_url}/storage/v1/object/public/{path}"

    rows = [
        {"sku": e["sku"], "name": e["name"], "kind": "component", "unit": "unidad",
         "origin": e["origin"], "image_url": e["image_url"]}
        for e in items
    ]
    request("POST", f"{base_url}/rest/v1/stock_items?on_conflict=sku", key,
            json.dumps(rows).encode(), "application/json",
            {"Prefer": "resolution=merge-duplicates,return=minimal"})
    # Explicit SKUs do not advance the sequences; realign them so the panel's
    # create_stock_item never hands out a number this import just took.
    request("POST", f"{base_url}/rest/v1/rpc/sync_stock_item_sequences", key,
            b"{}", "application/json")


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--workbook", default=DEFAULT_WORKBOOK)
    parser.add_argument("--images-dir", help="dump each photo as <sku>.jpg here")
    parser.add_argument("--apply", action="store_true", help="upload photos and upsert rows")
    parser.add_argument("--force", action="store_true",
                        help="allow --apply when stock_items already has components")
    args = parser.parse_args()

    items, skipped = build_items(args.workbook)

    if args.images_dir:
        os.makedirs(args.images_dir, exist_ok=True)
        for e in items:
            if e["image"] is not None:
                with open(os.path.join(args.images_dir, f"{e['sku']}.jpg"), "wb") as f:
                    f.write(e["image"])

    preview = {
        "workshop_cm": sum(e["sku"].startswith("CM") for e in items),
        "purchased_ic": sum(e["sku"].startswith("IC") for e in items),
        "without_photo": [e["sku"] for e in items if e["image"] is None],
        "skipped": skipped,
        "items": [{k: e[k] for k in ("sku", "row", "ref", "name")} for e in items],
    }

    if not args.apply:
        json.dump(preview, sys.stdout, ensure_ascii=False, indent=1)
        print()
        return

    base_url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not base_url or not key:
        raise SystemExit("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required with --apply")
    base_url = base_url.rstrip("/")
    if not args.force and table_has_components(base_url, key):
        raise SystemExit("stock_items already has components: this script is the initial load "
                         "only. Create new insumos from the panel, or pass --force if the sheet "
                         "order is unchanged.")
    apply(items, base_url, key)
    print(f"Imported {len(items)} stock items "
          f"({preview['workshop_cm']} CM, {preview['purchased_ic']} IC).")


if __name__ == "__main__":
    main()
