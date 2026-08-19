"use client";

import { useEffect, useState } from "react";

interface TeamInfo {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
}

interface PickRow {
  id: string;
  round: number;
  pickNo: number;
  teamId: string;
  playerId: string | null;
  team: { id: string; name: string; ownerId: string };
  player: { id: string; firstName: string; lastName: string; position: string; nflTeam: string | null } | null;
}

interface DraftState {
  status: string;
  picks: PickRow[];
  onClockPickNo: number | null;
  onClockTeamId: string | null;
}

interface PlayerRow {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  nflTeam: string | null;
}

const POSITIONS = ["ALL", "QB", "RB", "WR", "TE", "K", "DEF"];
const POLL_MS = 2500;

export function DraftRoom({
  leagueId,
  teams,
  currentUserId,
  isCommissioner,
  totalRounds,
}: {
  leagueId: string;
  teams: TeamInfo[];
  currentUserId: string;
  isCommissioner: boolean;
  totalRounds: number;
}) {
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("ALL");
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const teamById = new Map(teams.map((t) => [t.id, t]));
  const myTeam = teams.find((t) => t.ownerId === currentUserId);
  const pickCount = draftState?.picks.filter((p) => p.player).length ?? 0;

  // Poll draft state on a fixed interval so everyone sees picks land live.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/leagues/${leagueId}/draft`);
      if (res.ok && !cancelled) setDraftState(await res.json());
    }
    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [leagueId]);

  // Re-fetch the available-player pool whenever the filters change or the
  // draft advances (pickCount ticking up means someone else just picked).
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const qs = new URLSearchParams();
      if (search) qs.set("search", search);
      if (position !== "ALL") qs.set("position", position);
      const res = await fetch(`/api/leagues/${leagueId}/players?${qs}`);
      if (res.ok && !cancelled) setPlayers(await res.json());
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [leagueId, search, position, pickCount]);

  async function handleDraft(playerId: string) {
    setPickingId(playerId);
    setError(null);
    const res = await fetch(`/api/leagues/${leagueId}/draft/pick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    const data = await res.json();
    setPickingId(null);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    const draftRes = await fetch(`/api/leagues/${leagueId}/draft`);
    if (draftRes.ok) setDraftState(await draftRes.json());
  }

  if (!draftState) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading draft...</p>;
  }

  if (draftState.status !== "DRAFTING") {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-green-300 bg-green-50 p-4 text-sm font-medium text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300">
          Draft complete — rosters are set.
        </div>
        <DraftBoard picks={draftState.picks} teamById={teamById} />
      </div>
    );
  }

  const onClockTeam = draftState.onClockTeamId ? teamById.get(draftState.onClockTeamId) : null;
  const isMyTurn = !!myTeam && draftState.onClockTeamId === myTeam.id;
  const canDraft = isMyTurn || isCommissioner;

  return (
    <div className="space-y-6">
      <div
        className={`rounded-2xl border p-4 ${
          isMyTurn
            ? "border-green-400 bg-green-50 dark:border-green-700 dark:bg-green-950/40"
            : "border-zinc-200 dark:border-zinc-800"
        }`}
      >
        <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Pick {draftState.onClockPickNo} of {teams.length * totalRounds}
        </p>
        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {isMyTurn ? "You're on the clock!" : `${onClockTeam?.name ?? "..."} is on the clock`}
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players..."
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        >
          {POSITIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {players.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {p.firstName} {p.lastName}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {p.position}
                  {p.nflTeam ? ` · ${p.nflTeam}` : ""}
                </p>
              </div>
              <button
                onClick={() => handleDraft(p.id)}
                disabled={!canDraft || pickingId !== null}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-40"
              >
                {pickingId === p.id ? "Drafting..." : "Draft"}
              </button>
            </li>
          ))}
          {players.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No players found</li>
          )}
        </ul>
      </div>

      <DraftBoard picks={draftState.picks} teamById={teamById} />
    </div>
  );
}

function DraftBoard({ picks, teamById }: { picks: PickRow[]; teamById: Map<string, TeamInfo> }) {
  const made = [...picks].filter((p) => p.player).reverse();

  return (
    <div>
      <h2 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">Draft board</h2>
      {made.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No picks yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {made.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
            >
              <span className="w-20 shrink-0 text-zinc-500 dark:text-zinc-400">
                R{p.round} · #{p.pickNo}
              </span>
              <span className="flex-1 px-2 font-medium text-zinc-900 dark:text-zinc-50">
                {p.player?.firstName} {p.player?.lastName}{" "}
                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">({p.player?.position})</span>
              </span>
              <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{teamById.get(p.teamId)?.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
