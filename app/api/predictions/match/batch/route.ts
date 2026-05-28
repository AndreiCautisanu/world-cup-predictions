import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { isMatchLocked } from "@/lib/locking";
import { buildMatchPredictionUpsertData } from "@/lib/predictions";

const itemSchema = z.object({
  matchId: z.number().int(),
  homeScore: z.number().int().min(0).max(20),
  awayScore: z.number().int().min(0).max(20),
  predictsEt: z.boolean().optional(),
  predictsPens: z.boolean().optional(),
});

const schema = z.object({
  predictions: z.array(itemSchema).min(1).max(64),
});

// Called by the "Salvează tot" toolbar. Single round-trip instead of N parallel
// POSTs to /api/predictions/match. Each prediction is validated against its
// match individually; locked / unresolved / nonexistent matches are skipped
// and returned in the response so the client can mark just those cards.
export async function POST(req: Request) {
  const userId = getSessionUser(await auth())?.id;
  if (!userId) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Date invalide" },
      { status: 400 }
    );
  }

  const matchIds = [...new Set(parsed.data.predictions.map((p) => p.matchId))];
  const matches = await prisma.match.findMany({
    where: { id: { in: matchIds } },
    select: {
      id: true,
      kickoffTime: true,
      round: true,
      homeTeamId: true,
      awayTeamId: true,
    },
  });
  const matchById = new Map(matches.map((m) => [m.id, m]));

  const saved: number[] = [];
  const skipped: { matchId: number; reason: string }[] = [];

  // Process sequentially to keep memory + DB pool footprint flat. 64 is the
  // upper bound; group matchday 1 has 24 group matches → well within budget.
  for (const item of parsed.data.predictions) {
    const match = matchById.get(item.matchId);
    if (!match) {
      skipped.push({ matchId: item.matchId, reason: "missing" });
      continue;
    }
    if (match.homeTeamId === null || match.awayTeamId === null) {
      skipped.push({ matchId: item.matchId, reason: "unresolved" });
      continue;
    }
    if (isMatchLocked(match.kickoffTime)) {
      skipped.push({ matchId: item.matchId, reason: "locked" });
      continue;
    }

    const data = buildMatchPredictionUpsertData(match.round, item);
    await prisma.matchPrediction.upsert({
      where: { userId_matchId: { userId, matchId: item.matchId } },
      update: data,
      create: { userId, matchId: item.matchId, ...data },
    });
    saved.push(item.matchId);
  }

  return NextResponse.json({ ok: true, saved, skipped });
}
