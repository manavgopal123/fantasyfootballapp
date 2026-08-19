"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STANDINGS_FORMATS } from "@/lib/league-formats";

export default function NewLeaguePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [season, setSeason] = useState(new Date().getFullYear());
  const [standingsFormat, setStandingsFormat] = useState("HEAD_TO_HEAD_MEDIAN");
  const [ppr, setPpr] = useState(0.5);
  const [tePremium, setTePremium] = useState(true);
  const [returnTds, setReturnTds] = useState(true);
  const [yardageBonuses, setYardageBonuses] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/leagues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, teamName, season, standingsFormat, ppr, tePremium, returnTds, yardageBonuses }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.push(`/leagues/${data.id}`);
  }

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Create a league</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">League name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. The League of Ordinary Gentlemen"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Your team name</label>
          <input
            required
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Season</label>
          <input
            type="number"
            required
            value={season}
            onChange={(e) => setSeason(Number(e.target.value))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Standings format</label>
          <div className="space-y-2">
            {STANDINGS_FORMATS.map((f) => (
              <label
                key={f.value}
                className={`block cursor-pointer rounded-xl border p-3 text-sm ${
                  standingsFormat === f.value
                    ? "border-green-500 bg-green-50 dark:bg-green-950/40"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="format"
                    checked={standingsFormat === f.value}
                    onChange={() => setStandingsFormat(f.value)}
                  />
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">{f.label}</span>
                </div>
                <p className="mt-1 pl-6 text-xs text-zinc-500 dark:text-zinc-400">{f.description}</p>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Points per reception</label>
          <select
            value={ppr}
            onChange={(e) => setPpr(Number(e.target.value))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value={0}>Standard (0 PPR)</option>
            <option value={0.5}>Half PPR (0.5)</option>
            <option value={1}>Full PPR (1.0)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" checked={tePremium} onChange={(e) => setTePremium(e.target.checked)} />
            TE premium (+0.5 pt per TE reception)
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" checked={returnTds} onChange={(e) => setReturnTds(e.target.checked)} />
            Score punt/kick return touchdowns (+6 pt)
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" checked={yardageBonuses} onChange={(e) => setYardageBonuses(e.target.checked)} />
            Yardage bonuses (+2 pt for 100+ rush, 100+ rec, or 300+ pass yds)
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create league"}
        </button>
      </form>
    </div>
  );
}
