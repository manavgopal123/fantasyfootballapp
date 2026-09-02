-- Closes out the last table flagged by Supabase's security scanner. Prisma's
-- own internal bookkeeping table (migration names/timestamps/checksums, no
-- application data) — same reasoning as the previous migration: the
-- `postgres` role our app connects as owns this table and has BYPASSRLS,
-- so this doesn't affect Prisma's own migration tracking.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
