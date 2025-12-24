#!/usr/bin/env python3
from __future__ import annotations

import csv
import html
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path

import requests

URL = "https://designsystem.digital.gov/design-tokens/color/system-tokens/"

@dataclass(frozen=True)
class SystemToken:
    token: str
    family: str
    grade: int
    variant: str | None
    hex: str

TR_RE = re.compile(r"<tr\b[^>]*>.*?</tr>", re.IGNORECASE | re.DOTALL)
CELL_RE = re.compile(
    r'<t[dh]\b[^>]*\bdata-title="(?P<title>[^"]+)"[^>]*>(?P<body>.*?)</t[dh]>',
    re.IGNORECASE | re.DOTALL,
)
TAG_RE = re.compile(r"<[^>]+>")
HEX_RE = re.compile(r"#[0-9a-fA-F]{6}")

def fetch(url: str) -> str:
    r = requests.get(
        url,
        timeout=30,
        headers={"User-Agent": "uswds-token-export/4.0 (+https://github.com/mgifford)"},
    )
    r.raise_for_status()
    return r.text

def textify(fragment: str) -> str:
    # Convert a cell’s HTML to plain text
    s = html.unescape(fragment)
    s = TAG_RE.sub(" ", s)
    s = s.replace("\xa0", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s

def clean_quoted(s: str) -> str:
    s = s.strip()
    # USWDS page wraps many values in single quotes in the table.
    if len(s) >= 2 and s[0] == "'" and s[-1] == "'":
        return s[1:-1]
    return s

def parse_tokens(page_html: str) -> tuple[list[SystemToken], dict[str, int]]:
    page_html = html.unescape(page_html)

    trs = TR_RE.findall(page_html)
    debug = {
        "tr_total": len(trs),
        "tr_with_hex": 0,
        "tr_with_token_cell": 0,
        "rows_parsed": 0,
        "rows_skipped_missing_fields": 0,
    }

    tokens_by_name: dict[str, SystemToken] = {}

    for tr in trs:
        # Build a dict of data-title -> plain text
        cells = {}
        for m in CELL_RE.finditer(tr):
            title = m.group("title").strip()
            body = textify(m.group("body"))
            cells[title] = body

        # The token rows you care about use these titles.
        # (You pasted examples with: Token, Family, Grade, Variant, Hex equivalent)
        if "Hex equivalent" not in cells:
            continue

        if not HEX_RE.search(cells.get("Hex equivalent", "")):
            continue

        debug["tr_with_hex"] += 1

        token_raw = cells.get("Token")
        if token_raw is None:
            # Sometimes Token is in a <span class="utility-class">'foo'</span>
            # but our CELL_RE already captures the td and textify() pulls it out.
            debug["rows_skipped_missing_fields"] += 1
            continue

        debug["tr_with_token_cell"] += 1

        token = clean_quoted(token_raw)
        family = clean_quoted(cells.get("Family", ""))
        grade_txt = cells.get("Grade", "").strip()
        variant_txt = cells.get("Variant", "").strip()
        hex_txt = cells.get("Hex equivalent", "").strip().lower()

        # Variant is either "—" or "'vivid'"
        variant = None
        if variant_txt and variant_txt != "—":
            variant = clean_quoted(variant_txt)

        # Extract hex strictly
        hx = HEX_RE.search(hex_txt)
        if not hx:
            debug["rows_skipped_missing_fields"] += 1
            continue
        hex_value = hx.group(0).lower()

        if not token or not family or not grade_txt.isdigit():
            debug["rows_skipped_missing_fields"] += 1
            continue

        tok = SystemToken(
            token=token,
            family=family,
            grade=int(grade_txt),
            variant=variant,
            hex=hex_value,
        )
        tokens_by_name[tok.token] = tok
        debug["rows_parsed"] += 1

    return list(tokens_by_name.values()), debug

def write_csv(tokens: list[SystemToken], path: Path) -> None:
    tokens = sorted(tokens, key=lambda t: (t.family, t.grade, t.variant or "", t.token))
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["token", "family", "grade", "variant", "hex"])
        w.writeheader()
        for t in tokens:
            w.writerow(asdict(t))

def write_json(tokens: list[SystemToken], path: Path) -> None:
    tokens = sorted(tokens, key=lambda t: (t.family, t.grade, t.variant or "", t.token))
    payload = {"source": URL, "count": len(tokens), "tokens": [asdict(t) for t in tokens]}
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

def main() -> int:
    page_html = fetch(URL)

    # Always dump HTML on failure so you can diff what changed.
    Path("debug_uswds_system_tokens.html").write_text(html.unescape(page_html), encoding="utf-8")

    tokens, debug = parse_tokens(page_html)

    if not tokens:
        print("ERROR: Parsed 0 tokens.", file=sys.stderr)
        print("DEBUG:", file=sys.stderr)
        for k, v in debug.items():
            print(f"  {k}: {v}", file=sys.stderr)
        print("DEBUG: wrote debug_uswds_system_tokens.html", file=sys.stderr)
        return 2

    write_csv(tokens, Path("uswds-system-color-tokens.csv"))
    write_json(tokens, Path("uswds-system-color-tokens.json"))

    print(f"OK: wrote {len(tokens)} tokens")
    print("- uswds-system-color-tokens.csv")
    print("- uswds-system-color-tokens.json")
    print("DEBUG:")
    for k, v in debug.items():
        print(f"  {k}: {v}")
    print("Sample:")
    for t in sorted(tokens, key=lambda x: x.token)[:10]:
        print(f"  {t.token},{t.family},{t.grade},{t.variant or ''},{t.hex}")

    return 0

if __name__ == "__main__":
    raise SystemExit(main())
