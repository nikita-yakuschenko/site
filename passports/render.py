"""CLI: python passports/render.py snapshot.json outputdir --site-root ."""
from __future__ import annotations

import argparse
import copy
import hashlib
import io
import json
import os
from pathlib import Path
import sys

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from passports.assets import Assets, data_uri
from passports.preflight import inspect_pdf, validate

TEMPLATE_VERSION = "passport-1.0.0"


def compact_details(facts: list[str]) -> list[str]:
    """Remove exact/redundant phrases after joining execution and shared facts."""
    import re
    def key(text):
        return re.sub(r"[^\w]+", " ", text.casefold()).strip()
    result = []
    for fact in facts:
        if fact.strip() and not any(key(fact) == key(other) for other in result):
            result.append(fact)
    # A completion label and its expanded material describe one characteristic.
    for fact in list(result):
        if ":" not in fact:
            continue
        prefix, material = fact.split(":", 1)
        if prefix.casefold() not in {"чистовая", "чистовое", "черновое", "черновая"}:
            continue
        for other in list(result):
            if other != fact and key(material) and key(material) in key(other):
                result.remove(fact)
                result[result.index(other)] = prefix + ": " + other[0].lower() + other[1:]
                break
    return [fact for fact in result if not any(
        key(fact) != key(other) and (" " + key(fact) + " ") in (" " + key(other) + " ")
        for other in result)]


def qr(url: str) -> str:
    import qrcode
    import qrcode.image.svg
    code = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_Q, border=4, box_size=10)
    code.add_data(url)
    code.make(fit=True)
    image = code.make_image(image_factory=qrcode.image.svg.SvgPathImage,
                            attrib={"fill": "#0b1020"})
    buffer = io.BytesIO()
    image.save(buffer)
    return data_uri(buffer.getvalue().replace(b"#000000", b"#0b1020"), "image/svg+xml")


def assemble(snapshot: dict, site_root: Path, allowed_origins: list[str]) -> tuple[str, list]:
    from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape
    validate(snapshot)
    data = copy.deepcopy(snapshot)
    assets = Assets(site_root, allowed_origins)
    data["project"]["heroImage"] = assets.image(data["project"]["heroImage"])
    for variant in data["plans"]:
        for floor in variant["floors"]:
            floor["image"] = assets.image(floor["image"], plan=True)
    social_icons = {"max": "max_light.svg", "telegram": "tg_white.svg", "instagram": "instagram_light.svg"}
    data["contacts"]["socials"] = sorted(
        [s for s in data["contacts"]["socials"] if s["label"].lower() in social_icons],
        key=lambda s: list(social_icons).index(s["label"].lower()))
    for social in data["contacts"]["socials"]:
        social["icon"] = assets.logo("social/" + social_icons[social["label"].lower()])
        social["printUrl"] = social["href"].removeprefix("https://").removeprefix("http://").removeprefix("www.").rstrip("/")
    for row in data["comparison"]["rows"]:
        groups = []
        for cell in row.get("cells", []):
            item = copy.deepcopy(cell)
            if item["status"] == "included":
                for fact in row.get("noteFacts", []):
                    if fact not in item["details"]:
                        item["details"].append(fact)
            item["details"] = compact_details(item["details"])
            signature = json.dumps(item, sort_keys=True, ensure_ascii=False)
            if groups and groups[-1]["signature"] == signature:
                groups[-1]["span"] += 1
            else:
                groups.append({**item, "signature": signature, "span": 1})
        row["groups"] = groups
    logo = assets.logo(data["brand"].get("logo", "logo_lg.svg"))
    font_root = site_root / "node_modules/geist/dist/fonts/geist-sans"
    fonts = []
    for weight, name in ((400, "Regular"), (500, "Medium"), (600, "SemiBold"), (700, "Bold")):
        path = font_root / f"Geist-{name}.woff2"
        if not path.is_file():
            raise ValueError(f"Required local Geist font missing: {path}")
        fonts.append({"weight": weight, "uri": data_uri(path.read_bytes(), "font/woff2")})
    env = Environment(loader=FileSystemLoader(Path(__file__).parent / "templates"),
                      autoescape=select_autoescape(["html", "xml"]), undefined=StrictUndefined)
    import re
    from markupsafe import Markup, escape
    def project_heading(value):
        match = re.match(r"^(.*?\s)(\d[\d\s./-]*?)(\s+[^\d].*)?$", value)
        if not match:
            return escape(value)
        return Markup("{}<span>{}</span>{}").format(escape(match[1]), escape(match[2]), escape(match[3] or ""))
    env.filters["project_heading"] = project_heading
    return env.get_template("passport.html").render(d=data, logo=logo, fonts=fonts,
        qr=qr(data["project"]["url"]), page_count=3+len(data["plans"])), assets.audit


DOM_CHECK = r"""() => {
 const errors=[], pages=[...document.querySelectorAll('.page')];
 const rect = e => e.getBoundingClientRect();
 pages.forEach((page,i)=>{
   const box=rect(page), body=page.querySelector('.content'), footer=page.querySelector('footer');
   if(page.scrollWidth>page.clientWidth+1 || page.scrollHeight>page.clientHeight+1)
     errors.push(`Page ${i+1}: page overflow`);
   for(const e of page.querySelectorAll('.content *')) {
     const b=rect(e);
     if(b.width && b.height && (b.left<box.left-1 || b.right>box.right+1 || b.bottom>rect(footer).top-3))
       errors.push(`Page ${i+1}: content outside safe area: ${e.tagName} ${e.textContent.slice(0,70)}`);
     if(!['TR','TBODY','THEAD','TABLE'].includes(e.tagName) && ((e.clientHeight && e.scrollHeight>e.clientHeight+2) || (e.clientWidth && e.scrollWidth>e.clientWidth+2)))
       errors.push(`Page ${i+1}: clipped element ${e.tagName}`);
     if(e.childNodes.length && [...e.childNodes].some(n=>n.nodeType===3 && n.textContent.trim())) {
       if(parseFloat(getComputedStyle(e).fontSize)<10.66) errors.push(`Page ${i+1}: text below 8pt`);
       const range=document.createRange(); range.selectNodeContents(e);
       for(const r of range.getClientRects()) if(r.bottom>rect(footer).top-2 || r.right>box.right-20)
         errors.push(`Page ${i+1}: text overflow`);
     }
   }
 });
 for(const image of document.images) if(!image.complete || !image.naturalWidth) errors.push('Unloaded image');
 for(const plan of document.querySelectorAll('.plan-image')) if(getComputedStyle(plan).objectFit!=='contain')
   errors.push('Plan must use object-fit contain');
 const ready=[400,500,600,700].every(w=>document.fonts.check(`${w} 12px Geist`));
 if(!ready) errors.push('Geist font not loaded');
 return {errors:[...new Set(errors)],pages:pages.length,fontsLoaded:ready};
}"""


def build(snapshot: dict, output: Path, site_root: Path, allowed_origins: list[str], dpi: int = 180) -> dict:
    from playwright.sync_api import sync_playwright
    output.mkdir(parents=True, exist_ok=True)
    final = output / "passport.pdf"
    if final.exists():
        raise ValueError("Output directory already has passport.pdf; use a new version directory")
    pending = output / "passport.pending.pdf"
    html, audit = assemble(snapshot, site_root.resolve(), allowed_origins)
    (output / "passport.html").write_text(html, encoding="utf-8")
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--disable-dev-shm-usage"], executable_path=os.environ.get("PASSPORT_CHROMIUM_EXECUTABLE") or None)
        try:
            page = browser.new_page(viewport={"width": 1123, "height": 794}, device_scale_factor=1,
                                    java_script_enabled=True)
            # All approved assets are embedded; browser network and file access are forbidden.
            page.route("**/*", lambda route: route.abort())
            page.emulate_media(media="print")
            page.set_content(html, wait_until="load", timeout=30000)
            page.evaluate("() => document.fonts.ready")
            page.wait_for_function("() => [...document.images].every(i => i.complete)", timeout=15000)
            comparison_pages = page.evaluate((Path(__file__).parent / "paginate.js").read_text(encoding="utf-8"))
            dom = page.evaluate(DOM_CHECK)
            dom["comparisonPages"] = comparison_pages
            if dom["errors"]:
                return {"status": "failed", "errors": dom["errors"], "dom": dom, "assets": audit}
            page.pdf(path=str(pending), format="A4", landscape=True, print_background=True,
                     prefer_css_page_size=True, margin={"top":"0", "bottom":"0", "left":"0", "right":"0"})
        finally:
            browser.close()
    previews = output / "pages"
    previews.mkdir(exist_ok=True)
    report = inspect_pdf(pending, snapshot, dom, previews, dpi)
    report.update({"templateVersion": TEMPLATE_VERSION, "assets": audit,
                   "snapshotSha256": hashlib.sha256(json.dumps(snapshot, sort_keys=True, ensure_ascii=False).encode()).hexdigest()})
    if report["status"] == "passed":
        pending.replace(final)
        report["pdf"] = str(final.resolve())
    else:
        pending.unlink(missing_ok=True)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("snapshot", type=Path)
    parser.add_argument("outputdir", type=Path)
    parser.add_argument("--site-root", type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument("--asset-origin", action="append", default=[])
    parser.add_argument("--dpi", type=int, default=180, choices=range(150,301))
    args = parser.parse_args()
    args.outputdir.mkdir(parents=True, exist_ok=True)
    try:
        if args.snapshot.stat().st_size > 4 * 1024 * 1024:
            raise ValueError("Snapshot too large")
        snapshot = json.loads(args.snapshot.read_text(encoding="utf-8-sig"))
        report = build(snapshot, args.outputdir, args.site_root, args.asset_origin, args.dpi)
    except Exception as exc:
        (args.outputdir / "passport.pending.pdf").unlink(missing_ok=True)
        report = {"status":"failed", "errors":[f"{type(exc).__name__}: {exc}"]}
    (args.outputdir / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=True))
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
