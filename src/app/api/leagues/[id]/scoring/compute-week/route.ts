import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeLeagueWeek } from "@/lib/scoring/compute-week";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id: leagueId } = await params;
  const { week } = (await req.json().catch(() => ({}))) as { week?: number };
  if (!week) return NextResponse.json({ error: "week is required" }, { status: 400 });

  const league = await db.league.findUnique({ where: { id: leagueId } });
  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });
  if (league.commissionerId !== session.user.id) {
    return NextResponse.json({ error: "Only the commissioner can sync scores" }, { status: 403 });
  }

  const result = await computeLeagueWeek(leagueId, week);
  return NextResponse.json(result);
}
