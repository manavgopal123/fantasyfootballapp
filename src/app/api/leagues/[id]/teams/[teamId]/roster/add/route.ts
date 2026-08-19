import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCurrentWeek, isPlayerLocked } from "@/lib/lock";
import { totalRosterSize, RosterSlotsConfig } from "@/lib/roster-config";

// Instant, first-come-first-served free agency: no bidding, no waiver
// window. Adds a free agent to the bench, optionally dropping a rostered
// player in the same move to make room.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id: leagueId, teamId } = await params;
  const { addPlayerId, dropPlayerId } = (await req.json().catch(() => ({}))) as {
    addPlayerId?: string;
    dropPlayerId?: string;
  };
  if (!addPlayerId) return NextResponse.json({ error: "addPlayerId is required" }, { status: 400 });

  const [team, league] = await Promise.all([
    db.team.findUnique({ where: { id: teamId } }),
    db.league.findUnique({ where: { id: leagueId } }),
  ]);
  if (!team || team.leagueId !== leagueId) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });

  const canAct = team.ownerId === session.user.id || league.commissionerId === session.user.id;
  if (!canAct) return NextResponse.json({ error: "Not your team" }, { status: 403 });

  const addPlayer = await db.player.findUnique({ where: { id: addPlayerId } });
  if (!addPlayer) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const alreadyRostered = await db.rosterEntry.findFirst({
    where: { playerId: addPlayerId, team: { leagueId } },
  });
  if (alreadyRostered) {
    return NextResponse.json({ error: "That player is already on a roster in this league" }, { status: 409 });
  }

  let dropEntry = null;
  if (dropPlayerId) {
    dropEntry = await db.rosterEntry.findUnique({
      where: { teamId_playerId: { teamId, playerId: dropPlayerId } },
      include: { player: true },
    });
    if (!dropEntry) return NextResponse.json({ error: "That player isn't on your roster" }, { status: 404 });

    const currentWeek = await getCurrentWeek(leagueId);
    if (currentWeek !== null) {
      const locked = await isPlayerLocked(dropEntry.player.nflTeam, league.season, currentWeek, {
        lockDayOfWeek: league.lockDayOfWeek,
        lockHour: league.lockHour,
      });
      if (locked) {
        return NextResponse.json(
          { error: `${dropEntry.player.firstName} ${dropEntry.player.lastName}'s game has already started — can't drop them this week` },
          { status: 409 }
        );
      }
    }
  } else {
    const rosterCount = await db.rosterEntry.count({ where: { teamId } });
    const cap = totalRosterSize(league.rosterSlots as RosterSlotsConfig);
    if (rosterCount >= cap) {
      return NextResponse.json({ error: "Your roster is full — pick a player to drop" }, { status: 400 });
    }
  }

  await db.$transaction([
    ...(dropEntry ? [db.rosterEntry.delete({ where: { id: dropEntry.id } })] : []),
    db.rosterEntry.create({ data: { teamId, playerId: addPlayerId, slot: "BENCH" } }),
    db.transaction.create({
      data: {
        leagueId,
        teamId,
        type: "ADD",
        status: "COMPLETE",
        playerId: addPlayerId,
        droppedPlayerId: dropPlayerId ?? null,
        resolvedAt: new Date(),
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
