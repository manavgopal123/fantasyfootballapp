-- Supabase auto-provisions a public REST API (PostgREST) for every table in
-- the `public` schema, gated only by Row-Level Security. Our app never uses
-- that API or Supabase Auth — it connects directly as the `postgres` role
-- via Prisma, which owns these tables and has BYPASSRLS, so RLS has no
-- effect on the app itself. Enabling it here with no policies just closes
-- off the PostgREST surface (which authenticates as `anon`/`authenticated`,
-- neither of which bypasses RLS) so it can no longer read/write/delete data.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "League" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeagueMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Team" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Player" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RosterEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WeeklyLineup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeamGameTime" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlayerWeekStats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Matchup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DraftPick" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Trade" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TradeItem" ENABLE ROW LEVEL SECURITY;
