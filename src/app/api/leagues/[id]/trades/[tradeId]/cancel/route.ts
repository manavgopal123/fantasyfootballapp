import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; tradeId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id: leagueId, tradeId } = await params;
  const [league, trade] = await Promise.all([
    db.league.findUnique({ where: { id: leagueId } }),
    db.trade.findUnique({ where: { id: tradeId }, include: { proposingTeam: true } }),
  ]);
  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });
  if (!trade || trade.leagueId !== leagueId) return NextResponse.json({ error: "Trade not found" }, { status: 404 });
  if (trade.status !== "PENDING") return NextResponse.json({ error: "This trade has already been resolved" }, { status: 409 });

  const canAct = trade.proposingTeam.ownerId === session.user.id || league.commissionerId === session.user.id;
  if (!canAct) return NextResponse.json({ error: "Only the proposing team can cancel this trade" }, { status: 403 });

  await db.trade.update({ where: { id: tradeId }, data: { status: "CANCELLED", resolvedAt: new Date() } });
  return NextResponse.json({ status: "CANCELLED" });
}
