"""Fail-closed PDF and DOM checks. No prices or areas are calculated here."""
from __future__ import annotations

import re
from urllib.parse import urlsplit, urlunsplit


def normalized(text: str) -> str:
    return re.sub(r"\s+", "", text).replace("−", "-").casefold()


def link(value: str) -> str:
    p = urlsplit(value)
    if p.scheme not in {"https", "http", "mailto", "tel"} or any(ord(c) < 32 for c in value):
        raise ValueError("Unsupported contact link")
    if p.scheme in {"https", "http"} and (not p.hostname or p.username or p.password):
        raise ValueError("Invalid contact URL")
    return value


def validate(data: dict) -> None:
    if data.get("schemaVersion") != 1:
        raise ValueError("Unsupported snapshot schemaVersion")
    for key in ("project", "region", "pricing", "plans", "comparison", "contacts", "brand"):
        if key not in data:
            raise ValueError(f"Missing snapshot {key}")
    if data["region"]["code"] not in {"nn", "msk"}:
        raise ValueError("Unsupported region")
    p = data["project"]
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", p["slug"]):
        raise ValueError("Invalid project slug")
    if p["url"] != f'https://avgst.ru/catalog/{p["slug"]}':
        raise ValueError("Project URL must be canonical")
    for key in ("name", "technology", "areaLabel", "floorsLabel", "bedroomsLabel", "bathroomsLabel", "heroImage"):
        if not isinstance(p.get(key), str) or not p[key].strip():
            raise ValueError(f"Missing project {key}")
    if not data["plans"] or len(data["plans"]) > 12:
        raise ValueError("Expected 1..12 planning variants")
    if len(data["pricing"]["tiers"]) != 3:
        raise ValueError("Expected three pricing tiers")
    for tier in data["pricing"]["tiers"]:
        if not tier.get("name") or not tier.get("priceLabel"):
            raise ValueError("Tier requires a truthful price/unavailability label")
    if not data["comparison"]["rows"]:
        raise ValueError("Empty technical comparison")
    for row in data["comparison"]["rows"]:
        if not row.get("label") or len(row["values"]) != 3 or any(not isinstance(v, str) or not v for v in row["values"]):
            raise ValueError("Comparison requires three explicit text values per row")
    for variant in data["plans"]:
        if not variant["floors"] or len(variant["floors"]) > 4:
            raise ValueError("Expected 1..4 floors per variant")
        for floor in variant["floors"]:
            if not floor.get("image") or not floor.get("rooms"):
                raise ValueError("Every floor requires a plan and complete room list")
            for room in floor["rooms"]:
                if not room.get("name") or not room.get("areaLabel"):
                    raise ValueError("Room requires name and supplied area/unavailability label")
    c = data["contacts"]
    for key in ("company", "phone", "phoneHref", "email", "address", "website", "about", "legal", "updatedAt"):
        if not isinstance(c.get(key), str) or not c[key].strip():
            raise ValueError(f"Missing contacts {key}")
    for social in data["contacts"]["socials"]:
        link(social["href"])
    for href in expected_links(data):
        link(href)


def expected_links(data: dict) -> set[str]:
    c = data["contacts"]
    return {data["project"]["url"], c["phoneHref"], "mailto:" + c["email"], c["website"],
            *(s["href"] for s in c["socials"] if s["label"].lower() in {"max", "telegram", "instagram"})}


def text_expectations(data: dict) -> list[list[str]]:
    p = data["project"]
    cover = [p[k] for k in ("name", "areaLabel", "floorsLabel", "bedroomsLabel", "bathroomsLabel")] + [p.get("technologyLabel", p["technology"])]
    if data["pricing"]["mortgagePaymentLabel"]:
        cover += ["В ипотеку от", data["pricing"]["mortgagePaymentLabel"]]
    pages = [cover]
    for variant in data["plans"]:
        words = ["Планировка"] + ([variant["name"]] if len(data["plans"]) > 1 else [])
        for floor in variant["floors"]:
            words.append(floor["name"])
            for room in floor["rooms"]:
                words.extend([room["name"], room["areaLabel"]])
        pages.append(words)
    comparison = ["Комплектации", data["region"]["name"]]
    for tier in data["pricing"]["tiers"]:
        comparison.extend([tier["name"], tier["priceLabel"]])
        if tier["special"]:
            comparison.append("Специальная цена")
    for row in data["comparison"]["rows"]:
        comparison.append(row["label"])
        if row.get("cells"):
            for cell in row["cells"]:
                comparison.extend([cell["label"], *cell["details"]])
        else:
            comparison.extend(row["values"])
        if row.get("noteFacts"):
            comparison.extend(row["noteFacts"])
        elif row.get("note"):
            comparison.append(row["note"])
    pages.append(comparison)
    c = data["contacts"]
    pages.append([c[k] for k in ("company", "phone", "email", "address", "about", "legal", "updatedAt")])
    return pages


def geometry_errors(width: float, height: float) -> list[str]:
    return [] if abs(width - 297 / 25.4 * 72) < 1 and abs(height - 210 / 25.4 * 72) < 1 else ["Page is not A4 landscape"]


def inspect_pdf(path, data: dict, dom: dict, previews, dpi: int = 180) -> dict:
    import fitz
    import zxingcpp
    from PIL import Image
    errors = list(dom.get("errors", []))
    checks = []
    expected = text_expectations(data)
    if dom.get("comparisonPages"):
        import copy
        index = 1 + len(data["plans"])
        expanded = []
        covered = []
        for ids in dom["comparisonPages"]:
            part = copy.deepcopy(data)
            part["comparison"]["rows"] = [row for row in data["comparison"]["rows"] if row["id"] in ids]
            expanded.append(text_expectations(part)[index])
            covered.extend(ids)
        if sorted(covered) != sorted(row["id"] for row in data["comparison"]["rows"]):
            errors.append("Pagination lost or duplicated technical elements")
        expected = expected[:index] + expanded + expected[index + 1:]
    with fitz.open(path) as doc:
        if len(doc) != len(expected):
            errors.append(f"Expected {len(expected)} pages, got {len(doc)}")
        found_links = set()
        qr_pages = {0, len(doc) - 1}
        for i, page in enumerate(doc):
            errors.extend(f"Page {i+1}: {e}" for e in geometry_errors(page.rect.width, page.rect.height))
            text = normalized(page.get_text())
            if not text or "\ufffd" in text or "\u25a1" in text:
                errors.append(f"Page {i+1}: empty text or missing glyph")
            if i < len(expected):
                for word in expected[i]:
                    if normalized(word) not in text:
                        errors.append(f"Page {i+1}: missing text {word[:100]}")
            fonts = page.get_fonts(full=True)
            if not fonts:
                errors.append(f"Page {i+1}: no fonts")
            for font in fonts:
                xref, _, _, basefont = font[:4]
                if "geist" not in basefont.lower() or "mono" in basefont.lower() or not doc.extract_font(xref)[3]:
                    errors.append(f"Page {i+1}: unembedded/fallback font {basefont}")
            found_links.update(x.get("uri", "") for x in page.get_links())
            pix = page.get_pixmap(dpi=dpi, alpha=False)
            target = previews / f"page-{i+1:03d}.png"
            pix.save(target)
            if i in qr_pages:
                image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
                decoded = {result.text for result in zxingcpp.read_barcodes(image)}
                if data["project"]["url"] not in decoded:
                    errors.append(f"Page {i+1}: project QR cannot be decoded")
            checks.append({"page": i+1, "fonts": sorted({f[3] for f in fonts}), "png": str(target)})
        def canonical_link(href):
            parsed = urlsplit(href)
            return urlunsplit((parsed.scheme, parsed.netloc, parsed.path or '/', parsed.query, parsed.fragment)) if parsed.scheme in {'http', 'https'} else href
        found_links = {canonical_link(href) for href in found_links}
        for href in {canonical_link(href) for href in expected_links(data)} - found_links:
            errors.append(f"Missing clickable link {href}")
    return {"status": "failed" if errors else "passed", "errors": errors, "checks": checks,
            "pageCount": len(checks), "expectedPageCount": len(expected), "dom": dom,
            "visualReview": "required", "previewDpi": dpi}
