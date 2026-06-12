import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { fetchWorldCupMatches } from "@/lib/football-api";
import { processFdMatches } from "@/lib/sync";

function constantTimeEqual(a: string, b: string): boolean {
  // Length-mismatched strings can't equal but timingSafeEqual throws on
  // mismatch — pad to the longer length so the comparison runs the same
  // number of bytes regardless and the boolean carries the real answer.
  const len = Math.max(a.length, b.length);
  const ab = Buffer.alloc(len);
  const bb = Buffer.alloc(len);
  ab.write(a);
  bb.write(b);
  return timingSafeEqual(ab, bb) && a.length === b.length;
}

// Middleware lets this through without a session — we authenticate the cron
// caller here via a shared bearer secret.
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (!constantTimeEqual(authHeader, `Bearer ${expected}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Skip the football-data.org call entirely when no match is in an active
  // window. "Active" = kickoff was within the last 3 hours (covers 90-min
  // regular + ET + pens + feed delay) OR kicks off in the next 30 minutes
  // (catches late-starting matches and pre-populates KO team data).
  const now = new Date();
  const windowStart = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 30 * 60 * 1000);
  const activeCount = await prisma.match.count({
    where: { status: { not: "FINISHED" }, kickoffTime: { gte: windowStart, lte: windowEnd } },
  });
  if (activeCount === 0) {
    return NextResponse.json({ ok: true, synced: false });
  }

  let fdMatches;
  try {
    fdMatches = await fetchWorldCupMatches();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }

  const result = await processFdMatches(prisma, fdMatches);
  return NextResponse.json({ ok: true, synced: true, ...result, skipped: result.skipped.length });
}
