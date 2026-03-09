# data/texts

Local library of Japanese literary texts for analysis, sentence mining,
and frequency analysis. Texts may come from multiple sources and formats.

## Directory structure

```
data/texts/
├── README.md          ← this file
├── index.json         ← master catalog of all stored works
└── <author-slug>/     ← kebab-case romanized author name
    └── <work-slug>/   ← kebab-case romanized work title
        └── <file>     ← the text file, kept in original source format
```

## index.json

Master catalog. Each entry has the following fields:

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier: `"<author-slug>/<work-slug>"` |
| `author.ja` | string | Author name in Japanese |
| `author.romanized` | string | Author name romanized (Latin script) |
| `title.ja` | string | Work title in Japanese |
| `title.romanized` | string | Work title romanized |
| `year` | number | Year of original publication |
| `source` | string | Where the file was obtained (e.g. `"aozora"`) |
| `source_url` | string | URL of the source page (for attribution and re-downloading) |
| `format` | string | File format — determines how parsing scripts process it (see below) |
| `license` | string | Copyright/license status (see below) |
| `license_notes` | string? | Optional clarification for license |
| `file` | string | Path to the text file, relative to `data/texts/` |

## Formats

| Value | Description |
|---|---|
| `aozora-ruby` | Aozora Bunko plain text with ruby notation (`漢字《かんじ》`, `｜phrase《ruby》`) |

## Licenses

| Value | Description |
|---|---|
| `public-domain` | Public domain — free to use, process, and publish excerpts |
| `cc-by` | Creative Commons Attribution |
| `cc-by-nc` | Creative Commons Attribution Non-Commercial |
| `restricted` | Non-public copy — internal use only, do not publish verbatim |

## Aozora ruby format notes

Aozora plain text files (ruby variant) use ShiftJIS encoding in the source zip.
**Files stored here are converted to UTF-8** at the time of download.

Key markup conventions in aozora-ruby format:
- `漢字《かんじ》` — inline ruby (reading follows in 《》)
- `｜phrase《ruby》` — `｜` marks start of ruby base when it spans multiple characters
- `［＃...］` — annotator notes (chapter headings, formatting, rare character descriptions)
- Files include a header block (symbol guide) and footer block — processing scripts should strip these

## Adding new texts

1. Download the text file and convert to UTF-8 if needed:
   ```
   iconv -f SHIFT_JIS -t UTF-8 source.txt > data/texts/<author>/<work>/<work>.txt
   ```
2. Add an entry to `index.json`
3. Commit both the text file and the updated index
