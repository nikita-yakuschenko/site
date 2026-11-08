import copy
import io
from pathlib import Path
import sys
from unittest.mock import MagicMock

import pytest
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from passports.assets import Assets, MAX_BYTES, origin
from passports.preflight import geometry_errors, inspect_pdf, validate, text_expectations
from passports.render import assemble


@pytest.fixture
def snapshot():
    return {"schemaVersion":1,"project":{"slug":"test","name":"Тест","url":"https://avgst.ru/catalog/test",
        "technology":"Модульный дом","areaLabel":"100 м²","floorsLabel":"2","bedroomsLabel":"3","bathroomsLabel":"2","heroImage":"hero.png"},
        "region":{"code":"nn","name":"Нижний Новгород"},
        "pricing":{"mortgagePaymentLabel":"40 000 ₽/мес.","mortgageNote":"Готовый расчёт TS",
        "tiers":[{"key":str(i),"name":n,"priceLabel":"5 000 000 ₽","special":i==0} for i,n in enumerate(["Стандартная","Проектная","Под ключ"])]},
        "plans":[{"id":"a","name":"Вариант 1","floors":[{"id":"1","name":"1 этаж","image":"plan.png",
        "rooms":[{"number":"1","name":"Кухня","areaLabel":"20 м²"}]}]}],
        "comparison":{"rows":[{"id":"roof","section":"Конструкции","label":"Кровельное покрытие","values":["Включено","Включено","По проекту"]}]},
        "contacts":{"company":"Авангард Строй","phone":"+7 000 000-00-00","phoneHref":"tel:+70000000000","email":"test@avgst.ru",
        "address":"Тестовый адрес","website":"https://avgst.ru","about":"О компании","legal":"Цены актуальны на дату документа",
        "updatedAt":"08.11.2026","socials":[{"label":"VK","href":"https://vk.com/test"}]},"brand":{"logo":"logo_lg.svg"}}


@pytest.mark.parametrize("width,height,ok", [(841.8898,595.2756,True),(595.2756,841.8898,False),(840,595,False),(0,0,False)])
def test_geometry(width,height,ok):
    assert (not geometry_errors(width,height)) is ok


@pytest.mark.parametrize("source", ["../secret.png","%2e%2e/secret.png","file:///etc/passwd","//evil.test/img","http://169.254.169.254/latest","https://cms.example.evil/img"])
def test_asset_restrictions(tmp_path,source):
    (tmp_path/"public").mkdir()
    (tmp_path/"secret.png").write_bytes(b"secret")
    with pytest.raises(ValueError):
        Assets(tmp_path,["https://cms.example"]).fetch(source)


def test_private_dns_rejected_even_for_allowlisted_host(tmp_path,monkeypatch):
    monkeypatch.setattr("socket.getaddrinfo",lambda *a,**k:[(2,1,6,"",("10.0.0.1",443))])
    with pytest.raises(ValueError,match="forbidden address"):
        Assets(tmp_path,["https://cms.example"]).fetch("https://cms.example/a.png")


def test_redirect_rejected(tmp_path,monkeypatch):
    monkeypatch.setattr("socket.getaddrinfo",lambda *a,**k:[(2,1,6,"",("127.0.0.1",3001))])
    conn=MagicMock(); conn.getresponse.return_value.status=302
    monkeypatch.setattr("http.client.HTTPConnection",lambda *a,**k:conn)
    with pytest.raises(ValueError,match="redirects forbidden"):
        Assets(tmp_path,["http://localhost:3001"]).fetch("http://localhost:3001/img")
    conn.close.assert_called_once()


def test_remote_size_limit(tmp_path,monkeypatch):
    monkeypatch.setattr("socket.getaddrinfo",lambda *a,**k:[(2,1,6,"",("127.0.0.1",3001))])
    conn=MagicMock(); response=conn.getresponse.return_value; response.status=200
    response.getheader.side_effect=lambda key,default: str(MAX_BYTES+1) if key=="Content-Length" else default
    monkeypatch.setattr("http.client.HTTPConnection",lambda *a,**k:conn)
    with pytest.raises(ValueError,match="byte limit"):
        Assets(tmp_path,["http://localhost:3001"]).fetch("http://localhost:3001/img")


@pytest.mark.parametrize("url",["https://user:pass@cms.example/a","ftp://cms.example/a","https://cms.example/a#x"])
def test_invalid_origin(url):
    with pytest.raises(ValueError): origin(url)


def test_plan_lossless_geometry_and_photo_resize(tmp_path):
    import base64
    (tmp_path/"public").mkdir()
    Image.new("RGB",(3200,1600),"white").save(tmp_path/"public/a.png")
    assets=Assets(tmp_path)
    for plan,expected in [(True,(3200,1600)),(False,(3000,1500))]:
        uri=assets.image("a.png",plan=plan)
        with Image.open(io.BytesIO(base64.b64decode(uri.split(",",1)[1]))) as image:
            assert image.size==expected
            assert image.format==("PNG" if plan else "JPEG")
    assert assets.audit[0]["sha256"]==assets.audit[1]["sha256"]


def test_active_svg_rejected(tmp_path):
    (tmp_path/"public").mkdir()
    (tmp_path/"public/a.svg").write_text('<svg><image href="https://evil.test/a"/></svg>')
    with pytest.raises(ValueError): Assets(tmp_path).logo("a.svg")


def test_all_variants_floors_and_rows_retained(snapshot):
    snapshot["plans"].append(copy.deepcopy(snapshot["plans"][0]))
    snapshot["plans"][0]["floors"].append(copy.deepcopy(snapshot["plans"][0]["floors"][0]))
    validate(snapshot)
    expected=text_expectations(snapshot)
    assert len(expected)==5
    assert expected[1].count("Кухня")==2
    assert "Кровельное покрытие" in expected[-2]
    assert "Специальная цена" in expected[-2]


@pytest.mark.parametrize("mutation",[
    lambda d:d["region"].update(code="unknown"),
    lambda d:d["project"].update(url="https://evil.test"),
    lambda d:d["plans"][0]["floors"][0]["rooms"][0].update(areaLabel=""),
    lambda d:d["comparison"]["rows"][0].update(values=["Включено"]),
    lambda d:d["contacts"]["socials"][0].update(href="javascript:alert(1)"),
])
def test_snapshot_failure(snapshot,mutation):
    mutation(snapshot)
    with pytest.raises(ValueError): validate(snapshot)


def test_pdf_preflight_fails_closed(snapshot,tmp_path,monkeypatch):
    # Deliberately corrupt fake document; never author a real PDF in unit tests.
    import fitz
    import zxingcpp
    page=MagicMock(); page.rect.width=595; page.rect.height=842
    page.get_text.return_value="wrong text"; page.get_fonts.return_value=[]; page.get_links.return_value=[]
    pix=MagicMock(width=4,height=4,samples=bytes(48)); page.get_pixmap.return_value=pix
    doc=MagicMock(); doc.__iter__.return_value=iter([page]); doc.__len__.return_value=1
    doc.__enter__.return_value=doc
    monkeypatch.setattr(fitz,"open",lambda path:doc)
    monkeypatch.setattr(zxingcpp,"read_barcodes",lambda image:[])
    report=inspect_pdf("fake.pdf",snapshot,{"errors":["DOM overflow"]},tmp_path)
    assert report["status"]=="failed"
    assert any("Expected 4 pages" in x for x in report["errors"])
    assert any("QR" in x for x in report["errors"])
    assert any("clickable" in x for x in report["errors"])
    assert "DOM overflow" in report["errors"]


def test_template_escapes_and_contains_full_snapshot(snapshot,tmp_path,monkeypatch):
    from passports import render
    monkeypatch.setattr(Assets,"image",lambda self,*a,**k:"data:image/png;base64,AA==")
    monkeypatch.setattr(Assets,"logo",lambda self,*a:"data:image/svg+xml;base64,AA==")
    font_root=tmp_path/"node_modules/geist/dist/fonts/geist-sans"; font_root.mkdir(parents=True)
    for name in ["Regular","Medium","SemiBold","Bold"]: (font_root/f"Geist-{name}.woff2").write_bytes(b"test")
    snapshot["project"]["name"]="<script>alert(1)</script>"
    html,_=assemble(snapshot,tmp_path,[])
    assert "&lt;script&gt;" in html and "<script>alert" not in html
    assert html.count('<section class="page ')==4
    assert "Кухня" in html and "20 м²" in html and "Кровельное покрытие" in html
    assert "Специальная цена" in html and "tel:+70000000000" in html


def test_print_brand_tokens_match_site():
    import re
    root = Path(__file__).resolve().parents[2]
    site = (root / "src/app/styles.css").read_text(encoding="utf-8")
    print_css = (root / "passports/templates/passport.css").read_text(encoding="utf-8")
    for token in ("avgst-ink", "brand-yellow", "avgst-green", "page", "surface"):
        def value(css):
            raw = re.search(r"--" + token + r"\s*:\s*(#[0-9a-fA-F]+)", css).group(1).lower()
            return "#" + "".join(c * 2 for c in raw[1:]) if len(raw) == 4 else raw
        assert value(site) == value(print_css)
