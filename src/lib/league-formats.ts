export const STANDINGS_FORMATS = [
  {
    value: "HEAD_TO_HEAD",
    label: "Head-to-Head",
    description: "Scheduled weekly matchups. Standard win/loss record, playoffs at the end.",
  },
  {
    value: "HEAD_TO_HEAD_MEDIAN",
    label: "Head-to-Head + Median",
    description: "Normal weekly matchups, plus a bonus win/loss vs. the league's median score each week.",
  },
  {
    value: "ALL_PLAY",
    label: "All-Play",
    description: "Every team is scored against every other team each week. No schedule luck.",
  },
  {
    value: "TOTAL_POINTS",
    label: "Total Points",
    description: "No matchups — pure cumulative points leaderboard.",
  },
] as const;
