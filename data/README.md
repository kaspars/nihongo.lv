# data/

Reference data and external resources used for database population,
cross-validation, and future feature development.

## Directory overview

```
data/
├── texts/                    # Japanese literary texts (see texts/README.md)
├── anki/                     # Anki flashcard decks (.apkg)
├── glossika/                 # Glossika sentence corpus — ja, ko, zh-CN, zh-TW, vi
├── manchester-hsk-pdfs/      # University of Manchester HSK vocabulary PDFs
├── sentence-patterns/        # Akuzawa JLPT grammar patterns N5–N1
├── kanjidic2.xml             # KANJIDIC2 kanji reference database
├── hanzidb-hsk.json          # Scraped from hanzidb.org — character-level HSK 2.0
├── hskacademy-vocab.json     # Scraped from hsk.academy — word-level HSK 1–6
├── anki-hsk-vocab.json       # Extracted from JK Anki decks — vocab + sentences
└── manchester-hsk-vocab.json # Extracted from Manchester PDFs — word lists only
```

---

## kanjidic2.xml

**Source:** EDRDG — https://www.edrdg.org/wiki/index.php/KANJIDIC_Project
**License:** Creative Commons Attribution-ShareAlike 4.0
**Format:** XML
**Size:** ~15 MB, 13,108 kanji entries

Standard reference for Japanese kanji properties: stroke counts, Kangxi radicals,
on'yomi/kun'yomi readings, JLPT level, school grade, and more.

Used by:
- `scripts/backfill-from-kanjidic.ts` — fills missing stroke_count/radical in DB
- `scripts/check-kanjidic.ts` — validates our data against KANJIDIC2
- `scripts/import-missing-kanji.ts` — imports kanji found in texts but missing from DB

---

## HSK Reference Data

The following files all cover **HSK 2.0** (2010 revision, levels 1–6, ~5000 words).
They are used for cross-validation and will feed the `simplified_hanzi` DB table.

### hanzidb-hsk.json

**Source:** hanzidb.org (scraped)
**Script:** `scripts/scrape-hanzidb-hsk.ts`
**Entries:** 2,663 characters
**Unique to this source:** character-level (not word-level) — each entry is a single
hanzi, not a word. Also includes Kangxi radical and stroke count from Unihan/CEDICT.

Fields per entry:
| Field | Description |
|-------|-------------|
| `character` | Simplified Chinese character |
| `pinyin` | Pinyin with tone marks |
| `definition` | English definition |
| `radicalChar` | Kangxi radical character |
| `radicalKangxi` | Kangxi radical number (1–214) |
| `strokeCount` | Stroke count |
| `hskLevel` | HSK 2.0 level (1–6) |
| `generalStandard` | Index in Table of General Standard Chinese Characters |
| `frequencyRank` | Character frequency rank in corpus |

### hskacademy-vocab.json

**Source:** hsk.academy (scraped)
**Script:** `scripts/scrape-hskacademy.ts`
**Entries:** 5,000 words across HSK 1–6
**License:** Not explicitly stated on site

Fields per entry:
| Field | Description |
|-------|-------------|
| `hskLevel` | HSK 2.0 level (1–6) |
| `hanzi` | Simplified Chinese |
| `traditional` | Traditional Chinese |
| `pinyin` | Pinyin with tone marks |
| `definition` | English definition |

### anki-hsk-vocab.json

**Source:** JK HSK Anki decks, shared via journeychinese.com.au and ankiweb.net
**Script:** `scripts/extract-anki-hsk.ts`
**Raw decks:** `data/anki/` (`.apkg` files)
**Entries:** 5,001 words; 3,208 include example sentences
**License:** Not stated — treat as reference-only, do not redistribute

Fields per entry:
| Field | Description |
|-------|-------------|
| `hskLevel` | HSK 2.0 level (1–6) |
| `simplified` | Simplified Chinese |
| `traditional` | Traditional Chinese |
| `pinyin` | Pinyin with tone marks |
| `meaning` | English meaning |
| `pos` | Part of speech |
| `homophone` | Homophone flag (if present) |
| `homograph` | Homograph flag (if present) |
| `sentence.simplified` | Example sentence (simplified) |
| `sentence.traditional` | Example sentence (traditional) |
| `sentence.pinyin` | Example sentence pinyin |
| `sentence.meaning` | Example sentence English translation |

### manchester-hsk-vocab.json

**Source:** University of Manchester Confucius Institute
**URLs:** `https://www.confuciusinstitute.manchester.ac.uk/study/testing/hsk/hsk-learning-resources/`
**Script:** `scripts/extract-manchester-hsk.py` (requires pdfminer.six or poppler)
**Raw PDFs:** `data/manchester-hsk-pdfs/`
**Entries:** 5,038 words — word only, no translations
**License:** University publication; use for reference only

Fields per entry:
| Field | Description |
|-------|-------------|
| `hskLevel` | HSK 2.0 level (1–6) |
| `word` | Chinese word (simplified) |

Note: HSK levels 1–5 PDFs contain only Chinese words in columns.
HSK level 6 PDF includes Pinyin and English columns; only the Chinese word is extracted.

---

## anki/ (raw decks)

Raw `.apkg` Anki deck files for HSK 1–6 (JK deck series). Each `.apkg` is a zip
archive containing a SQLite database (`collection.anki2`). See `anki-hsk-vocab.json`
for the extracted data. All 6 decks share the same note structure (19 fields).

---

## glossika/

Sentences scraped from the Glossika language learning platform.
**Internal reference only — do not redistribute.**

| File | Language | Sentences |
|------|----------|-----------|
| en.txt | English | 6,634 |
| lv.txt | Latvian | 2,489 |
| ja.txt | Japanese | 6,236 |
| ko.txt | Korean | 4,033 |
| zh-CN.txt | Simplified Chinese | 6,382 |
| zh-TW.txt | Traditional Chinese | 5,964 |
| yue.txt | Cantonese | 2,539 |
| vi.txt | Vietnamese (Northern) | 10 (incomplete) |

`sentences.json` — merged output keyed by sentence ID with all available languages.
5,508 zh-CN/zh-TW parallel pairs; 1,203 entries with all 5 CJK languages.

See [glossika/README.md](glossika/README.md) for full details and intended uses.

---

## sentence-patterns/

**Source:** "Japanese Sentence Patterns for Effective Communication" N5–N1 by Noboru Akuzawa
**Script:** `scripts/parse-sentence-patterns.ts` (requires `pdftotext` via `brew install poppler`)
**Raw PDFs:** `tmp/sentence_patterns/` (not committed — obtain separately)
**License:** Commercial — internal reference only, do not redistribute

| File | Description |
|------|-------------|
| `all.json` | 707 patterns across N5–N1 |
| `flagged.json` | 8 patterns needing manual review |

Fields per pattern:

| Field | Description |
|-------|-------------|
| `jlpt` | Level: N5, N4, N3, N2, or N1 |
| `header` | Pattern header (Japanese + romaji + English gloss) |
| `meaning` | English meaning/explanation |
| `formation` | Formation rules |
| `sentences` | Array of `{ja, en}` sentence pairs (typically 6 per pattern) |
| `vocabulary` | Array of `{word, reading, meaning}` vocabulary entries |
| `flags` | QA flags: `no_header`, `count_mismatch`, `missing_en`, `no_sentences` |

**Stats by level:**

| Level | Patterns | Flagged |
|-------|----------|---------|
| N5 | 55 | 1 |
| N4 | 109 | 3 |
| N3 | 123 | 1 |
| N2 | 201 | 1 |
| N1 | 219 | 2 |
| **Total** | **707** | **8** |

All 8 flagged patterns are due to source book or PDF extraction artifacts (e.g., sentences concatenated on one line, sentence numbering gaps in the original).

---

## texts/

Japanese literary texts. See [texts/README.md](texts/README.md).
