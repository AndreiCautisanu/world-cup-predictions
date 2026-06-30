import type { PrismaClient } from "@prisma/client";
import type { FdMatch } from "@/lib/football-api";
import { calculateAndStorePoints } from "@/lib/recalc";

export type SyncResult = {
  updatedMatches: number[];
  linkedExternalIds: number[];
  skipped: { id: number; reason: string }[];
};

type NullableScoreLine = { home: number | null; away: number | null };
type ScoreLine = { home: number; away: number };

function hasScoreLine(score: NullableScoreLine | undefined): score is ScoreLine {
  return (
    score?.home !== null &&
    score?.home !== undefined &&
    score.away !== null &&
    score.away !== undefined
  );
}

function matchPlayScore(score: FdMatch["score"]): ScoreLine | null {
  if (score.duration === "PENALTY_SHOOTOUT") {
    if (hasScoreLine(score.regularTime)) {
      return {
        home: score.regularTime.home + (score.extraTime?.home ?? 0),
        away: score.regularTime.away + (score.extraTime?.away ?? 0),
      };
    }

    if (hasScoreLine(score.fullTime) && hasScoreLine(score.penalties)) {
      return {
        home: score.fullTime.home - score.penalties.home,
        away: score.fullTime.away - score.penalties.away,
      };
    }
  }

  if (!hasScoreLine(score.fullTime)) return null;
  return score.fullTime;
}

/**
 * Core sync logic — shared between the cron endpoint and the test script.
 * Accepts an array of FdMatches (real or fake) and a Prisma client,
 * maps them to local matches, writes scores, and triggers recalculation.
 */
export async function processFdMatches(
  prisma: PrismaClient,
  fdMatches: FdMatch[]
): Promise<SyncResult> {
  const updatedMatches: number[] = [];
  const linkedExternalIds: number[] = [];
  const skipped: { id: number; reason: string }[] = [];

  for (const fd of fdMatches) {
    if (fd.status !== "FINISHED") continue;
    const score = matchPlayScore(fd.score);
    if (!score) {
      skipped.push({ id: fd.id, reason: "no match-play score" });
      continue;
    }
    const { home, away } = score;

    let match = await prisma.match.findUnique({
      where: { externalId: fd.id.toString() },
    });

    // Group-stage fallback: map by home+away TLA for any unlinked match.
    if (!match && fd.homeTeam.tla && fd.awayTeam.tla) {
      const homeTeam = await prisma.team.findUnique({
        where: { fifaCode: fd.homeTeam.tla },
      });
      const awayTeam = await prisma.team.findUnique({
        where: { fifaCode: fd.awayTeam.tla },
      });
      if (homeTeam && awayTeam) {
        match = await prisma.match.findFirst({
          where: { homeTeamId: homeTeam.id, awayTeamId: awayTeam.id, externalId: null },
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

    // Knockout matches: record who progressed. football-data's `winner` already
    // reflects the shootout outcome for a draw decided on penalties, so it is the
    // source of truth for the advancer. For shootouts, football-data `fullTime`
    // can include the penalty tally, so `matchPlayScore` derives the score after
    // 120 minutes and keeps draws as draws.
    const isKnockout = !["GROUP_1", "GROUP_2", "GROUP_3"].includes(match.round);
    const homeAdvanced = !isKnockout
      ? null
      : fd.score.winner === "HOME_TEAM"
        ? true
        : fd.score.winner === "AWAY_TEAM"
          ? false
          : null;

    // KO matches: fill in team ids from FD once the bracket is known.
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
      (match.wentToPens ?? false) === wentToPens &&
      match.homeAdvanced === homeAdvanced &&
      Object.keys(teamFillIn).length === 0;
    if (noChange) continue;

    await prisma.match.update({
      where: { id: match.id },
      data: { homeScore: home, awayScore: away, wentToPens, homeAdvanced, status: "FINISHED", ...teamFillIn },
    });

    await calculateAndStorePoints(prisma, match.id);
    updatedMatches.push(match.id);
  }

  return { updatedMatches, linkedExternalIds, skipped };
}
