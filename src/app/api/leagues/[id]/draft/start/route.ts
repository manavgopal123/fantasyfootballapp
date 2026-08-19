import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateSnakeOrder, shuffle } from "@/lib/draft";
import { totalRosterSize, RosterSlotsConfig } from "@/lib/roster-config";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id: leagueId } = await params;
  const league = await db.league.findUnique({ where: { id: leagueId }, include: { teams: true } });
  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });

  if (league.commissionerId !== session.user.id) {
    return NextResponse.json({ error: "Only the commissioner can start the draft" }, { status: 403 });
  }
  if (league.status !== "SETUP") {
    return NextResponse.json({ error: "This league's draft has already started" }, { status: 409 });
  }
  if (league.teams.length < 2) {
    return NextResponse.json({ error: "Need at least 2 teams to draft" }, { status: 400 });
  }

  const rounds = totalRosterSize(league.rosterSlots as RosterSlotsConfig);
  const order = shuffle(league.teams.map((t) => t.id));
  const picks = generateSnakeOrder(order, rounds);

  await db.$transaction([
    db.draftPick.createMany({
      data: picks.map((p) => ({
        leagueId,
        round: p.round,
        pickNo: p.pickNo,
        teamId: p.teamId,
      })),
    }),
    db.league.update({ where: { id: leagueId }, data: { status: "DRAFTING" } }),
  ]);

  return NextResponse.json({ rounds, totalPicks: picks.length });
}
