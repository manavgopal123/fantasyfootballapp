import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_SCORING_SETTINGS } from "@/lib/scoring/types";
import { DEFAULT_ROSTER_SLOTS } from "@/lib/roster-config";

const VALID_FORMATS = ["HEAD_TO_HEAD", "ALL_PLAY", "TOTAL_POINTS", "HEAD_TO_HEAD_MEDIAN"] as const;

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const memberships = await db.leagueMember.findMany({
    where: { userId: session.user.id },
    include: { league: true },
  });

  return NextResponse.json(memberships.map((m) => m.league));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, season, standingsFormat, teamName, ppr, tePremium, returnTds, yardageBonuses } = body as {
    name?: string;
    season?: number;
    standingsFormat?: string;
    teamName?: string;
    ppr?: number;
    tePremium?: boolean;
    returnTds?: boolean;
    yardageBonuses?: boolean;
  };

  if (!name || !season || !standingsFormat || !teamName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!VALID_FORMATS.includes(standingsFormat as (typeof VALID_FORMATS)[number])) {
    return NextResponse.json({ error: "Invalid standings format" }, { status: 400 });
  }

  const scoringSettings = {
    ...DEFAULT_SCORING_SETTINGS,
    reception: ppr ?? DEFAULT_SCORING_SETTINGS.reception,
    teReceptionBonus: tePremium === false ? 0 : DEFAULT_SCORING_SETTINGS.teReceptionBonus,
    returnTd: returnTds === false ? 0 : DEFAULT_SCORING_SETTINGS.returnTd,
    bonusRush100: yardageBonuses === false ? 0 : DEFAULT_SCORING_SETTINGS.bonusRush100,
    bonusRec100: yardageBonuses === false ? 0 : DEFAULT_SCORING_SETTINGS.bonusRec100,
    bonusPass300: yardageBonuses === false ? 0 : DEFAULT_SCORING_SETTINGS.bonusPass300,
  };

  const league = await db.league.create({
    data: {
      name,
      season,
      standingsFormat: standingsFormat as (typeof VALID_FORMATS)[number],
      scoringSettings,
      rosterSlots: DEFAULT_ROSTER_SLOTS,
      commissionerId: session.user.id,
      members: { create: { userId: session.user.id } },
      teams: { create: { name: teamName, ownerId: session.user.id } },
    },
  });

  return NextResponse.json(league);
}
