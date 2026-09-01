import { NextResponse } from "next/server";
import { syncPlayers } from "@/lib/sleeper/sync";
import { isSyncAuthorized } from "@/lib/sync-auth";

export async function POST(req: Request) {
  if (!(await isSyncAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const count = await syncPlayers();
  return NextResponse.json({ synced: count });
}
