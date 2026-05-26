import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isTournamentLocked, tournamentLockTime } from "@/lib/locking";
import { validateStandingsSelection } from "@/lib/standings";

const schema = z.object({
  groupId: z.number().int(),
  standings: z
    .array(
      z.object({
        position: z.number().int().min(1).max(4),
        teamId: z.number().int(),
      })
    )
    .length(4),
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: number } | undefined)?.id;
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

  const lockAt = await tournamentLockTime(prisma);
  if (isTournamentLocked(lockAt)) {
    return NextResponse.json(
      { error: "Pronosticurile sunt blocate" },
      { status: 403 }
    );
  }

  const teamsInGroup = await prisma.team.findMany({
    where: { groupId: parsed.data.groupId },
    select: { id: true },
  });
  if (teamsInGroup.length === 0) {
    return NextResponse.json({ error: "Grupă inexistentă" }, { status: 404 });
  }

  const validation = validateStandingsSelection(
    parsed.data.standings,
    teamsInGroup.map((t) => t.id)
  );
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.standings.map((s) =>
      prisma.groupStandingPrediction.upsert({
        where: {
          userId_groupId_position: {
            userId,
            groupId: parsed.data.groupId,
            position: s.position,
          },
        },
        update: { teamId: s.teamId },
        create: {
          userId,
          groupId: parsed.data.groupId,
          position: s.position,
          teamId: s.teamId,
        },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
