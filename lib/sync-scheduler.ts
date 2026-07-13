import { prisma } from "@/lib/prisma";
import { fetchWorldCupMatches } from "@/lib/football-api";
import { processFdMatches } from "@/lib/sync";

// Poll this often during an active match window.
const POLL_MS = 2 * 60 * 1000;

// Mirror the same active-window logic used by the /api/admin/sync-results
// endpoint so the scheduler and the cron backup stay consistent.
async function runSync() {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 30 * 60 * 1000);

  const activeCount = await prisma.match.count({
    where: {
      status: { not: "FINISHED" },
      kickoffTime: { gte: windowStart, lte: windowEnd },
    },
  });

  if (activeCount === 0) return;

  console.log(`[sync-scheduler] ${activeCount} active match(es) — fetching results`);
  const fdMatches = await fetchWorldCupMatches();
  const result = await processFdMatches(prisma, fdMatches);
  if (result.updatedMatches.length > 0) {
    console.log(`[sync-scheduler] updated match ids: ${result.updatedMatches.join(", ")}`);
  }
}

export function startMatchSyncScheduler() {
  let running = false;

  async function tick() {
    if (running) return;
    running = true;
    try {
      await runSync();
    } catch (err) {
      console.error("[sync-scheduler]", err);
    } finally {
      running = false;
    }
  }

  // Short delay so the server finishes initialising (DB pool ready, env loaded)
  // before the first DB query.
  setTimeout(() => {
    tick();
    setInterval(tick, POLL_MS);
  }, 15_000);

  console.log("[sync-scheduler] started — polling every 2 min during match windows");
}
