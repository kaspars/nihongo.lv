# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

nihongo.lv — a Japanese language learning web application for Latvian speakers. Rewrite of an older Express/EJS app (old code in `../nihongo.lv-old` for reference).

## Tech Stack

- **Framework:** Next.js 16 (App Router, React)
- **Language:** TypeScript
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** Auth.js (Google OAuth)
- **Styling:** Tailwind CSS
- **TTS:** AWS Polly via AWS SDK v3
- **Kanji stroke input:** @kaspars/kaku and @kaspars/kaku-ren (author's own npm packages)
- **Hosting:** Self-hosted — Docker, nginx reverse proxy

## Features

### Core (priority)
- **Dictionary:** Japanese-Latvian dictionary with search, furigana rendering, TTS audio
- **Kanji database:** Kanji with properties (keyword, meanings, readings, grade, JLPT, strokes, etc.), filtering, daily kanji
- **Kanji drills:** Heisig-style keyword↔kanji association. Users learn unique Latvian keywords for each kanji. Stroke writing input via @kaspars/kaku-ren evaluates acquisition level. Inspired by Kanji Dojo (https://github.com/syt0r/Kanji-Dojo)
- **User accounts:** Google OAuth, progress tracking per user

### Secondary
- **Widgets:** Weather (multiple cities), EUR exchange rates, Riga/Tokyo time
- **Static pages:** Lightweight, for informational content when needed
- **Admin UI:** Lightweight content editing interface (scope TBD)

### Future ideas
- **Duolingo-style drills:** Vocabulary, sentence patterns — game-like learning environment
- **3D learning spaces:** Spatial memory / mind palace approach to kanji learning. First-person exploration of 3D environments with kanji placed in space. Tech: React Three Fiber (r3f) + Drei
- **Data migration:** Selective migration from old PostgreSQL database (different schema)

### Discarded from old app
- Blog system, comments, image library/Unsplash integration

## Furigana Markup

Storage format inherited from old app: `kanji{furigana}[normalized]` (e.g., `食{た}べる`). Compact and human-readable. Rendered to HTML `<ruby>` tags at the view layer. The `[normalized]` part's necessity is under review. Parser must have solid test coverage (old tests in `../nihongo.lv-old/test/formattingHelpers_test.js`).

## Testing

High test coverage (~90%) is a hard requirement. Tests must not be an afterthought.

- **Framework:** Vitest (fast, native TypeScript/ESM)
- **Component testing:** React Testing Library
- **DB tests:** Run against a real test PostgreSQL database, not mocks
- **E2E:** Playwright (later, not initial priority)

### Principles
- Extract logic into pure functions and test them independently. Keep React components thin.
- Every module should be testable. If it's hard to test, refactor the design.
- Write tests alongside implementation, not after.

## Commands

<!-- Update these as the project takes shape -->

## Old Codebase Reference

The previous implementation is at `../nihongo.lv-old`. Key files for reference:
- `server.js` — monolithic Express app (1,246 lines)
- `libs/formattingHelpers.js` — furigana markup parser (worth porting logic + tests)
- `libs/dictionarySearch.js` — dictionary search with type detection and ranking
- `models/` — Sequelize models (kanji, word, sentence, user, etc.)
- `test/` — Mocha/Chai tests for formatting and validation helpers
