import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TradeActions } from "@/components/trade-actions";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export default async function TradesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const league = await db.league.findUnique({ where: { id }, include: { teams: true } });
  if (!league) notFound();

  const myTeam = session?.user ? league.teams.find((t) => t.ownerId === session.user.id) : undefined;

  const trades = await db.trade.findMany({
    where: { leagueId: id },
    orderBy: { createdAt: "desc" },
    include: {
      proposingTeam: { select: { id: true, name: true } },
      receivingTeam: { select: { id: true, name: true } },
      items: { include: { player: { select: { firstName: true, lastName: true, position: true } } } },
    },
  });

  function itemsFor(trade: (typeof trades)[number], teamId: string) {
    return trade.items
      .filter((i) => i.fromTeamId === teamId)
      .map((i) => `${i.player.firstName} ${i.player.lastName} (${i.player.position})`)
      .join(", ");
  }

  const pendingForMe = myTeam ? trades.filter((t) => t.status === "PENDING" && t.receivingTeamId === myTeam.id) : [];
  const pendingSentByMe = myTeam ? trades.filter((t) => t.status === "PENDING" && t.proposingTeamId === myTeam.id) : [];
  const otherPending = trades.filter(
    (t) => t.status === "PENDING" && !pendingForMe.includes(t) && !pendingSentByMe.includes(t)
  );
  const history = trades.filter((t) => t.status !== "PENDING");

  function TradeCard({ trade, action }: { trade: (typeof trades)[number]; action?: React.ReactNode }) {
    return (
      <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex items-center justify-between text-sm">
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {trade.proposingTeam.name} &harr; {trade.receivingTeam.name}
          </p>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{STATUS_LABELS[trade.status]}</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-zinc-600 dark:text-zinc-400">
          <div>
            <span className="font-medium text-zinc-500 dark:text-zinc-400">{trade.proposingTeam.name} sends:</span>{" "}
            {itemsFor(trade, trade.proposingTeamId) || "—"}
          </div>
          <div>
            <span className="font-medium text-zinc-500 dark:text-zinc-400">{trade.receivingTeam.name} sends:</span>{" "}
            {itemsFor(trade, trade.receivingTeamId) || "—"}
          </div>
        </div>
        {action}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Link href={`/leagues/${id}`} className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100">
        &larr; {league.name}
      </Link>
      <div className="mt-2 mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Trades</h1>
        {myTeam && (
          <Link
            href={`/leagues/${id}/trades/new`}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
          >
            + Propose trade
          </Link>
        )}
      </div>

      {pendingForMe.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">Needs your response</h2>
          <div className="space-y-3">
            {pendingForMe.map((t) => (
              <TradeCard key={t.id} trade={t} action={<TradeActions leagueId={id} tradeId={t.id} mode="respond" />} />
            ))}
          </div>
        </section>
      )}

      {pendingSentByMe.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">Sent by you</h2>
          <div className="space-y-3">
            {pendingSentByMe.map((t) => (
              <TradeCard key={t.id} trade={t} action={<TradeActions leagueId={id} tradeId={t.id} mode="cancel" />} />
            ))}
          </div>
        </section>
      )}

      {otherPending.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">Other pending trades</h2>
          <div className="space-y-3">
            {otherPending.map((t) => (
              <TradeCard key={t.id} trade={t} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No completed trades yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((t) => (
              <TradeCard key={t.id} trade={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
