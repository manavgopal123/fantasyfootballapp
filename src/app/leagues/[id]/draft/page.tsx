import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DraftRoom } from "@/components/draft-room";
import { totalRosterSize, RosterSlotsConfig } from "@/lib/roster-config";

export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const league = await db.league.findUnique({
    where: { id },
    include: { teams: { include: { owner: { select: { name: true } } } } },
  });
  if (!league) notFound();

  const isMember = await db.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: id, userId: session.user.id } },
  });
  if (!isMember) redirect(`/leagues/${id}`);
  if (league.status === "SETUP") redirect(`/leagues/${id}`);

  const teams = league.teams.map((t) => ({
    id: t.id,
    name: t.name,
    ownerId: t.ownerId,
    ownerName: t.owner.name,
  }));
  const totalRounds = totalRosterSize(league.rosterSlots as RosterSlotsConfig);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Link
        href={`/leagues/${id}`}
        className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        &larr; {league.name}
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">Draft Room</h1>

      <DraftRoom
        leagueId={id}
        teams={teams}
        currentUserId={session.user.id}
        isCommissioner={session.user.id === league.commissionerId}
        totalRounds={totalRounds}
      />
    </div>
  );
}
