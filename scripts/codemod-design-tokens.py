#!/usr/bin/env python3
"""
One-off codemod: replace hard-coded hex colours in Tailwind classes with the
semantic design tokens defined in src/index.css, flatten decorative gradients,
and calm down the type weights.

Usage:  python3 scripts/codemod-design-tokens.py src
Idempotent: running it twice is a no-op.
"""
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Colour groups -> token name per utility family.
# Families: "text", "bg", "border" (also ring/divide/outline), "grad" (from/via/to), "fill"
# ---------------------------------------------------------------------------
GROUPS = [
    # dark ink (old forest green)
    (["1E3227", "0F382E", "14231A", "16261E"],
     {"text": "ink", "bg": "inverse", "border": "ink", "grad": "inverse", "fill": "ink"}),
    (["2B4637"],
     {"text": "ink-muted", "bg": "inverse-hover", "border": "ink", "grad": "inverse", "fill": "ink"}),
    # jade
    (["0F5243", "12604F"],
     {"text": "primary", "bg": "primary", "border": "primary", "grad": "primary", "fill": "primary"}),
    (["166E5B", "1B7D68"],
     {"text": "primary", "bg": "primary-hover", "border": "primary", "grad": "primary-hover", "fill": "primary"}),
    # muted ink
    (["3F5447", "3A544B", "5F7266", "7B8B7F", "6B7280"],
     {"text": "ink-muted", "bg": "ink-muted", "border": "border-strong", "grad": "ink-muted", "fill": "ink-muted"}),
    # antique gold (dark) -> readable amber
    (["9B8A3E", "8A7630", "7D6B24", "6E5B1B"],
     {"text": "gold", "bg": "gold", "border": "border-strong", "grad": "gold", "fill": "gold"}),
    # bright gold -> highlight amber
    (["C5B358", "DFC470", "D4AF37", "ECC869", "D5C368", "E8CF7F", "EAB308", "FDEAA8"],
     {"text": "highlight", "bg": "highlight", "border": "highlight", "grad": "highlight", "fill": "highlight"}),
    # rice-paper creams
    (["FAF7F0", "FFFDF7", "FDFBF7", "FFFDF5", "F4EFE6", "EAE3D5", "F4EFE0", "FFFDF0"],
     {"text": "white", "bg": "surface-2", "border": "border", "grad": "surface-2", "fill": "surface-2"}),
    (["FAFBF7", "F3F5EC", "E8EFEA"],
     {"text": "white", "bg": "surface", "border": "border", "grad": "surface", "fill": "surface"}),
    (["F4F6EE", "EEF1E6", "E1E7D4", "DCE3CA", "DCE3C8", "EAE1C8"],
     {"text": "ink-muted", "bg": "surface-2", "border": "border", "grad": "surface-2", "fill": "surface-2"}),
    (["E7ECD9", "E6EFEA"],
     {"text": "white", "bg": "primary-soft", "border": "border", "grad": "primary-soft", "fill": "primary-soft"}),
    # sage borders
    (["D5DEC7", "C5CFB4", "E5E9DC", "DCE2CE", "BFC8B0", "AEB79D"],
     {"text": "ink-subtle", "bg": "surface-2", "border": "border", "grad": "surface-2", "fill": "border"}),
    # cinnabar
    (["B8292F", "C84B31", "C93238", "C83238", "DC2626", "C94A38", "E05A47", "B03E26", "961C21", "A82026"],
     {"text": "accent", "bg": "accent", "border": "accent", "grad": "accent", "fill": "accent"}),
    (["FEF2F2", "FDF2F2", "FCE8E8", "FDF6F6"],
     {"text": "accent", "bg": "accent-soft", "border": "accent", "grad": "accent-soft", "fill": "accent-soft"}),
    # success
    (["065F46", "059669"],
     {"text": "success", "bg": "success", "border": "success", "grad": "success", "fill": "success"}),
    (["ECFDF5"],
     {"text": "success", "bg": "success-soft", "border": "success", "grad": "success-soft", "fill": "success-soft"}),
]

HEX_MAP = {}
for hexes, roles in GROUPS:
    for h in hexes:
        HEX_MAP[h.upper()] = roles

FAMILY = {
    "text": "text", "bg": "bg", "border": "border", "ring": "border", "divide": "border",
    "outline": "border", "from": "grad", "via": "grad", "to": "grad", "fill": "fill", "stroke": "fill",
}

CLASS_RE = re.compile(
    r"(?P<pre>(?:[a-z0-9-]+:)*)(?P<util>bg|text|border|ring|divide|outline|from|via|to|fill|stroke)"
    r"(?P<side>-[trblxy])?-\[#(?P<hex>[0-9A-Fa-f]{6})\](?P<alpha>/\d+)?"
)

RGBA_BORDER_RE = re.compile(r"border-\[rgba\(30,\s*50,\s*39,\s*0?\.\d+\)\]")
RGBA_WHITE_BG_RE = re.compile(r"bg-\[rgba\(255,\s*255,\s*255,\s*0?\.(\d+)\)\]")


def map_hex(m: re.Match) -> str:
    roles = HEX_MAP.get(m.group("hex").upper())
    if not roles:
        return m.group(0)
    util = m.group("util")
    token = roles[FAMILY[util]]
    side = m.group("side") or ""
    alpha = m.group("alpha") or ""
    if util == "text" and token == "white":
        return f"{m.group('pre')}text-white{alpha}"
    return f"{m.group('pre')}{util}{side}-{token}{alpha}"


STRING_RE = re.compile(r"'[^'\n]*'|\"[^\"\n]*\"|`[^`]*`")
GRAD_DIR_RE = re.compile(r"(?<![\w-])((?:[a-z0-9-]+:)*)bg-gradient-to-(?:r|l|t|b|tr|tl|br|bl)(?![\w-])")
STOP_RE = re.compile(r"(?<![\w\[-])((?:[a-z0-9-]+:)*)(from|via|to)-([a-z][a-z0-9-]*(?:-\d{2,3})?|white|black)(/\d+)?(?![\w\]-])")

SOLID_PRIMARY = re.compile(r"(?<![\w:-])bg-(primary|accent)(?![\w/-])")
SOLID_INVERSE = re.compile(r"(?<![\w:-])bg-inverse(?![\w/-])")
SOLID_HIGHLIGHT = re.compile(r"(?<![\w:-])bg-highlight(?![\w/-])")


def flatten_gradients(s: str) -> str:
    if "transparent" in s or ("from-" not in s and "to-" not in s):
        return s
    if not GRAD_DIR_RE.search(s) and not re.search(r"(?<![\w-])(?:[a-z0-9-]+:)+from-", s):
        return s

    def stop(m):
        pre, kind, color, alpha = m.group(1), m.group(2), m.group(3), m.group(4) or ""
        if kind == "from":
            return f"{pre}bg-{color}{alpha}"
        return ""

    s = GRAD_DIR_RE.sub("", s)
    s = STOP_RE.sub(stop, s)
    return s


def contextual_text(s: str) -> str:
    """Fix text colour when the surface underneath changed meaning."""
    if SOLID_PRIMARY.search(s):
        s = re.sub(r"(?<![\w:-])text-white(?![\w/-])", "text-on-primary", s)
    if re.search(r"(?<![\w-])hover:bg-(primary|accent)(?![\w/-])", s):
        s = re.sub(r"(?<![\w-])hover:text-white(?![\w/-])", "hover:text-on-primary", s)
    if SOLID_HIGHLIGHT.search(s):
        s = re.sub(r"(?<![\w:-])text-ink(?![\w/-])", "text-on-highlight", s)
    return s


def calm_type(s: str) -> str:
    s = re.sub(r"(?<![\w-])font-black(?![\w-])", "font-bold", s)
    s = re.sub(r"(?<![\w-])font-extrabold(?![\w-])", "font-semibold", s)
    # Labels: drop ALL-CAPS + tracking combos, keep sentence case
    if re.search(r"(?<![\w-])uppercase(?![\w-])", s) and re.search(r"tracking-(wide|wider|widest)", s):
        s = re.sub(r"\s*(?<![\w-])uppercase(?![\w-])", "", s)
        s = re.sub(r"\s*(?<![\w-])tracking-(?:wide|wider|widest)(?![\w-])", "", s)
    return s


def process_string(lit: str) -> str:
    q, body = lit[0], lit[1:-1]
    if not re.search(r"(bg|text|border|from|to|font|uppercase)-?", body):
        return lit
    new = CLASS_RE.sub(map_hex, body)
    new = RGBA_BORDER_RE.sub("border-border", new)
    new = RGBA_WHITE_BG_RE.sub(lambda m: f"bg-surface/{int(float('0.' + m.group(1)) * 100)}", new)
    def white_bg(m):
        alpha = m.group(2) or ""
        if alpha and int(alpha[1:]) < 50:  # translucent overlay on a dark panel: keep
            return m.group(0)
        return f"{m.group(1)}bg-surface{alpha}"
    new = re.sub(r"(?<![\w:\[-])((?:[a-z0-9-]+:)*)bg-white(/\d+)?(?![\w-])", white_bg, new)
    new = flatten_gradients(new)
    new = contextual_text(new)
    new = calm_type(new)
    if new != body:
        # collapse gaps left by removed classes, but keep line indentation
        new = re.sub(r"(?<=\S)[ ]{2,}(?=\S)", " ", new)
        new = re.sub(r"[ ]+(?=\n)", "", new)
        # tidy quoted class lists nested inside template literals: ? ' a b ' : -> ? 'a b' :
        new = re.sub(r"([?:(,]\s*)'[ ]+", r"\1'", new)
        new = re.sub(r"[ ]+'(?=\s*(?:[:),}]|\n))", "'", new)
        if q != "`":
            new = new.strip()
    return q + new + q


def process_file(path: Path) -> bool:
    src = path.read_text(encoding="utf-8")
    out = STRING_RE.sub(lambda m: process_string(m.group(0)), src)
    if out != src:
        path.write_text(out, encoding="utf-8")
        return True
    return False


if __name__ == "__main__":
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "src")
    changed = 0
    for p in sorted(root.rglob("*.tsx")):
        if process_file(p):
            changed += 1
            print("updated", p)
    print(f"{changed} files updated")
