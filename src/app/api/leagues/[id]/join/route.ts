import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id: leagueId } = await params;
  const { teamName } = (await req.json().catch(() => ({}))) as { teamName?: string };
  if (!teamName) return NextResponse.json({ error: "Team name is required" }, { status: 400 });

  const league = await db.league.findUnique({ where: { id: leagueId } });
  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });

  const existing = await db.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId: session.user.id } },
  });
  if (existing) return NextResponse.json({ error: "Already a member of this league" }, { status: 409 });

  await db.leagueMember.create({ data: { leagueId, userId: session.user.id } });
  const team = await db.team.create({ data: { leagueId, ownerId: session.user.id, name: teamName } });

  return NextResponse.json(team);
}
