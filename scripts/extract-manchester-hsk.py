#!/usr/bin/env python3
"""
Extracts Chinese vocabulary words from the University of Manchester
Confucius Institute HSK vocabulary list PDFs (levels 1–6).

The PDFs contain only Chinese words (no translations), arranged in columns.
We extract all CJK strings, deduplicate, and save as JSON.

Usage:
    python3 scripts/extract-manchester-hsk.py

Output: data/manchester-hsk-vocab.json
"""

import json
import re
import sys
from pathlib import Path

try:
    from pdfminer.high_level import extract_text
except ImportError:
    print("pdfminer.six not found. Run: pip install pdfminer.six")
    sys.exit(1)

PDFS = [
    (1, "data/manchester-hsk-pdfs/hsk-level-1.pdf"),
    (2, "data/manchester-hsk-pdfs/hsk-level-2.pdf"),
    (3, "data/manchester-hsk-pdfs/hsk-level-3.pdf"),
    (4, "data/manchester-hsk-pdfs/hsk-level-4.pdf"),
    (5, "data/manchester-hsk-pdfs/hsk-level-5.pdf"),
    (6, "data/manchester-hsk-pdfs/hsk-level-6.pdf"),
]

# Match strings that are purely CJK (no latin mixed in)
CJK_RE = re.compile(r'^[\u3400-\u9fff\u20000-\u2a6df·・]+$')

# HSK 6 PDF has numbered entries: "123 汉字 hànzì English definition"
# Match a line starting with a number followed by CJK characters
HSK6_ENTRY_RE = re.compile(r'^\d+\s+([\u3400-\u9fff\u20000-\u2a6df]+)')


def is_cjk_word(s: str) -> bool:
    s = s.strip()
    return bool(s) and bool(CJK_RE.match(s))


def extract_words_simple(pdf_path: str) -> list[str]:
    """For levels 1–5: plain columns of CJK words, no translations."""
    text = extract_text(pdf_path)
    tokens = re.split(r'[\s\n\r]+', text)
    seen = set()
    words = []
    for tok in tokens:
        tok = tok.strip()
        if is_cjk_word(tok) and tok not in seen:
            seen.add(tok)
            words.append(tok)
    return words


def extract_words_hsk6(pdf_path: str) -> list[str]:
    """For level 6: numbered table with Chinese | Pinyin | English columns."""
    text = extract_text(pdf_path)
    seen = set()
    words = []
    for line in text.splitlines():
        line = line.strip()
        m = HSK6_ENTRY_RE.match(line)
        if m:
            word = m.group(1)
            if word not in seen:
                seen.add(word)
                words.append(word)
    return words


all_entries = []

for level, path in PDFS:
    if not Path(path).exists():
        print(f"HSK {level}: file not found — {path}")
        continue
    if level == 6:
        words = extract_words_hsk6(path)
    else:
        words = extract_words_simple(path)
    print(f"HSK {level}: {len(words)} words")
    for w in words:
        all_entries.append({"hskLevel": level, "word": w})

out_path = "data/manchester-hsk-vocab.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(all_entries, f, ensure_ascii=False, indent=2)

print(f"\nTotal: {len(all_entries)} words")
print(f"Saved to: {out_path}")
