import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TradeProposalForm } from "@/components/trade-proposal-form";

export default async function NewTradePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const league = await db.league.findUnique({
    where: { id },
    include: { teams: { include: { roster: { include: { player: true } } } } },
  });
  if (!league) notFound();

  const myTeam = league.teams.find((t) => t.ownerId === session.user.id);
  if (!myTeam) redirect(`/leagues/${id}`);

  const toOption = (t: (typeof league.teams)[number]) => ({
    id: t.id,
    name: t.name,
    roster: t.roster.map((r) => ({
      playerId: r.playerId,
      label: `${r.player.firstName} ${r.player.lastName} (${r.player.position}${r.player.nflTeam ? ` · ${r.player.nflTeam}` : ""})`,
    })),
  });

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Link
        href={`/leagues/${id}/trades`}
        className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        &larr; Trades
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">Propose a Trade</h1>

      <TradeProposalForm
        leagueId={id}
        myTeam={toOption(myTeam)}
        otherTeams={league.teams.filter((t) => t.id !== myTeam.id).map(toOption)}
      />
    </div>
  );
}
