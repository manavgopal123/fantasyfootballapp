import { ScoringSettings } from "./types";

// Raw per-player stat line as returned by Sleeper's stats endpoint
// (verified against a live GET /v1/stats/nfl/regular/{season}/{week} response).
// Two keys are unconfirmed because no such event occurred in the sample week
// checked: `safe` (defensive safety) and the return-TD keys (`pr_td`/`kr_td`/`st_td`,
// named to match Sleeper's pr/kr prefix convention) — verify once a real
// occurrence is seen and adjust if Sleeper uses different names.
export type SleeperStatLine = Record<string, number | undefined>;

function tieredPointsAllowed(pa: number, s: ScoringSettings): number {
  if (pa <= 0) return s.ptsAllowed0;
  if (pa <= 6) return s.ptsAllowed1to6;
  if (pa <= 13) return s.ptsAllowed7to13;
  if (pa <= 20) return s.ptsAllowed14to20;
  if (pa <= 27) return s.ptsAllowed21to27;
  if (pa <= 34) return s.ptsAllowed28to34;
  return s.ptsAllowed35Plus;
}

export function calculateFantasyPoints(
  stats: SleeperStatLine,
  scoring: ScoringSettings,
  position: string
): number {
  const n = (key: string) => stats[key] ?? 0;
  let pts = 0;

  // Passing
  pts += n("pass_yd") * scoring.passYd;
  pts += n("pass_td") * scoring.passTd;
  pts += n("pass_int") * scoring.passInt;
  pts += n("pass_2pt") * scoring.passTwoPt;
  if (n("pass_yd") >= 300) pts += scoring.bonusPass300;

  // Rushing
  pts += n("rush_yd") * scoring.rushYd;
  pts += n("rush_td") * scoring.rushTd;
  pts += n("rush_2pt") * scoring.rushTwoPt;
  if (n("rush_yd") >= 100) pts += scoring.bonusRush100;

  // Receiving
  const receptions = n("rec");
  pts += n("rec_yd") * scoring.recYd;
  pts += n("rec_td") * scoring.recTd;
  pts += receptions * scoring.reception;
  pts += n("rec_2pt") * scoring.recTwoPt;
  if (position === "TE") pts += receptions * scoring.teReceptionBonus;
  if (n("rec_yd") >= 100) pts += scoring.bonusRec100;

  // Fumbles
  pts += n("fum_lost") * scoring.fumbleLost;

  // Kicking — Sleeper has no single "under 40" bucket, so derive it by
  // subtracting the 40-49 and 50+ buckets from total makes.
  const fgMade50Plus = n("fgm_50p");
  const fgMade40to49 = n("fgm_40_49");
  const fgMadeUnder40 = Math.max(0, n("fgm") - fgMade40to49 - fgMade50Plus);
  pts += fgMadeUnder40 * scoring.fgMade0to39;
  pts += fgMade40to49 * scoring.fgMade40to49;
  pts += fgMade50Plus * scoring.fgMade50Plus;
  pts += n("fgmiss") * scoring.fgMissed;
  pts += n("xpm") * scoring.xpMade;

  // Defense / Special Teams
  pts += n("def_td") * scoring.defTd;
  pts += n("int") * scoring.defInt;
  pts += n("fum_rec") * scoring.defFumbleRec;
  pts += n("sack") * scoring.defSack;
  pts += n("safe") * scoring.defSafety;
  pts += n("blk_kick") * scoring.defBlockKick;
  if (position === "DEF" && stats["pts_allow"] !== undefined) {
    pts += tieredPointsAllowed(n("pts_allow"), scoring);
  }

  // Return TDs (any position)
  pts += (n("st_td") + n("pr_td") + n("kr_td")) * scoring.returnTd;

  return Math.round(pts * 100) / 100;
}
