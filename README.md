# Fantasy Football League App

A custom fantasy football platform built for a small private league — PWA, real NFL data, no third-party fantasy service required.

## Features

- Email/password accounts, private leagues joined via invite link
- Configurable scoring settings and standings format (Head-to-Head, Head-to-Head + Median, All-Play, Total Points)
- Live-polling snake draft room, with a player pool pulled from Sleeper's API
- Auto-generated season schedule (round-robin for H2H formats)
- Real weekly scoring from Sleeper's live/final stat feed
- Per-player lineup locking, using real kickoff times from ESPN's public schedule (falls back to a commissioner-configurable day/time when kickoff data isn't available)
- Instant first-come-first-served free agency (add/drop)
- Player trades with propose/accept/reject/cancel

## Tech stack

- Next.js (App Router) + TypeScript, Tailwind CSS
- Prisma + SQLite (local dev)
- NextAuth (Credentials provider, JWT sessions)
- Data sources: [Sleeper's public API](https://docs.sleeper.com/) (players, stats) and ESPN's public scoreboard endpoint (game kickoff times) — both free, no API key required

## Getting started

```bash
npm install
cp .env.example .env   # then fill in AUTH_SECRET (see comment in the file)
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Player and stat data isn't included — sync it after starting the dev server:

```bash
curl -X POST http://localhost:3000/api/sync/players
```

Weekly stats, schedule data, and score computation are triggered from the league dashboard (commissioner) or via `/api/sync/stats`, `/api/sync/schedule`, and `/api/sync/compute-week`.

## Project structure

- `src/app` — pages and API routes (App Router)
- `src/lib` — scoring engine, draft logic, standings, lineup locking, Sleeper/ESPN clients
- `prisma/schema.prisma` — data model
