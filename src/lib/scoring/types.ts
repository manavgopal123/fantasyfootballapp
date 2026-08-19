// Shape of the League.scoringSettings JSON column.
// Field names on the right map to Sleeper's raw stat keys (see calculate.ts).
export interface ScoringSettings {
  passYd: number; // per yard
  passTd: number;
  passInt: number;
  passTwoPt: number;

  rushYd: number;
  rushTd: number;
  rushTwoPt: number;

  recYd: number;
  recTd: number;
  reception: number; // PPR value
  recTwoPt: number;
  teReceptionBonus: number; // extra points per TE reception, on top of `reception`

  fumbleLost: number;

  fgMade0to39: number;
  fgMade40to49: number;
  fgMade50Plus: number;
  fgMissed: number;
  xpMade: number;

  defTd: number;
  defInt: number;
  defFumbleRec: number;
  defSack: number;
  defSafety: number;
  defBlockKick: number;

  // points allowed by DST, tiered
  ptsAllowed0: number;
  ptsAllowed1to6: number;
  ptsAllowed7to13: number;
  ptsAllowed14to20: number;
  ptsAllowed21to27: number;
  ptsAllowed28to34: number;
  ptsAllowed35Plus: number;

  returnTd: number; // punt/kick return TD, any position

  bonusRush100: number; // bonus for 100+ rush yards in a game
  bonusRec100: number; // bonus for 100+ receiving yards in a game
  bonusPass300: number; // bonus for 300+ passing yards in a game
}

// ESPN "standard" defaults, adjusted per our earlier recommendations:
// 0.5 PPR, TE reception premium, return TDs + yardage bonuses turned on.
export const DEFAULT_SCORING_SETTINGS: ScoringSettings = {
  passYd: 0.04, // 1 pt / 25 yds
  passTd: 4,
  passInt: -2,
  passTwoPt: 2,

  rushYd: 0.1, // 1 pt / 10 yds
  rushTd: 6,
  rushTwoPt: 2,

  recYd: 0.1, // 1 pt / 10 yds
  recTd: 6,
  reception: 0.5,
  recTwoPt: 2,
  teReceptionBonus: 0.5,

  fumbleLost: -2,

  fgMade0to39: 3,
  fgMade40to49: 4,
  fgMade50Plus: 5,
  fgMissed: -1,
  xpMade: 1,

  defTd: 6,
  defInt: 2,
  defFumbleRec: 2,
  defSack: 1,
  defSafety: 2,
  defBlockKick: 2,

  ptsAllowed0: 10,
  ptsAllowed1to6: 7,
  ptsAllowed7to13: 4,
  ptsAllowed14to20: 1,
  ptsAllowed21to27: 0,
  ptsAllowed28to34: -1,
  ptsAllowed35Plus: -4,

  returnTd: 6,

  bonusRush100: 2,
  bonusRec100: 2,
  bonusPass300: 2,
};
