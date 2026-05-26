import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchWorldCupMatches, type FdMatch } from "@/lib/football-api";
import { calculateAndStorePoints } from "@/lib/recalc";

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

  let fdMatches: FdMatch[];
  try {
    fdMatches = await fetchWorldCupMatches();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }

  const updatedMatches: number[] = [];
  const linkedExternalIds: number[] = [];
  const skipped: { id: number; reason: string }[] = [];

  for (const fd of fdMatches) {
    if (fd.status !== "FINISHED") continue;
    const home = fd.score.fullTime.home;
    const away = fd.score.fullTime.away;
    if (home === null || away === null) {
      skipped.push({ id: fd.id, reason: "no full-time score" });
      continue;
    }

    let match = await prisma.match.findUnique({
      where: { externalId: fd.id.toString() },
    });

    // Group-stage fallback: map by team TLA + an unlinked match in our DB.
    if (!match && fd.homeTeam.tla && fd.awayTeam.tla) {
      const homeTeam = await prisma.team.findUnique({
        where: { fifaCode: fd.homeTeam.tla },
      });
      const awayTeam = await prisma.team.findUnique({
        where: { fifaCode: fd.awayTeam.tla },
      });
      if (homeTeam && awayTeam) {
        match = await prisma.match.findFirst({
          where: {
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            externalId: null,
          },
        });
        if (match) {
          await prisma.match.update({
            where: { id: match.id },
            data: { externalId: fd.id.toString() },
          });
          linkedExternalIds.push(fd.id);
        }
      }
    }

    if (!match) {
      skipped.push({ id: fd.id, reason: "no matching local match" });
      continue;
    }

    const wentToPens = fd.score.duration === "PENALTY_SHOOTOUT";
    const wentToEt = wentToPens || fd.score.duration === "EXTRA_TIME";

    // KO matches: if our DB hasn't received the teams yet, fill them in from FD.
    const teamFillIn: { homeTeamId?: number; awayTeamId?: number } = {};
    if (match.homeTeamId === null && fd.homeTeam.tla) {
      const t = await prisma.team.findUnique({ where: { fifaCode: fd.homeTeam.tla } });
      if (t) teamFillIn.homeTeamId = t.id;
    }
    if (match.awayTeamId === null && fd.awayTeam.tla) {
      const t = await prisma.team.findUnique({ where: { fifaCode: fd.awayTeam.tla } });
      if (t) teamFillIn.awayTeamId = t.id;
    }

    const noChange =
      match.status === "FINISHED" &&
      match.homeScore === home &&
      match.awayScore === away &&
      (match.wentToEt ?? false) === wentToEt &&
      (match.wentToPens ?? false) === wentToPens &&
      Object.keys(teamFillIn).length === 0;
    if (noChange) continue;

    await prisma.match.update({
      where: { id: match.id },
      data: {
        homeScore: home,
        awayScore: away,
        wentToEt,
        wentToPens,
        status: "FINISHED",
        ...teamFillIn,
      },
    });

    await calculateAndStorePoints(prisma, match.id);
    updatedMatches.push(match.id);
  }

  return NextResponse.json({
    ok: true,
    updatedMatches,
    linkedExternalIds,
    skipped: skipped.length,
  });
}
