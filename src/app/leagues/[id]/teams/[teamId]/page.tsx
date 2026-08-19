import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { RosterManager } from "@/components/roster-manager";
import { FreeAgency } from "@/components/free-agency";
import { getCurrentWeek, isPlayerLocked } from "@/lib/lock";
import { totalRosterSize, RosterSlotsConfig } from "@/lib/roster-config";

export default async function TeamRosterPage({
  params,
}: {
  params: Promise<{ id: string; teamId: string }>;
}) {
  const { id, teamId } = await params;
  const session = await auth();

  const team = await db.team.findUnique({
    where: { id: teamId },
    include: {
      league: true,
      owner: { select: { name: true } },
      roster: { include: { player: true } },
    },
  });
  if (!team || team.leagueId !== id) notFound();

  const canEdit = session?.user?.id === team.ownerId || session?.user?.id === team.league.commissionerId;

  const currentWeek = await getCurrentWeek(id);
  const fallbackRule = { lockDayOfWeek: team.league.lockDayOfWeek, lockHour: team.league.lockHour };
  const lockByPlayerId = new Map<string, boolean>();
  if (currentWeek !== null) {
    for (const entry of team.roster) {
      lockByPlayerId.set(
        entry.playerId,
        await isPlayerLocked(entry.player.nflTeam, team.league.season, currentWeek, fallbackRule)
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Link
        href={`/leagues/${id}`}
        className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        &larr; {team.league.name}
      </Link>
      <h1 className="mt-2 mb-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{team.name}</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">{team.owner.name}</p>

      {team.roster.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No players on this roster yet.</p>
      ) : (
        <RosterManager
          leagueId={id}
          teamId={teamId}
          entries={team.roster.map((r) => ({
            id: r.id,
            playerId: r.playerId,
            slot: r.slot,
            locked: lockByPlayerId.get(r.playerId) ?? false,
            player: {
              firstName: r.player.firstName,
              lastName: r.player.lastName,
              position: r.player.position,
              nflTeam: r.player.nflTeam,
            },
          }))}
          canEdit={canEdit}
        />
      )}

      {canEdit && (
        <>
          <h2 className="mt-8 mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">Free agents</h2>
          <FreeAgency
            leagueId={id}
            teamId={teamId}
            rosterFull={team.roster.length >= totalRosterSize(team.league.rosterSlots as RosterSlotsConfig)}
            dropOptions={team.roster
              .filter((r) => !(lockByPlayerId.get(r.playerId) ?? false))
              .map((r) => ({
                playerId: r.playerId,
                label: `${r.player.firstName} ${r.player.lastName} (${r.slot})`,
              }))}
          />
        </>
      )}
    </div>
  );
}
