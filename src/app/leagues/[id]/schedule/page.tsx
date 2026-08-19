import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export default async function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const league = await db.league.findUnique({ where: { id } });
  if (!league) notFound();

  const matchups = await db.matchup.findMany({
    where: { leagueId: id },
    orderBy: [{ week: "asc" }, { id: "asc" }],
    include: {
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    },
  });

  const isAllPlayStyle = league.standingsFormat === "ALL_PLAY" || league.standingsFormat === "TOTAL_POINTS";
  const weeks = [...new Set(matchups.map((m) => m.week))].sort((a, b) => a - b);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Link
        href={`/leagues/${id}`}
        className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        &larr; {league.name}
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">Schedule</h1>

      {weeks.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No schedule yet — it&apos;s generated automatically once the draft finishes.
        </p>
      ) : (
        <div className="space-y-6">
          {weeks.map((week) => {
            const weekMatchups = matchups.filter((m) => m.week === week);
            return (
              <div key={week}>
                <h2 className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">Week {week}</h2>
                {isAllPlayStyle ? (
                  <ul className="space-y-1.5">
                    {weekMatchups
                      .slice()
                      .sort((a, b) => b.homeScore - a.homeScore)
                      .map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-800"
                        >
                          <span className="font-medium text-zinc-900 dark:text-zinc-50">{m.homeTeam.name}</span>
                          <span className="text-zinc-700 dark:text-zinc-300">{m.played ? m.homeScore.toFixed(1) : "—"}</span>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <ul className="space-y-1.5">
                    {weekMatchups.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-800"
                      >
                        <span className="font-medium text-zinc-900 dark:text-zinc-50">{m.homeTeam.name}</span>
                        {m.awayTeam ? (
                          <>
                            <span className="text-xs text-zinc-400">
                              {m.played ? `${m.homeScore.toFixed(1)} - ${m.awayScore.toFixed(1)}` : "vs"}
                            </span>
                            <span className="font-medium text-zinc-900 dark:text-zinc-50">{m.awayTeam.name}</span>
                          </>
                        ) : (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">BYE</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
