import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { isMatchLocked } from "@/lib/locking";
import { shapeParticipants } from "@/lib/match-board";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const meId = getSessionUser(await auth())?.id;
  if (!meId) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const { matchId: raw } = await params;
  if (!/^\d+$/.test(raw)) {
    return NextResponse.json({ error: "Meci invalid" }, { status: 400 });
  }
  const matchId = Number.parseInt(raw, 10);

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      round: true,
      status: true,
      kickoffTime: true,
      homeScore: true,
      awayScore: true,
      wentToEt: true,
      wentToPens: true,
      homeTeam: { select: { name: true, flagEmoji: true } },
      awayTeam: { select: { name: true, flagEmoji: true } },
    },
  });
  if (!match) {
    return NextResponse.json({ error: "Meci inexistent" }, { status: 404 });
  }

  // Fairness gate: never reveal others' picks before the match locks. Mirrors
  // the rule used on the Pronosticuri page and /jucator.
  const locked = match.status !== "SCHEDULED" || isMatchLocked(match.kickoffTime);
  if (!locked) {
    return NextResponse.json({ error: "Meciul nu este blocat încă" }, { status: 403 });
  }

  const rows = await prisma.matchPrediction.findMany({
    where: { matchId },
    select: {
      userId: true,
      homeScore: true,
      awayScore: true,
      predictsEt: true,
      predictsPens: true,
      pointsAwarded: true,
      user: { select: { username: true, firstName: true, lastName: true } },
    },
  });

  const final =
    match.status === "FINISHED" && match.homeScore !== null && match.awayScore !== null;

  return NextResponse.json({
    match: {
      id: match.id,
      round: match.round,
      status: match.status,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      final,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      wentToEt: match.wentToEt,
      wentToPens: match.wentToPens,
    },
    participants: shapeParticipants(rows, meId),
  });
}
