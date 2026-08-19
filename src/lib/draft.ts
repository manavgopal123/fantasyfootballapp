import { Prisma } from "@/generated/prisma/client";
import { RosterSlot } from "@/generated/prisma/enums";
import { RosterSlotsConfig, positionToSlot, FLEX_ELIGIBLE_POSITIONS } from "./roster-config";

// Accepts either the top-level db client or a `$transaction` callback's tx
// client, so callers that need the read-then-write to be atomic (e.g. the
// draft pick endpoint) can run this inside their own transaction.
type DbOrTx = Prisma.TransactionClient;

export interface SnakePick {
  round: number;
  pickNo: number;
  teamId: string;
}

// Standard snake order: round 1 goes in `teamIds` order, round 2 reverses,
// round 3 goes forward again, etc.
export function generateSnakeOrder(teamIds: string[], rounds: number): SnakePick[] {
  const picks: SnakePick[] = [];
  let pickNo = 1;
  for (let round = 1; round <= rounds; round++) {
    const order = round % 2 === 1 ? teamIds : [...teamIds].reverse();
    for (const teamId of order) {
      picks.push({ round, pickNo, teamId });
      pickNo++;
    }
  }
  return picks;
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Greedily slots a newly-drafted player into the most specific open roster
// spot: its direct position slot, then FLEX if eligible, then bench. Lets
// teams come out of the draft with a usable starting lineup without a
// separate "set your lineup" step existing yet.
export async function assignSlotForPick(
  client: DbOrTx,
  teamId: string,
  position: string,
  rosterSlots: RosterSlotsConfig
): Promise<RosterSlot> {
  const grouped = await client.rosterEntry.groupBy({
    by: ["slot"],
    where: { teamId },
    _count: true,
  });
  const countBySlot = new Map(grouped.map((g) => [g.slot, g._count]));

  const directSlot = positionToSlot(position);
  const directCap = rosterSlots[directSlot] ?? 0;
  if ((countBySlot.get(directSlot) ?? 0) < directCap) {
    return directSlot;
  }

  if (FLEX_ELIGIBLE_POSITIONS.includes(position)) {
    const flexCap = rosterSlots.FLEX ?? 0;
    if ((countBySlot.get("FLEX") ?? 0) < flexCap) {
      return "FLEX";
    }
  }

  return "BENCH";
}
