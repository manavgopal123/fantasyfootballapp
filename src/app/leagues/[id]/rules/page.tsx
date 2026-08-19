import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { describeScoring } from "@/lib/scoring/describe";
import { ScoringSettings } from "@/lib/scoring/types";
import { STANDINGS_FORMATS } from "@/lib/league-formats";

export default async function LeagueRulesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const league = await db.league.findUnique({ where: { id } });
  if (!league) notFound();

  const format = STANDINGS_FORMATS.find((f) => f.value === league.standingsFormat);
  const sections = describeScoring(league.scoringSettings as unknown as ScoringSettings);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Link
        href={`/leagues/${league.id}`}
        className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        &larr; {league.name}
      </Link>

      <h1 className="mt-2 mb-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">League Rules</h1>
      <p className="mb-8 text-sm text-zinc-500 dark:text-zinc-400">
        {league.name} &middot; {league.season} season
      </p>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Standings
        </h2>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="font-medium text-zinc-900 dark:text-zinc-50">{format?.label ?? league.standingsFormat}</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{format?.description}</p>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Regular season: {league.regularSeasonWeeks} weeks.{" "}
            {league.playoffTeams > 0
              ? `Top ${league.playoffTeams} teams make the playoffs.`
              : "No playoff bracket — final standings decide the winner."}
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Scoring
        </h2>
        <div className="space-y-4">
          {sections.map((section) => (
            <div
              key={section.title}
              className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                {section.title}
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {section.rows.map((row) => (
                    <tr key={row.label} className="border-t border-zinc-100 first:border-t-0 dark:border-zinc-800">
                      <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">{row.label}</td>
                      <td className="px-4 py-2 text-right font-medium text-zinc-900 dark:text-zinc-50">
                        {row.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
