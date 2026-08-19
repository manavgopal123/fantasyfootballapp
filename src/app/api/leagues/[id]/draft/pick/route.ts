import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assignSlotForPick } from "@/lib/draft";
import { RosterSlotsConfig } from "@/lib/roster-config";
import { generateSchedule } from "@/lib/schedule";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id: leagueId } = await params;
  const { playerId } = (await req.json().catch(() => ({}))) as { playerId?: string };
  if (!playerId) return NextResponse.json({ error: "playerId is required" }, { status: 400 });

  try {
    const result = await db.$transaction(async (tx) => {
      const league = await tx.league.findUnique({ where: { id: leagueId } });
      if (!league) throw new ApiError(404, "League not found");
      if (league.status !== "DRAFTING") throw new ApiError(409, "This league isn't currently drafting");

      const onClock = await tx.draftPick.findFirst({
        where: { leagueId, playerId: null },
        orderBy: { pickNo: "asc" },
        include: { team: true },
      });
      if (!onClock) throw new ApiError(409, "The draft has already finished");

      const canAct =
        onClock.team.ownerId === session.user.id || league.commissionerId === session.user.id;
      if (!canAct) throw new ApiError(403, "It's not your team's turn to pick");

      const alreadyTaken = await tx.draftPick.findFirst({ where: { leagueId, playerId } });
      if (alreadyTaken) throw new ApiError(409, "That player has already been drafted");

      const player = await tx.player.findUnique({ where: { id: playerId } });
      if (!player) throw new ApiError(404, "Player not found");

      await tx.draftPick.update({
        where: { id: onClock.id },
        data: { playerId, pickedAt: new Date() },
      });

      const slot = await assignSlotForPick(tx, onClock.teamId, player.position, league.rosterSlots as RosterSlotsConfig);
      await tx.rosterEntry.create({ data: { teamId: onClock.teamId, playerId, slot } });

      const remaining = await tx.draftPick.count({ where: { leagueId, playerId: null } });
      if (remaining === 0) {
        await tx.league.update({ where: { id: leagueId }, data: { status: "ACTIVE" } });

        const teams = await tx.team.findMany({ where: { leagueId }, select: { id: true } });
        const schedule = generateSchedule(
          teams.map((t) => t.id),
          league.standingsFormat,
          league.regularSeasonWeeks
        );
        if (schedule.length > 0) {
          await tx.matchup.createMany({
            data: schedule.map((row) => ({
              leagueId,
              week: row.week,
              homeTeamId: row.homeTeamId,
              awayTeamId: row.awayTeamId,
            })),
          });
        }
      }

      return { pickNo: onClock.pickNo, teamId: onClock.teamId, slot, draftComplete: remaining === 0 };
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
