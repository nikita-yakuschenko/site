"""Offline HTML assets with pinned-origin, pinned-address HTTP fetching."""
from __future__ import annotations

import base64
import http.client
import io
import ipaddress
import socket
import ssl
import time
from pathlib import Path
from urllib.parse import urlsplit, unquote

from PIL import Image, ImageOps

MAX_BYTES = 24 * 1024 * 1024
MAX_PIXELS = 40_000_000
Image.MAX_IMAGE_PIXELS = MAX_PIXELS


def data_uri(data: bytes, mime: str) -> str:
    return f"data:{mime};base64," + base64.b64encode(data).decode("ascii")


def origin(url: str) -> tuple[str, str, int]:
    p = urlsplit(url)
    if p.scheme not in {"http", "https"} or not p.hostname or p.username or p.password:
        raise ValueError("Asset must have a plain HTTP(S) origin without credentials")
    if p.fragment or any(ord(c) < 32 for c in url) or "\\" in url:
        raise ValueError("Invalid asset URL")
    return p.scheme, p.hostname.lower(), p.port or (443 if p.scheme == "https" else 80)


class Assets:
    def __init__(self, site_root: Path, allowed_origins: list[str] = (), timeout: float = 15):
        self.public = (site_root / "public").resolve()
        self.allowed = {origin(x) for x in allowed_origins}
        self.timeout = timeout
        self.audit: list[dict] = []
        self.total_bytes = 0

    def local(self, source: str) -> bytes:
        if source.startswith("public/"):
            source = source[7:]
        source = unquote(source).lstrip("/")
        path = (self.public / source).resolve()
        if not path.is_relative_to(self.public) or not path.is_file():
            raise ValueError("Local asset must be an existing file inside public")
        if path.stat().st_size > MAX_BYTES:
            raise ValueError("Asset byte limit exceeded")
        return path.read_bytes()

    def fetch(self, source: str) -> bytes:
        if len(self.audit) >= 100:
            raise ValueError("Asset count limit exceeded")
        if urlsplit(source).scheme:
            data = self.remote(source)
        else:
            if source.startswith("//"):
                raise ValueError("Protocol-relative assets forbidden")
            data = self.local(source)
        self.total_bytes += len(data)
        if self.total_bytes > 160 * 1024 * 1024:
            raise ValueError("Total asset budget exceeded")
        import hashlib
        self.audit.append({"source": source, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)})
        return data

    def remote(self, source: str) -> bytes:
        scheme, host, port = origin(source)
        if (scheme, host, port) not in self.allowed:
            raise ValueError("Asset origin not explicitly allowlisted")
        addresses = {a[4][0] for a in socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)}
        # Loopback is permitted only for explicitly configured local CMS origins.
        local_cms = host in {"localhost", "127.0.0.1", "::1"}
        if not addresses or any(not ipaddress.ip_address(a).is_global and not
                                (local_cms and ipaddress.ip_address(a).is_loopback) for a in addresses):
            raise ValueError("Asset DNS resolves to a forbidden address")
        ip = sorted(addresses)[0]
        # Resolve once, connect directly to validated IP, retain TLS hostname verification.
        conn = http.client.HTTPConnection(ip, port, timeout=self.timeout)
        conn.connect()
        if scheme == "https":
            conn.sock = ssl.create_default_context().wrap_socket(conn.sock, server_hostname=host)
        p = urlsplit(source)
        started = time.monotonic()
        try:
            conn.request("GET", p.path + ("?" + p.query if p.query else ""),
                         headers={"Host": p.netloc, "Accept": "image/*", "Accept-Encoding": "identity"})
            response = conn.getresponse()
            if response.status != 200:
                raise ValueError(f"Asset HTTP status {response.status}; redirects forbidden")
            if response.getheader("Content-Encoding", "identity") != "identity":
                raise ValueError("Encoded HTTP bodies forbidden")
            if int(response.getheader("Content-Length", "0")) > MAX_BYTES:
                raise ValueError("Asset byte limit exceeded")
            data = bytearray()
            while True:
                if time.monotonic() - started > self.timeout:
                    raise TimeoutError("Asset total timeout exceeded")
                conn.sock and conn.sock.settimeout(max(0.1, self.timeout - (time.monotonic() - started)))
                chunk = response.read(65536)
                if not chunk:
                    break
                data.extend(chunk)
                if len(data) > MAX_BYTES:
                    raise ValueError("Asset byte limit exceeded")
            return bytes(data)
        finally:
            conn.close()

    def image(self, source: str, *, plan: bool = False) -> str:
        raw = self.fetch(source)
        with Image.open(io.BytesIO(raw)) as original:
            if original.width * original.height > MAX_PIXELS or original.n_frames != 1:
                raise ValueError("Image geometry/frame limit exceeded")
            original.load()
            image = ImageOps.exif_transpose(original)
            output = io.BytesIO()
            if plan:
                # Lossless plans, no resizing and no independent-axis transformations.
                image.save(output, format="PNG", optimize=True)
                mime = "image/png"
            else:
                image.thumbnail((3000, 2200), Image.Resampling.LANCZOS)
                if image.mode in {"RGBA", "LA", "P"}:
                    rgba = image.convert("RGBA")
                    image = Image.new("RGB", rgba.size, "white")
                    image.paste(rgba, mask=rgba.getchannel("A"))
                image.convert("RGB").save(output, format="JPEG", quality=90, subsampling=0, optimize=True)
                mime = "image/jpeg"
        return data_uri(output.getvalue(), mime)

    def logo(self, source: str) -> str:
        # Only trusted repository SVGs; no CMS/user SVG execution or external references.
        import re
        raw = self.local(source)
        text = raw.decode("utf-8")
        if re.search(r"<\s*(script|foreignObject)|(?:href\s*=)|<!ENTITY|<!DOCTYPE|url\(", text, re.I):
            raise ValueError("Logo SVG contains active/external content")
        return data_uri(raw, "image/svg+xml")
