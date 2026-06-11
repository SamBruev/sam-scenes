#!/usr/bin/env python3
"""Local links for Cursor chat → Finder reveal (open -R). Run once per session."""

from __future__ import annotations

import html
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, quote, unquote, urlparse

HOST = "127.0.0.1"
PORT = 19847

MD_FILES = [
    ("/Users/apple/Documents/CURSOR/SamScenes/PROJECT.md", "PROJECT.md"),
    ("/Users/apple/Documents/CURSOR/SamScenes/README.md", "README.md"),
    ("/Users/apple/Documents/CURSOR/SamScenes/SAMSCENES-FIXES-TODO.md", "SAMSCENES-FIXES-TODO.md"),
    ("/Users/apple/Documents/CURSOR/SamScenes/SAM_SCENES_HANDOFF.md", "SAM_SCENES_HANDOFF.md"),
    ("/Users/apple/Documents/CURSOR/SamScenes/AUDIT-PROMPT-OPUS.md", "AUDIT-PROMPT-OPUS.md"),
    ("/Users/apple/Documents/CURSOR/SamScenes/AUDIT-SamScenes-v400.md", "AUDIT-SamScenes-v400.md"),
]


def reveal_in_finder(path: str) -> bool:
    path = path.strip()
    if not path.startswith("/"):
        return False
    try:
        subprocess.run(["open", "-R", path], check=True)
        return True
    except (OSError, subprocess.CalledProcessError):
        return False


def index_html() -> str:
    rows = []
    for abspath, label in MD_FILES:
        href = f"/reveal?p={quote(abspath, safe='')}"
        rows.append(f'<li><a href="{html.escape(href, quote=True)}">{html.escape(label)}</a></li>')
    chat_links = []
    for abspath, label in MD_FILES:
        if not label.endswith(".md"):
            continue
        url = f"http://{HOST}:{PORT}/reveal?p={quote(abspath, safe='')}"
        chat_links.append(f"<li><code>{html.escape(url)}</code></li>")
    return f"""<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>MD → Finder</title>
<style>
body{{font-family:-apple-system,sans-serif;background:#111;color:#f5f0e8;margin:2rem;line-height:1.5}}
a{{color:#e8c968;font-weight:600}} code{{font-size:12px;color:#ccc;word-break:break-all}}
</style></head><body>
<h1>Sam Scenes — MD в Finder</h1>
<p>Клик по ссылке ниже → Finder с подсветкой файла.</p>
<ul>{''.join(rows)}</ul>
<p>Ссылки для чата Cursor (http, не file://):</p>
<ul>{''.join(chat_links)}</ul>
</body></html>"""


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/reveal":
            qs = parse_qs(parsed.query)
            raw = qs.get("p", [""])[0]
            path = unquote(raw)
            if reveal_in_finder(path):
                self.send_response(302)
                self.send_header("Location", "/")
                self.end_headers()
            else:
                self.send_error(400, "Bad path")
            return
        if parsed.path in ("/", "/index.html"):
            body = index_html().encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_error(404)


def main() -> None:
    httpd = HTTPServer((HOST, PORT), Handler)
    print("MD Finder links: http://%s:%s/" % (HOST, PORT), flush=True)
    print("Stop: Ctrl+C", flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
