import { auth } from "@/lib/auth";

// These sync routes pull public NFL data and are safe to call repeatedly,
// but shouldn't be open to anyone on the internet. Allow either the cron
// job (CRON_SECRET bearer token) or any signed-in user (covers the in-app
// "Sync scores" button, which relies on the session cookie).
export async function isSyncAuthorized(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }
  const session = await auth();
  return Boolean(session?.user);
}
