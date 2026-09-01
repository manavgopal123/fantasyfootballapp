# Fantasy Football League App

A custom fantasy football platform built for a small private league — PWA, real NFL data, no third-party fantasy service required.

**Live:** [fantasyfootballappleague.vercel.app](https://fantasyfootballappleague.vercel.app)

## Features

- Email/password accounts, private leagues joined via invite link
- Configurable scoring settings and standings format (Head-to-Head, Head-to-Head + Median, All-Play, Total Points)
- Live-polling snake draft room, with a player pool pulled from Sleeper's API
- Auto-generated season schedule (round-robin for H2H formats)
- Real weekly scoring from Sleeper's live/final stat feed, kept fresh automatically by a daily Vercel Cron job
- Per-player lineup locking, using real kickoff times from ESPN's public schedule (falls back to a commissioner-configurable day/time when kickoff data isn't available)
- Instant first-come-first-served free agency (add/drop)
- Player trades with propose/accept/reject/cancel
- Installable as a home-screen PWA on iOS/Android

## Tech stack

- Next.js (App Router) + TypeScript, Tailwind CSS
- Prisma + Postgres ([Supabase](https://supabase.com))
- NextAuth (Credentials provider, JWT sessions)
- Deployed on [Vercel](https://vercel.com)
- Data sources: [Sleeper's public API](https://docs.sleeper.com/) (players, stats) and ESPN's public scoreboard endpoint (game kickoff times) — both free, no API key required

## Getting started

Needs a Supabase project — from its dashboard under Project Settings → Database, grab both the **Transaction pooler** connection string (`DATABASE_URL`) and the **direct** connection string (`DIRECT_URL`); see the comments in `.env.example` for why both are needed.

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL, DIRECT_URL, AUTH_SECRET, and CRON_SECRET
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Player and stat data isn't included — sync it after starting the dev server (the sync routes require either a signed-in session or the `CRON_SECRET` bearer token):

```bash
curl -X POST http://localhost:3000/api/sync/players -H "Authorization: Bearer $CRON_SECRET"
```

Weekly stats, schedule data, and score computation are triggered from the league dashboard (commissioner), a daily cron job (`src/app/api/cron/sync`, configured in `vercel.json`), or manually via `/api/sync/stats`, `/api/sync/schedule`, and `/api/sync/compute-week`.

## Project structure

- `src/app` — pages and API routes (App Router)
- `src/lib` — scoring engine, draft logic, standings, lineup locking, Sleeper/ESPN clients
- `prisma/schema.prisma` — data model
