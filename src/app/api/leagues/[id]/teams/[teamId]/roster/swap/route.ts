import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSlotEligible } from "@/lib/roster-config";
import { getCurrentWeek, isPlayerLocked } from "@/lib/lock";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id: leagueId, teamId } = await params;
  const { playerIdA, playerIdB } = (await req.json().catch(() => ({}))) as {
    playerIdA?: string;
    playerIdB?: string;
  };
  if (!playerIdA || !playerIdB) {
    return NextResponse.json({ error: "playerIdA and playerIdB are required" }, { status: 400 });
  }

  const [team, league] = await Promise.all([
    db.team.findUnique({ where: { id: teamId } }),
    db.league.findUnique({ where: { id: leagueId } }),
  ]);
  if (!team || team.leagueId !== leagueId) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });

  const canAct = team.ownerId === session.user.id || league.commissionerId === session.user.id;
  if (!canAct) return NextResponse.json({ error: "Not your team" }, { status: 403 });

  const [entryA, entryB] = await Promise.all([
    db.rosterEntry.findUnique({ where: { teamId_playerId: { teamId, playerId: playerIdA } }, include: { player: true } }),
    db.rosterEntry.findUnique({ where: { teamId_playerId: { teamId, playerId: playerIdB } }, include: { player: true } }),
  ]);
  if (!entryA || !entryB) {
    return NextResponse.json({ error: "Both players must be on this roster" }, { status: 404 });
  }

  if (!isSlotEligible(entryA.player.position, entryB.slot)) {
    return NextResponse.json(
      { error: `${entryA.player.firstName} ${entryA.player.lastName} can't play ${entryB.slot}` },
      { status: 400 }
    );
  }
  if (!isSlotEligible(entryB.player.position, entryA.slot)) {
    return NextResponse.json(
      { error: `${entryB.player.firstName} ${entryB.player.lastName} can't play ${entryA.slot}` },
      { status: 400 }
    );
  }

  const currentWeek = await getCurrentWeek(leagueId);
  if (currentWeek !== null) {
    const fallbackRule = { lockDayOfWeek: league.lockDayOfWeek, lockHour: league.lockHour };
    const [aLocked, bLocked] = await Promise.all([
      isPlayerLocked(entryA.player.nflTeam, league.season, currentWeek, fallbackRule),
      isPlayerLocked(entryB.player.nflTeam, league.season, currentWeek, fallbackRule),
    ]);
    if (aLocked) {
      return NextResponse.json(
        { error: `${entryA.player.firstName} ${entryA.player.lastName}'s game has already started` },
        { status: 409 }
      );
    }
    if (bLocked) {
      return NextResponse.json(
        { error: `${entryB.player.firstName} ${entryB.player.lastName}'s game has already started` },
        { status: 409 }
      );
    }
  }

  await db.$transaction([
    db.rosterEntry.update({ where: { id: entryA.id }, data: { slot: entryB.slot } }),
    db.rosterEntry.update({ where: { id: entryB.id }, data: { slot: entryA.slot } }),
  ]);

  return NextResponse.json({ ok: true });
}
