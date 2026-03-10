# data/anki/

Raw Anki flashcard decks for HSK 2.0 vocabulary (levels 1–6).

**Series:** JK HSK decks, shared on AnkiWeb via journeychinese.com.au
**License:** Not stated — treat as reference-only, do not redistribute

| File | AnkiWeb ID | Words | Sentences |
|------|-----------|-------|-----------|
| HSK_1_-_JK.apkg | 132435921 | 150 | 150 |
| HSK_2_-_JK.apkg | 1096327442 | 151 | 151 |
| HSK_3_-_JK.apkg | 1723226415 | 300 | 300 |
| HSK_4_-_JK.apkg | 936239780 | 600 | 559 |
| HSK_5_-_JK.apkg | 1118671953 | 1300 | 1043 |
| HSK_6_-_JK.apkg | 106917848 | 2500 | 1005 |

## File format

Each `.apkg` is a zip archive containing:
- `collection.anki2` — SQLite database with all note data
- Numbered files (`0`, `1`, `2`, ...) — audio and image media assets
- `media` — JSON mapping of media filenames

## Note fields (all 6 decks share the same structure)

| # | Field | Description |
|---|-------|-------------|
| 0 | Key | Numeric entry ID |
| 1 | Simplified | Simplified Chinese |
| 2 | Traditional | Traditional Chinese |
| 3 | Pinyin.1 | Pinyin with tone marks |
| 4 | Pinyin.2 | Pinyin with numeric tones |
| 5 | Meaning | English meaning |
| 6 | Part of speech | Grammatical category |
| 7 | Audio | Word pronunciation audio |
| 8 | Homophone | Homophone note |
| 9 | Homograph | Homograph note |
| 10 | SentenceSimplified | Example sentence (simplified) |
| 11 | SentenceTraditional | Example sentence (traditional) |
| 12 | SentenceSimplifiedCloze | Cloze deletion version |
| 13 | SentenceTraditionalCloze | Cloze deletion version |
| 14 | SentencePinyin.1 | Sentence pinyin (tone marks) |
| 15 | SentencePinyin.2 | Sentence pinyin (numeric tones) |
| 16 | SentenceMeaning | Sentence English translation |
| 17 | SentenceAudio | Sentence pronunciation audio |
| 18 | SentenceImage | Sentence illustration image |

Extracted data (without audio/images) is in `data/anki-hsk-vocab.json`.
Use `scripts/extract-anki-hsk.ts` to re-extract.
