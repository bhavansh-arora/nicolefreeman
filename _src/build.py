#!/usr/bin/env python3
"""
Tiny static-site builder for the Nicole Freeman Coaching site.

  _src/pages/*.html     page bodies, starting with  <!--meta {...json...} -->
  _src/partials/*.html  shared pieces, included with {{> name}}

Placeholders:
  {{> partial}}         include _src/partials/partial.html
  {{icon:name}}         inline SVG icon (see ICONS below)
  {{mark}}              the brand mark (ink tile + teal triangle)
  {{page.key}}          a value from the page's meta block
  {{nav:key}}           aria-current="page" when the page's "nav" matches
  {{cur:file.html}}     aria-current="page" when this is that page

Run:  python3 _src/build.py      (writes the finished pages next to _src/)
"""
import hashlib
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "_src"
SITE_URL = "https://nicolefreeman.codebunny.net"

_S = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'
ICONS = {
    "arrow": f'<svg {_S}><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    "arrow-ur": f'<svg class="i-ur" {_S}><path d="M7 17 17 7M8 7h9v9"/></svg>',
    "arrow-left": f'<svg {_S}><path d="M19 12H5M11 18l-6-6 6-6"/></svg>',
    "arrow-down": f'<svg {_S}><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
    "plus": f'<svg {_S}><path d="M12 5v14M5 12h14"/></svg>',
    "phone": f'<svg {_S}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
    "mail": f'<svg {_S}><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>',
    "pin": f'<svg {_S}><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    "linkedin": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.06c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.77 2.65 4.77 6.1V21h-4v-5.1c0-1.22-.02-2.79-1.7-2.79-1.7 0-1.96 1.33-1.96 2.7V21h-4z"/></svg>',
    "instagram": f'<svg {_S}><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/></svg>',
    "facebook": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21z"/></svg>',
    "whatsapp": f'<svg {_S}><path d="M3.5 20.5 5 16.3A8.5 8.5 0 1 1 8 19.2z"/><path d="M9 9.2c.3 2.6 3 5.3 5.6 5.6l1.2-1.2-1.8-1-1 .7c-.9-.4-1.8-1.3-2.2-2.2l.7-1-1-1.8z"/></svg>',
    "check": f'<svg {_S}><circle cx="12" cy="12" r="10" opacity=".35"/><path d="m7.5 12.5 3 3 6-6.5"/></svg>',
    "tick": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    "cross": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    "star": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>',
    "spark": '<svg viewBox="0 0 40 40" fill="currentColor" aria-hidden="true"><path d="M20 2c1.2 11.6 6.4 16.8 18 18-11.6 1.2-16.8 6.4-18 18-1.2-11.6-6.4-16.8-18-18C13.6 18.8 18.8 13.6 20 2z"/></svg>',
    "clock": f'<svg {_S}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    "lock": f'<svg {_S}><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/></svg>',
    "video": f'<svg {_S}><rect x="2.5" y="6" width="13" height="12" rx="3"/><path d="m15.5 10.5 6-3.5v10l-6-3.5"/></svg>',
    "walk": f'<svg {_S}><circle cx="13" cy="4" r="2"/><path d="m9 21 2.5-6.5L14 17v4M8.5 11.5 10 8l3 1 2 3 3 1M10 8l-2.5 1.5-1 3.5"/></svg>',
    "home": f'<svg {_S}><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
    "brain": f'<svg {_S}><path d="M9.5 4A2.5 2.5 0 0 0 7 6.5 3 3 0 0 0 4.5 10a3 3 0 0 0 .7 4.6A3 3 0 0 0 9 19.5a2.5 2.5 0 0 0 3-1V5.5A2 2 0 0 0 9.5 4z"/><path d="M14.5 4A2.5 2.5 0 0 1 17 6.5a3 3 0 0 1 2.5 3.5 3 3 0 0 1-.7 4.6 3 3 0 0 1-3.8 4.9 2.5 2.5 0 0 1-3-1"/></svg>',
    "target": f'<svg {_S}><circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.5"/></svg>',
    "heart": f'<svg {_S}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    "bolt": f'<svg {_S}><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
    "users": f'<svg {_S}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
    "calendar": f'<svg {_S}><rect x="3" y="4.5" width="18" height="17" rx="3"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/></svg>',
    "mic": f'<svg {_S}><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4M8 22h8"/></svg>',
    "chat": f'<svg {_S}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/></svg>',
    "gauge": f'<svg {_S}><path d="M4.5 18a9 9 0 1 1 15 0"/><path d="m12 13 4-4"/><circle cx="12" cy="13" r="1.4"/></svg>',
    "wrench": f'<svg {_S}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-6 6a1.5 1.5 0 0 0 2.1 2.1l6-6a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.1-.6-.6-2.1z"/></svg>',
    "eye": f'<svg {_S}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    "layers": f'<svg {_S}><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/></svg>',
    "moon": f'<svg {_S}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
    "headphones": f'<svg {_S}><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="7" rx="2"/><rect x="17" y="14" width="4" height="7" rx="2"/></svg>',
    "party": f'<svg {_S}><path d="M4 20 8.5 8l7.5 7.5z"/><path d="M14 4v2M19 9h2M17.5 5.5 16 7M12 8.5c1-1.5 1-3 0-4.5M15.5 12c1.5-1 3-1 4.5 0"/></svg>',
    "chart": f'<svg {_S}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    "volume": f'<svg {_S}><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    "mute": f'<svg {_S}><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 5 6M21 9l-5 6"/></svg>',
    "shuffle": f'<svg {_S}><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
    "leaf": f'<svg {_S}><path d="M11 20A7 7 0 0 1 4 13c0-6 6-9 16-10-1 10-4 16-10 16"/><path d="M2 22c3-4 6-7 11-10"/></svg>',
    "book": f'<svg {_S}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>',
    "quote": '<svg viewBox="0 0 48 40" fill="currentColor" aria-hidden="true"><path d="M0 40V24C0 10.7 6.6 2.7 19.8 0l2.4 5.4C15 7.6 11.5 12 11 18.4h9.4V40zm27.6 0V24c0-13.3 6.6-21.3 19.8-24l2.4 5.4c-7.2 2.2-10.7 6.6-11.2 13h9.4V40z"/></svg>',
}

MARK = ('<svg class="mark" viewBox="0 0 40 40" aria-hidden="true">'
        '<rect width="40" height="40" rx="11" fill="currentColor"/>'
        '<path class="mark__tri" d="M10.5 20 27.5 10.2v19.6z"/></svg>')


def render(text, meta, depth=0):
    if depth > 8:
        raise RuntimeError("include depth exceeded")

    def inc(m):
        name = m.group(1).strip()
        return render((SRC / "partials" / f"{name}.html").read_text(), meta, depth + 1)

    text = re.sub(r"\{\{>\s*([\w-]+)\s*\}\}", inc, text)
    text = re.sub(r"\{\{icon:([\w-]+)\}\}", lambda m: ICONS[m.group(1)], text)
    text = text.replace("{{mark}}", MARK)
    text = re.sub(r"\{\{nav:([\w-]+)\}\}",
                  lambda m: 'aria-current="page"' if meta.get("nav") == m.group(1) else "", text)
    text = re.sub(r"\{\{cur:([\w.-]+)\}\}",
                  lambda m: 'aria-current="page"' if meta.get("slug") == m.group(1) else "", text)
    text = re.sub(r"\{\{page\.([\w-]+)\}\}", lambda m: str(meta.get(m.group(1), "")), text)
    return text


def bust_cache(html):
    """Append ?v=<content hash> to local CSS/JS so browsers fetch fresh files after each change."""
    def ver(m):
        path = m.group(2)
        f = ROOT / path
        if not f.is_file():
            return m.group(0)
        h = hashlib.md5(f.read_bytes()).hexdigest()[:8]
        return f'{m.group(1)}{path}?v={h}"'

    return re.sub(r'((?:href|src)=")(assets/(?:css|js|vendor)/[\w.-]+\.(?:css|js))"', ver, html)


def build():
    layout = (SRC / "partials" / "layout.html").read_text()
    for page in sorted((SRC / "pages").glob("*.html")):
        raw = page.read_text()
        m = re.match(r"\s*<!--meta\s*(\{.*?\})\s*-->", raw, re.S)
        meta = json.loads(m.group(1)) if m else {}
        body = raw[m.end():] if m else raw
        meta.setdefault("slug", page.name)
        meta["canonical"] = SITE_URL + "/" + ("" if page.name == "index.html" else page.name)
        meta.setdefault("og_image", "assets/img/og-nicole-freeman.jpg")
        meta.setdefault("htmlclass", "" if page.name == "index.html" else "no-preloader")
        meta.setdefault("theme", "#0a1a1d")
        html = render(layout, meta)
        html = html.replace("{{BODY}}", render(body, meta))
        html = bust_cache(html)
        (ROOT / page.name).write_text(html)
        print("built", page.name)


if __name__ == "__main__":
    build()
