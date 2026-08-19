"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncScoresButton({ leagueId }: { leagueId: string }) {
  const router = useRouter();
  const [week, setWeek] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setError(null);
    setDone(null);

    // Pull the latest raw NFL stats for the week first, then turn them into
    // fantasy points for this league. Safe to re-run during game day.
    const statsRes = await fetch("/api/sync/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week }),
    });
    if (!statsRes.ok) {
      setLoading(false);
      setError("Couldn't fetch stats for that week.");
      return;
    }

    const res = await fetch(`/api/leagues/${leagueId}/scoring/compute-week`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setDone(`Synced week ${week} — ${data.matchupsUpdated} matchups updated.`);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-xs text-zinc-500 dark:text-zinc-400">
        Week
        <input
          type="number"
          min={1}
          value={week}
          onChange={(e) => setWeek(Number(e.target.value))}
          className="ml-2 w-16 rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </label>
      <button
        onClick={handleSync}
        disabled={loading}
        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "Syncing..." : "Sync scores"}
      </button>
      {error && <p className="w-full text-xs text-red-600 dark:text-red-400">{error}</p>}
      {done && <p className="w-full text-xs text-green-700 dark:text-green-400">{done}</p>}
    </div>
  );
}
