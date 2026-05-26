import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchWorldCupMatches } from "@/lib/football-api";
import { processFdMatches } from "@/lib/sync";

// Middleware lets this through without a session — we authenticate the cron
// caller here via a shared bearer secret. Pattern: Railway cron is configured
// with `Authorization: Bearer $CRON_SECRET`.
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  return NextResponse.json({ ok: true, ...result, skipped: result.skipped.length });
}
