import { NextResponse } from "next/server";
import { syncPlayers } from "@/lib/sleeper/sync";

export async function POST() {
  const count = await syncPlayers();
  return NextResponse.json({ synced: count });
}
