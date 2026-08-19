"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isSlotEligible } from "@/lib/roster-config";
import { RosterSlot } from "@/generated/prisma/enums";

interface Entry {
  id: string;
  playerId: string;
  slot: RosterSlot;
  locked: boolean;
  player: { firstName: string; lastName: string; position: string; nflTeam: string | null };
}

const SLOT_ORDER: RosterSlot[] = ["QB", "RB", "WR", "TE", "FLEX", "SUPERFLEX", "DST", "K", "BENCH", "IR"];

export function RosterManager({
  leagueId,
  teamId,
  entries,
  canEdit,
}: {
  leagueId: string;
  teamId: string;
  entries: Entry[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSwap(playerIdA: string, playerIdB: string) {
    setSwappingId(playerIdA);
    setError(null);
    const res = await fetch(`/api/leagues/${leagueId}/teams/${teamId}/roster/swap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerIdA, playerIdB }),
    });
    const data = await res.json();
    setSwappingId(null);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  const grouped = SLOT_ORDER.map((slot) => ({ slot, rows: entries.filter((e) => e.slot === slot) })).filter(
    (g) => g.rows.length > 0
  );

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {grouped.map(({ slot, rows }) => (
        <div key={slot}>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {slot}
          </h3>
          <ul className="space-y-1.5">
            {rows.map((entry) => {
              const partners = entries.filter(
                (e) =>
                  e.id !== entry.id &&
                  !e.locked &&
                  isSlotEligible(entry.player.position, e.slot) &&
                  isSlotEligible(e.player.position, entry.slot)
              );
              return (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-800"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {entry.player.firstName} {entry.player.lastName}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {entry.player.position}
                      {entry.player.nflTeam ? ` · ${entry.player.nflTeam}` : ""}
                      {entry.locked && <span className="ml-1.5 text-amber-600 dark:text-amber-400">🔒 Locked</span>}
                    </p>
                  </div>
                  {canEdit && !entry.locked && partners.length > 0 && (
                    <select
                      value=""
                      disabled={swappingId !== null}
                      onChange={(e) => {
                        if (e.target.value) handleSwap(entry.playerId, e.target.value);
                      }}
                      className="rounded-lg border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    >
                      <option value="">Swap with...</option>
                      {partners.map((p) => (
                        <option key={p.id} value={p.playerId}>
                          {p.player.firstName} {p.player.lastName} ({p.slot})
                        </option>
                      ))}
                    </select>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
