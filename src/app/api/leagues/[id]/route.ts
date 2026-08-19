import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const league = await db.league.findUnique({
    where: { id },
    include: {
      teams: { include: { owner: { select: { name: true } } } },
      commissioner: { select: { name: true } },
    },
  });
  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });
  return NextResponse.json(league);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const league = await db.league.findUnique({ where: { id } });
  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });
  if (league.commissionerId !== session.user.id) {
    return NextResponse.json({ error: "Only the commissioner can change league settings" }, { status: 403 });
  }

  const { lockDayOfWeek, lockHour } = (await req.json().catch(() => ({}))) as {
    lockDayOfWeek?: number;
    lockHour?: number;
  };

  const data: { lockDayOfWeek?: number; lockHour?: number } = {};
  if (lockDayOfWeek !== undefined) {
    if (lockDayOfWeek < 0 || lockDayOfWeek > 6) {
      return NextResponse.json({ error: "lockDayOfWeek must be 0-6" }, { status: 400 });
    }
    data.lockDayOfWeek = lockDayOfWeek;
  }
  if (lockHour !== undefined) {
    if (lockHour < 0 || lockHour > 23) {
      return NextResponse.json({ error: "lockHour must be 0-23" }, { status: 400 });
    }
    data.lockHour = lockHour;
  }

  const updated = await db.league.update({ where: { id }, data });
  return NextResponse.json(updated);
}
