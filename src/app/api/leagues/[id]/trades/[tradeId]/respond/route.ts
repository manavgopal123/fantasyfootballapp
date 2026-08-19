import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCurrentWeek, isPlayerLocked } from "@/lib/lock";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; tradeId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id: leagueId, tradeId } = await params;
  const { action } = (await req.json().catch(() => ({}))) as { action?: "accept" | "reject" };
  if (action !== "accept" && action !== "reject") {
    return NextResponse.json({ error: "action must be 'accept' or 'reject'" }, { status: 400 });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const league = await tx.league.findUnique({ where: { id: leagueId } });
      if (!league) throw new ApiError(404, "League not found");

      const trade = await tx.trade.findUnique({
        where: { id: tradeId },
        include: { items: { include: { player: true } }, receivingTeam: true },
      });
      if (!trade || trade.leagueId !== leagueId) throw new ApiError(404, "Trade not found");
      if (trade.status !== "PENDING") throw new ApiError(409, "This trade has already been resolved");

      const canAct =
        trade.receivingTeam.ownerId === session.user.id || league.commissionerId === session.user.id;
      if (!canAct) throw new ApiError(403, "Only the receiving team can respond to this trade");

      if (action === "reject") {
        await tx.trade.update({ where: { id: tradeId }, data: { status: "REJECTED", resolvedAt: new Date() } });
        return { status: "REJECTED" };
      }

      // Re-validate ownership — a player could have been dropped or traded
      // away by either side since this trade was proposed.
      for (const item of trade.items) {
        const stillOwned = await tx.rosterEntry.findUnique({
          where: { teamId_playerId: { teamId: item.fromTeamId, playerId: item.playerId } },
        });
        if (!stillOwned) {
          throw new ApiError(
            409,
            `${item.player.firstName} ${item.player.lastName} is no longer on that team's roster — trade can't be completed`
          );
        }
      }

      const currentWeek = await getCurrentWeek(leagueId);
      if (currentWeek !== null) {
        const fallbackRule = { lockDayOfWeek: league.lockDayOfWeek, lockHour: league.lockHour };
        for (const item of trade.items) {
          const locked = await isPlayerLocked(item.player.nflTeam, league.season, currentWeek, fallbackRule);
          if (locked) {
            throw new ApiError(
              409,
              `${item.player.firstName} ${item.player.lastName}'s game has already started — can't trade them this week`
            );
          }
        }
      }

      const otherTeamId = (fromTeamId: string) =>
        fromTeamId === trade.proposingTeamId ? trade.receivingTeamId : trade.proposingTeamId;

      for (const item of trade.items) {
        await tx.rosterEntry.update({
          where: { teamId_playerId: { teamId: item.fromTeamId, playerId: item.playerId } },
          data: { teamId: otherTeamId(item.fromTeamId), slot: "BENCH" },
        });
      }

      await tx.trade.update({ where: { id: tradeId }, data: { status: "ACCEPTED", resolvedAt: new Date() } });
      return { status: "ACCEPTED" };
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
