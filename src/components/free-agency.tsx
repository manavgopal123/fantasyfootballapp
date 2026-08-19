"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface PlayerRow {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  nflTeam: string | null;
}

interface RosterOption {
  playerId: string;
  label: string;
}

const POSITIONS = ["ALL", "QB", "RB", "WR", "TE", "K", "DEF"];

export function FreeAgency({
  leagueId,
  teamId,
  rosterFull,
  dropOptions,
}: {
  leagueId: string;
  teamId: string;
  rosterFull: boolean;
  dropOptions: RosterOption[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("ALL");
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [dropChoice, setDropChoice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
  }, [leagueId, search, position, refreshKey]);

  async function handleAdd(addPlayerId: string, dropPlayerId?: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/leagues/${leagueId}/teams/${teamId}/roster/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addPlayerId, dropPlayerId }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setAddingId(null);
    setDropChoice("");
    setRefreshKey((k) => k + 1);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search free agents..."
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        >
          {POSITIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {players.map((p) => (
          <li key={p.id} className="px-4 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {p.firstName} {p.lastName}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {p.position}
                  {p.nflTeam ? ` · ${p.nflTeam}` : ""}
                </p>
              </div>
              {addingId !== p.id && (
                <button
                  onClick={() => (rosterFull ? setAddingId(p.id) : handleAdd(p.id))}
                  disabled={busy}
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-40"
                >
                  Add
                </button>
              )}
            </div>
            {addingId === p.id && (
              <div className="mt-2 flex items-center gap-2">
                <select
                  value={dropChoice}
                  onChange={(e) => setDropChoice(e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="">Drop who?</option>
                  {dropOptions.map((o) => (
                    <option key={o.playerId} value={o.playerId}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => dropChoice && handleAdd(p.id, dropChoice)}
                  disabled={busy || !dropChoice}
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-40"
                >
                  Confirm
                </button>
                <button
                  onClick={() => {
                    setAddingId(null);
                    setDropChoice("");
                  }}
                  className="text-xs text-zinc-500 dark:text-zinc-400"
                >
                  Cancel
                </button>
              </div>
            )}
          </li>
        ))}
        {players.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No free agents found</li>
        )}
      </ul>
    </div>
  );
}
