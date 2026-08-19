"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RosterPlayer {
  playerId: string;
  label: string;
}

interface TeamOption {
  id: string;
  name: string;
  roster: RosterPlayer[];
}

export function TradeProposalForm({
  leagueId,
  myTeam,
  otherTeams,
}: {
  leagueId: string;
  myTeam: TeamOption;
  otherTeams: TeamOption[];
}) {
  const router = useRouter();
  const [otherTeamId, setOtherTeamId] = useState(otherTeams[0]?.id ?? "");
  const [offer, setOffer] = useState<Set<string>>(new Set());
  const [request, setRequest] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otherTeam = otherTeams.find((t) => t.id === otherTeamId);

  function toggle(set: Set<string>, setSet: (s: Set<string>) => void, playerId: string) {
    const next = new Set(set);
    if (next.has(playerId)) next.delete(playerId);
    else next.add(playerId);
    setSet(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (offer.size === 0 || request.size === 0) {
      setError("Select at least one player from each side.");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/leagues/${leagueId}/trades`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proposingTeamId: myTeam.id,
        receivingTeamId: otherTeamId,
        offerPlayerIds: [...offer],
        requestPlayerIds: [...request],
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.push(`/leagues/${leagueId}/trades`);
  }

  if (otherTeams.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">No other teams to trade with yet.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Trade with</label>
        <select
          value={otherTeamId}
          onChange={(e) => {
            setOtherTeamId(e.target.value);
            setRequest(new Set());
          }}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        >
          {otherTeams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            You give
          </h3>
          <div className="space-y-1.5">
            {myTeam.roster.map((p) => (
              <label
                key={p.playerId}
                className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <input
                  type="checkbox"
                  checked={offer.has(p.playerId)}
                  onChange={() => toggle(offer, setOffer, p.playerId)}
                />
                {p.label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            You get
          </h3>
          <div className="space-y-1.5">
            {otherTeam?.roster.map((p) => (
              <label
                key={p.playerId}
                className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <input
                  type="checkbox"
                  checked={request.has(p.playerId)}
                  onChange={() => toggle(request, setRequest, p.playerId)}
                />
                {p.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "Proposing..." : "Propose trade"}
      </button>
    </form>
  );
}
