"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TradeActions({
  leagueId,
  tradeId,
  mode,
}: {
  leagueId: string;
  tradeId: string;
  mode: "respond" | "cancel";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(action: "accept" | "reject") {
    setLoading(action);
    setError(null);
    const res = await fetch(`/api/leagues/${leagueId}/trades/${tradeId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  async function cancel() {
    setLoading("cancel");
    setError(null);
    const res = await fetch(`/api/leagues/${leagueId}/trades/${tradeId}/cancel`, { method: "POST" });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-2">
        {mode === "respond" ? (
          <>
            <button
              onClick={() => respond("accept")}
              disabled={loading !== null}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading === "accept" ? "Accepting..." : "Accept"}
            </button>
            <button
              onClick={() => respond("reject")}
              disabled={loading !== null}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {loading === "reject" ? "Rejecting..." : "Reject"}
            </button>
          </>
        ) : (
          <button
            onClick={cancel}
            disabled={loading !== null}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {loading === "cancel" ? "Cancelling..." : "Cancel trade"}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
