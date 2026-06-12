export async function register() {
  // Only run in the long-lived Node.js server process, not during builds or
  // in Edge middleware workers.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startMatchSyncScheduler } = await import("./lib/sync-scheduler");
    startMatchSyncScheduler();
  }
}
