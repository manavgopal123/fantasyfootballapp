"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StartDraftButton({ leagueId }: { leagueId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/leagues/${leagueId}/draft/start`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.push(`/leagues/${leagueId}/draft`);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleStart}
        disabled={loading}
        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "Starting..." : "Start draft"}
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
