# data/glossika/

Sentences scraped from the Glossika language learning platform.

**License:** Glossika is a commercial product — this data is for **internal reference only**.
Do not redistribute or expose sentences verbatim in public-facing features.

## Source files

| File | Language | Sentences |
|------|----------|-----------|
| ja.txt | Japanese | 6,236 |
| ko.txt | Korean | 4,033 |
| zh-CN.txt | Simplified Chinese (Beijing/mainland) | 6,382 |
| zh-TW.txt | Traditional Chinese (Taiwan) | 5,964 |
| vi.txt | Vietnamese (Northern) | 10 (incomplete) |

Cantonese is not yet available.

## Format

Each source file contains numbered sentences, one per line:

```
1. 今天天气不错。
2. 我不是个有钱人。
```

Numbers are not always consecutive — gaps exist because the files were scraped
from a larger dataset that includes variants not captured here.

## Structured output

`sentences.json` — all sentences merged by ID, one entry per unique sentence number.

```json
{
  "id": 1,
  "ja": "今日は天気がいいです。",
  "ko": "오늘 날씨가 좋아요.",
  "zh-CN": "今天天气不错。",
  "zh-TW": "今天天氣不錯。"
}
```

Fields are optional — only present if the sentence exists in that language's file.

| Stat | Count |
|------|-------|
| Total unique sentence IDs | 6,863 |
| zh-CN + zh-TW parallel pairs | 5,508 |
| All 4 CJK languages (zh-CN + zh-TW + ja + ko) | 3,089 |

Use `scripts/parse-glossika.ts` to re-generate `sentences.json`.

## Intended uses

- **Sentence mining** — example sentences for vocabulary and character entries
- **Hanzi coverage analysis** — identify characters present in real spoken sentences
- **Simplified ↔ traditional alignment** — the 5,508 zh-CN/zh-TW pairs form a
  clean parallel corpus for cross-referencing character forms
- **Cross-language comparison** — the 3,089 entries with all 4 CJK languages
  illustrate phonetic/semantic parallels across Japanese, Korean, and Chinese

## Adding more languages

If you obtain additional Glossika files (Cantonese, complete Vietnamese, etc.):
1. Place the raw file in `data/glossika/` using the BCP-47 language code as filename
   (e.g. `yue.txt` for Cantonese, `vi.txt` already reserved for Vietnamese)
2. Add the file to the `FILES` array in `scripts/parse-glossika.ts`
3. Re-run `npx tsx scripts/parse-glossika.ts` to regenerate `sentences.json`
4. Update this README with the new counts
