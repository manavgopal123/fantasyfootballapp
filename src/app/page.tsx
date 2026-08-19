import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SignOutButton } from "@/components/sign-out-button";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">🏈 Fantasy Football League</h1>
        <p className="max-w-sm text-zinc-600 dark:text-zinc-400">
          A private league for you and your friends.
        </p>
        <div className="flex gap-3">
          <Link href="/login" className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700">
            Log in
          </Link>
          <Link href="/register" className="rounded-lg border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  const memberships = await db.leagueMember.findMany({
    where: { userId: session.user.id },
    include: { league: true },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Hey, {session.user.name?.split(" ")[0]}
        </h1>
        <SignOutButton />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Your leagues</h2>
        <Link href="/leagues/new" className="text-sm font-medium text-green-700 dark:text-green-400">
          + New league
        </Link>
      </div>

      {memberships.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No leagues yet. Create one, or ask a friend for their league link to join.
        </div>
      ) : (
        <ul className="space-y-3">
          {memberships.map((m) => (
            <li key={m.league.id}>
              <Link
                href={`/leagues/${m.league.id}`}
                className="block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-green-400 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="font-medium text-zinc-900 dark:text-zinc-50">{m.league.name}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {m.league.season} season &middot; {m.league.status}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
