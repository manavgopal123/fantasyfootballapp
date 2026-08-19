import { RosterSlot } from "@/generated/prisma/enums";

export type RosterSlotsConfig = Partial<Record<RosterSlot, number>>;

// Standard 1QB roster: 9 starters + 6 bench. No SUPERFLEX/IR by default —
// a commissioner-editable roster builder can come later.
export const DEFAULT_ROSTER_SLOTS: RosterSlotsConfig = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  FLEX: 1,
  DST: 1,
  K: 1,
  BENCH: 6,
};

export function totalRosterSize(slots: RosterSlotsConfig): number {
  return Object.values(slots).reduce((sum: number, n) => sum + (n ?? 0), 0);
}

// Sleeper's raw position string ("DEF" for team defense) -> our RosterSlot
// enum's matching direct starting slot ("DST").
export function positionToSlot(position: string): RosterSlot {
  return position === "DEF" ? "DST" : (position as RosterSlot);
}

export const FLEX_ELIGIBLE_POSITIONS = ["RB", "WR", "TE"];
export const SUPERFLEX_ELIGIBLE_POSITIONS = ["QB", "RB", "WR", "TE"];

// Can a player at `position` (Sleeper's raw string, e.g. "DEF") legally sit
// in `slot`? BENCH/IR take anyone; FLEX/SUPERFLEX take a wider band; every
// other slot needs an exact position match.
export function isSlotEligible(position: string, slot: RosterSlot): boolean {
  if (slot === "BENCH" || slot === "IR") return true;
  if (slot === "FLEX") return FLEX_ELIGIBLE_POSITIONS.includes(position);
  if (slot === "SUPERFLEX") return SUPERFLEX_ELIGIBLE_POSITIONS.includes(position);
  return positionToSlot(position) === slot;
}
