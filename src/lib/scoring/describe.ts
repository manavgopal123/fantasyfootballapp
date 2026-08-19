import { ScoringSettings } from "./types";

export interface ScoringRow {
  label: string;
  points: string;
}

export interface ScoringSection {
  title: string;
  rows: ScoringRow[];
}

function pts(n: number, suffix = "pt"): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n} ${suffix}${Math.abs(n) === 1 ? "" : "s"}`;
}

// Builds a human-readable breakdown of a league's scoring settings, grouped
// the way a rules page would present them. Zero-valued bonus fields are
// dropped so the page reflects what's actually toggled on for this league.
export function describeScoring(s: ScoringSettings): ScoringSection[] {
  const sections: ScoringSection[] = [
    {
      title: "Passing",
      rows: [
        { label: "Passing yards", points: `${pts(s.passYd * 25)} / 25 yds` },
        { label: "Passing touchdown", points: pts(s.passTd) },
        { label: "Interception thrown", points: pts(s.passInt) },
        { label: "2-point conversion", points: pts(s.passTwoPt) },
        ...(s.bonusPass300 ? [{ label: "300+ passing yards in a game", points: pts(s.bonusPass300) }] : []),
      ],
    },
    {
      title: "Rushing",
      rows: [
        { label: "Rushing yards", points: `${pts(s.rushYd * 10)} / 10 yds` },
        { label: "Rushing touchdown", points: pts(s.rushTd) },
        { label: "2-point conversion", points: pts(s.rushTwoPt) },
        ...(s.bonusRush100 ? [{ label: "100+ rushing yards in a game", points: pts(s.bonusRush100) }] : []),
      ],
    },
    {
      title: "Receiving",
      rows: [
        { label: "Reception (PPR)", points: s.reception === 0 ? "Not scored" : pts(s.reception) },
        { label: "Receiving yards", points: `${pts(s.recYd * 10)} / 10 yds` },
        { label: "Receiving touchdown", points: pts(s.recTd) },
        { label: "2-point conversion", points: pts(s.recTwoPt) },
        ...(s.teReceptionBonus
          ? [{ label: "TE premium (extra, per TE reception)", points: pts(s.teReceptionBonus) }]
          : []),
        ...(s.bonusRec100 ? [{ label: "100+ receiving yards in a game", points: pts(s.bonusRec100) }] : []),
      ],
    },
    {
      title: "Misc",
      rows: [
        { label: "Fumble lost", points: pts(s.fumbleLost) },
        ...(s.returnTd
          ? [{ label: "Punt/kick return touchdown", points: pts(s.returnTd) }]
          : [{ label: "Punt/kick return touchdowns", points: "Not scored" }]),
      ],
    },
    {
      title: "Kicking",
      rows: [
        { label: "Field goal made, 0-39 yds", points: pts(s.fgMade0to39) },
        { label: "Field goal made, 40-49 yds", points: pts(s.fgMade40to49) },
        { label: "Field goal made, 50+ yds", points: pts(s.fgMade50Plus) },
        { label: "Field goal missed", points: pts(s.fgMissed) },
        { label: "Extra point made", points: pts(s.xpMade) },
      ],
    },
    {
      title: "Defense / Special Teams",
      rows: [
        { label: "Defensive/ST touchdown", points: pts(s.defTd) },
        { label: "Interception", points: pts(s.defInt) },
        { label: "Fumble recovery", points: pts(s.defFumbleRec) },
        { label: "Sack", points: pts(s.defSack) },
        { label: "Safety", points: pts(s.defSafety) },
        { label: "Blocked kick", points: pts(s.defBlockKick) },
        { label: "Points allowed: 0", points: pts(s.ptsAllowed0) },
        { label: "Points allowed: 1-6", points: pts(s.ptsAllowed1to6) },
        { label: "Points allowed: 7-13", points: pts(s.ptsAllowed7to13) },
        { label: "Points allowed: 14-20", points: pts(s.ptsAllowed14to20) },
        { label: "Points allowed: 21-27", points: pts(s.ptsAllowed21to27) },
        { label: "Points allowed: 28-34", points: pts(s.ptsAllowed28to34) },
        { label: "Points allowed: 35+", points: pts(s.ptsAllowed35Plus) },
      ],
    },
  ];

  return sections;
}
