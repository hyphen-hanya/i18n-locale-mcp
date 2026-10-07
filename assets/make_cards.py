#!/usr/bin/env python3
"""Generate the 3 listing cards for i18n-locale-mcp with Pillow only.

Deterministic, offline, no rasterizer deps. Output: 1200x675 PNGs in this dir.
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 1200, 675

BG = (15, 18, 22)
GRID = (26, 32, 40)
PANEL = (22, 27, 33)
PANEL_HI = (30, 37, 45)
WHITE = (236, 240, 245)
GRAY = (138, 150, 165)
TEAL = (64, 224, 208)
VIOLET = (167, 139, 250)
AMBER = (252, 196, 92)
GREEN = (126, 231, 135)


def font(size, bold=False):
    # Pillow >= 10.1 ships a scalable default. Fall back to bitmap if unavailable.
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def canvas():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    for x in range(0, W, 40):
        d.line([(x, 0), (x, H)], fill=GRID, width=1)
    for y in range(0, H, 40):
        d.line([(0, y), (W, y)], fill=GRID, width=1)
    return img, d


def text(d, xy, s, size, fill=WHITE, anchor="la"):
    d.text(xy, s, font=font(size), fill=fill, anchor=anchor)


def terminal(d, x, y, w, h, lines):
    d.rounded_rectangle([x, y, x + w, y + h], radius=14, fill=PANEL, outline=(45, 54, 66), width=2)
    d.rounded_rectangle([x, y, x + w, y + 34], radius=14, fill=PANEL_HI)
    d.rectangle([x, y + 22, x + w, y + 34], fill=PANEL_HI)
    for i, c in enumerate(((255, 95, 86), (255, 189, 46), (39, 201, 63))):
        d.ellipse([x + 16 + i * 22, y + 11, x + 28 + i * 22, y + 23], fill=c)
    cy = y + 52
    for txt, col in lines:
        text(d, (x + 20, cy), txt, 20, col)
        cy += 30


def globe(d, cx, cy, r):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=TEAL, width=3)
    d.ellipse([cx - r, cy - r * 0.42, cx + r, cy + r * 0.42], outline=TEAL, width=2)
    d.ellipse([cx - r * 0.45, cy - r, cx + r * 0.45, cy + r], outline=TEAL, width=2)
    d.line([(cx - r, cy), (cx + r, cy)], fill=TEAL, width=2)
    for k in (-0.66, 0.66):
        d.ellipse([cx - r * 0.86, cy - r + abs(k) * r * 0.5, cx + r * 0.86, cy + r - abs(k) * r * 0.5],
                  outline=(45, 170, 165), width=2)


# ── card 1: cover ────────────────────────────────────────────────────────
def card_cover():
    img, d = canvas()
    text(d, (70, 108), "i18n Locale MCP", 62, WHITE)
    text(d, (70, 224), "Localization QA for AI agents", 28, TEAL)
    text(d, (70, 276), "20 locales  ·  zero dependencies  ·  runs offline", 21, GRAY)
    terminal(d, 70, 340, 470, 230, [
        ("$ node index.js --list-tools", GREEN),
        ("list_locales      pseudo_localize", WHITE),
        ("i18n_lint         glossary_apply", WHITE),
        ("localize", WHITE),
        ("", WHITE),
        ("$ node test/smoke.mjs", GREEN),
        ("11 checks passed.", TEAL),
    ])
    globe(d, 900, 300, 150)
    for i, (ch, col, dx, dy, sz) in enumerate([
        ("\u00e4", VIOLET, -215, -80, 34), ("\u00e9", TEAL, 210, -120, 30),
        ("\u00e7", AMBER, -230, 70, 30), ("\u4e2d", VIOLET, 225, 60, 34),
        ("\u0648", TEAL, 20, -185, 30), ("\u00f1", AMBER, -30, 195, 30),
    ]):
        text(d, (900 + dx, 300 + dy), ch, sz, col, anchor="mm")
    d.rounded_rectangle([866, 470, 1064, 522], radius=12, outline=VIOLET, width=2)
    text(d, (965, 496), "MCP server", 22, VIOLET, anchor="mm")
    img.save(os.path.join(HERE, "card-1-cover.png"))


# ── card 2: the 5 tools ──────────────────────────────────────────────────
def card_tools():
    img, d = canvas()
    text(d, (60, 52), "Five tools, one server", 44, WHITE)
    text(d, (60, 112), "Deterministic QA \u2014 no API key, no network calls", 22, GRAY)
    tools = [
        ("list_locales", "Formatting rules for 20 locales", TEAL),
        ("pseudo_localize", "Catch hard-coded strings & truncation", VIOLET),
        ("i18n_lint", "Numbers, dates, quotes, RTL, placeholders", AMBER),
        ("glossary_apply", "Terminology & brand-term enforcement", GREEN),
        ("localize", "Translate + lint, or emit jobs", TEAL),
    ]
    y = 175
    for name, desc, col in tools:
        d.rounded_rectangle([60, y, 1140, y + 78], radius=12, fill=PANEL, outline=(42, 50, 61))
        d.rounded_rectangle([60, y, 66, y + 78], radius=3, fill=col)
        text(d, (92, y + 26), name, 26, WHITE)
        text(d, (1140 - 24, y + 30), desc, 20, GRAY, anchor="ra")
        y += 92
    img.save(os.path.join(HERE, "card-2-tools.png"))


# ── card 3: quick start ──────────────────────────────────────────────────
def card_quickstart():
    img, d = canvas()
    text(d, (60, 52), "Plug it into your agent", 44, WHITE)
    text(d, (60, 116), "Node.js 18+  ·  no dependencies  ·  any MCP client", 21, GRAY)
    terminal(d, 60, 170, 600, 430, [
        ("$ git clone <repo> && cd i18n-mcp", GREEN),
        ("$ node index.js --list-tools", WHITE),
        ("$ node test/smoke.mjs", WHITE),
        ("  11 checks passed.", TEAL),
        ("", WHITE),
        ("# claude_desktop_config.json", GRAY),
        ('{ "mcpServers": {              ', AMBER),
        ('    "i18n": { "command": "node",', AMBER),
        ('      "args": [".../index.js"] } } }', AMBER),
    ])
    x = 700
    d.rounded_rectangle([x, 170, 1140, 600], radius=14, fill=PANEL, outline=(45, 54, 66), width=2)
    text(d, (x + 26, 200), "Catches, deterministically", 24, TEAL)
    rows = [
        ("1,234 in German", "should be 1.234"),
        ("03/25 in French", "should be 25/03"),
        ("missing {name}", "placeholder lost"),
        ("untranslated brand", "glossary drift"),
        ("RTL, no bidi marks", "text reorders"),
    ]
    yy = 258
    for bad, why in rows:
        text(d, (x + 26, yy), "\u2717", 22, (255, 110, 110))
        text(d, (x + 54, yy), bad, 21, WHITE)
        text(d, (x + 54, yy + 26), why, 18, GRAY)
        yy += 66
    img.save(os.path.join(HERE, "card-3-quickstart.png"))


if __name__ == "__main__":
    card_cover(); card_tools(); card_quickstart()
    for n in ("card-1-cover.png", "card-2-tools.png", "card-3-quickstart.png"):
        p = os.path.join(HERE, n)
        print(f"{n}\t{os.path.getsize(p)} bytes")
