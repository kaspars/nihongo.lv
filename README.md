# nihongo.lv

Japanese language learning web application for Latvian speakers.

## Tech Stack

Next.js 16, TypeScript, PostgreSQL, Drizzle ORM, Auth.js (Google OAuth), Tailwind CSS, AWS Polly (TTS)

## Setup

```bash
nvm use
npm install
cp .env.example .env.local   # fill in secrets
```

### Database

PostgreSQL runs in Docker on port **5433** (to avoid conflicts with local PostgreSQL).

```bash
docker compose -f docker-compose.dev.yml up -d   # start
docker compose -f docker-compose.dev.yml down     # stop
```

Connect directly:

```bash
psql postgresql://nihongo:nihongo_dev@localhost:5433/nihongo
```

### Migrations

```bash
npm run db:generate   # generate migration from schema changes
npm run db:migrate    # apply migrations
npm run db:studio     # open Drizzle Studio (visual DB browser)
```

## Development

```bash
npm run dev           # start dev server (Turbopack)
npm run build         # production build
npm run start         # start production server
```

## Testing

```bash
npm test              # run all tests
npm run test:watch    # watch mode
npm run lint          # ESLint
```
