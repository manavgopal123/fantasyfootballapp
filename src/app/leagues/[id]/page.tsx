import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeStandings } from "@/lib/standings";
import { JoinLeagueForm } from "@/components/join-league-form";
import { CopyLinkButton } from "@/components/copy-link-button";
import { StartDraftButton } from "@/components/start-draft-button";
import { SyncScoresButton } from "@/components/sync-scores-button";
import { LockRuleSettings } from "@/components/lock-rule-settings";

const FORMAT_LABELS: Record<string, string> = {
  HEAD_TO_HEAD: "Head-to-Head",
  HEAD_TO_HEAD_MEDIAN: "Head-to-Head + Median",
  ALL_PLAY: "All-Play",
  TOTAL_POINTS: "Total Points",
};

export default async function LeaguePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const league = await db.league.findUnique({
    where: { id },
    include: {
      teams: { include: { owner: { select: { name: true } } } },
      commissioner: { select: { name: true, id: true } },
      matchups: true,
    },
  });
  if (!league) notFound();

  const isMember = session?.user
    ? await db.leagueMember.findUnique({
        where: { leagueId_userId: { leagueId: id, userId: session.user.id } },
      })
    : null;

  const standings = computeStandings(
    league.standingsFormat,
    league.teams.map((t) => t.id),
    league.matchups
  );
  const standingsByTeam = new Map(standings.map((s) => [s.teamId, s]));
  const hasSchedule = league.matchups.length > 0;
  const hasScores = league.matchups.some((m) => m.played);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100">
        &larr; Your leagues
      </Link>

      <div className="mt-2 mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{league.name}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {league.season} season &middot; {FORMAT_LABELS[league.standingsFormat]} &middot; Commissioner: {league.commissioner.name}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <CopyLinkButton path={`/leagues/${league.id}`} />
          <Link
            href={`/leagues/${league.id}/rules`}
            className="text-xs font-medium text-green-700 dark:text-green-400"
          >
            View rules
          </Link>
        </div>
      </div>

      {!isMember && session?.user && (
        <div className="mb-6 rounded-2xl border border-green-300 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/40">
          <p className="mb-3 text-sm font-medium text-zinc-800 dark:text-zinc-100">
            You&apos;re not in this league yet — join it below.
          </p>
          <JoinLeagueForm leagueId={league.id} />
        </div>
      )}

      {league.status === "SETUP" && isMember && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">Draft hasn&apos;t started</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {league.teams.length} team{league.teams.length === 1 ? "" : "s"} joined
            </p>
          </div>
          {session?.user?.id === league.commissionerId ? (
            <StartDraftButton leagueId={league.id} />
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Waiting on the commissioner</p>
          )}
        </div>
      )}

      {(league.status === "DRAFTING" || league.status === "ACTIVE" || league.status === "COMPLETE") &&
        isMember && (
          <Link
            href={`/leagues/${league.id}/draft`}
            className="mb-6 flex items-center justify-between rounded-2xl border border-green-300 bg-green-50 p-4 text-sm font-medium text-green-800 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300"
          >
            {league.status === "DRAFTING" ? "Draft in progress — enter the draft room" : "View draft results"}
            <span aria-hidden>&rarr;</span>
          </Link>
        )}

      {(league.status === "DRAFTING" || league.status === "ACTIVE" || league.status === "COMPLETE") &&
        session?.user?.id === league.commissionerId && (
          <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
              Each player&apos;s lineup slot locks when their own game kicks off. This fallback deadline only
              applies when we don&apos;t have real game-time data yet.
            </p>
            <LockRuleSettings leagueId={league.id} lockDayOfWeek={league.lockDayOfWeek} lockHour={league.lockHour} />
          </div>
        )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Standings {!hasScores && "(season hasn't started)"}
        </h2>
        {hasSchedule && (
          <Link href={`/leagues/${league.id}/schedule`} className="text-xs font-medium text-green-700 dark:text-green-400">
            Full schedule
          </Link>
        )}
      </div>

      {league.status === "ACTIVE" && session?.user?.id === league.commissionerId && (
        <div className="mb-4 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
            No cron job set up yet — pull this week&apos;s stats and recompute scores manually.
          </p>
          <SyncScoresButton leagueId={league.id} />
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-2">Team</th>
              {league.standingsFormat !== "TOTAL_POINTS" && <th className="px-4 py-2">W-L-T</th>}
              <th className="px-4 py-2 text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {league.teams.map((team) => {
              const s = standingsByTeam.get(team.id);
              return (
                <tr key={team.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-2">
                    <Link href={`/leagues/${league.id}/teams/${team.id}`} className="font-medium text-zinc-900 hover:text-green-700 dark:text-zinc-50 dark:hover:text-green-400">
                      {team.name}
                    </Link>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{team.owner.name}</div>
                  </td>
                  {league.standingsFormat !== "TOTAL_POINTS" && (
                    <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">
                      {s ? `${s.wins}-${s.losses}-${s.ties}` : "0-0-0"}
                    </td>
                  )}
                  <td className="px-4 py-2 text-right text-zinc-700 dark:text-zinc-300">
                    {s ? s.pointsFor.toFixed(1) : "0.0"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
        Members ({league.teams.length})
      </h2>
      <ul className="space-y-2">
        {league.teams.map((team) => (
          <li key={team.id} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800">
            <Link href={`/leagues/${league.id}/teams/${team.id}`} className="font-medium text-zinc-900 hover:text-green-700 dark:text-zinc-50 dark:hover:text-green-400">
              {team.name}
            </Link>{" "}
            <span className="text-zinc-500 dark:text-zinc-400">— {team.owner.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
