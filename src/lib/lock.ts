import { db } from "@/lib/db";

export interface LockRule {
  lockDayOfWeek: number; // 0=Sun..6=Sat
  lockHour: number; // 0-23
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Fallback for when we don't have a real kickoff time: is "now" within the
// locked portion of the recurring weekly cycle defined by (lockDayOfWeek,
// lockHour)? Evaluated in US Eastern time, the NFL's own scheduling zone —
// resets automatically each week once we roll past Sunday.
function isPastFallbackDeadline(rule: LockRule, now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const weekdayStr = parts.find((p) => p.type === "weekday")!.value;
  const hourStr = parts.find((p) => p.type === "hour")!.value;
  const currentDay = WEEKDAYS.indexOf(weekdayStr);
  const currentHour = Number(hourStr) % 24; // Intl can format midnight as "24"

  if (currentDay > rule.lockDayOfWeek) return true;
  if (currentDay === rule.lockDayOfWeek && currentHour >= rule.lockHour) return true;
  return false;
}

// Is a player locked for editing this week? Prefers the real kickoff time
// for their NFL team; falls back to the league's configurable day/hour rule
// when we don't have that data (bye weeks, unsynced schedule, etc.).
export async function isPlayerLocked(
  nflTeam: string | null,
  season: number,
  week: number,
  fallbackRule: LockRule,
  now: Date = new Date()
): Promise<boolean> {
  if (nflTeam) {
    const game = await db.teamGameTime.findUnique({
      where: { season_week_nflTeam: { season, week, nflTeam } },
    });
    if (game) return now >= game.kickoffAt;
  }
  return isPastFallbackDeadline(fallbackRule, now);
}

// A league's "current" week for locking purposes: the earliest scheduled
// week that hasn't been scored yet. Returns null if there's no schedule, or
// every scheduled week is already played (nothing left to lock).
export async function getCurrentWeek(leagueId: string): Promise<number | null> {
  const next = await db.matchup.findFirst({
    where: { leagueId, played: false },
    orderBy: { week: "asc" },
    select: { week: true },
  });
  return next?.week ?? null;
}
