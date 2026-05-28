import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { isMatchLocked } from "@/lib/locking";
import { buildMatchPredictionUpsertData } from "@/lib/predictions";

const schema = z.object({
  matchId: z.number().int(),
  homeScore: z.number().int().min(0).max(20),
  awayScore: z.number().int().min(0).max(20),
  predictsEt: z.boolean().optional(),
  predictsPens: z.boolean().optional(),
});

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

  const match = await prisma.match.findUnique({
    where: { id: parsed.data.matchId },
    select: {
      id: true,
      kickoffTime: true,
      round: true,
      status: true,
      homeTeamId: true,
      awayTeamId: true,
    },
  });
  if (!match) {
    return NextResponse.json({ error: "Meci inexistent" }, { status: 404 });
  }

  // Knockout slots are seeded with null team IDs until the bracket resolves.
  // Reject predictions for unresolved slots so the UI's placeholder rendering
  // is also enforced server-side.
  if (match.homeTeamId === null || match.awayTeamId === null) {
    return NextResponse.json(
      { error: "Echipele acestui meci nu sunt încă cunoscute" },
      { status: 409 }
    );
  }

  // Belt-and-braces with the time lock: if an admin enters a result before
  // the scheduled kickoff (manual override or demo data), the match flips to
  // FINISHED with a future kickoff. The time lock wouldn't fire yet, so a
  // user could see the actual score and update their prediction to match —
  // and a subsequent recalc would award them perfect points. Locking on
  // status closes that gap.
  if (match.status !== "SCHEDULED") {
    return NextResponse.json(
      { error: "Meciul a început sau s-a încheiat — pronosticul e blocat" },
      { status: 403 }
    );
  }

  if (isMatchLocked(match.kickoffTime)) {
    return NextResponse.json({ error: "Pronosticul e blocat" }, { status: 403 });
  }

  const data = buildMatchPredictionUpsertData(match.round, parsed.data);

  await prisma.matchPrediction.upsert({
    where: {
      userId_matchId: { userId, matchId: parsed.data.matchId },
    },
    update: data,
    create: { userId, matchId: parsed.data.matchId, ...data },
  });

  return NextResponse.json({ ok: true });
}
