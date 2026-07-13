export const LOCK_OFFSET_MS = 60 * 60 * 1000;

export function lockTimeFor(kickoff: Date): Date {
  return new Date(kickoff.getTime() - LOCK_OFFSET_MS);
}

export function isMatchLocked(kickoff: Date, now: Date = new Date()): boolean {
  return now.getTime() >= lockTimeFor(kickoff).getTime();
}

type FirstMatchSource = {
  match: {
    findFirst: (args: {
      orderBy: { kickoffTime: "asc" | "desc" };
      select: { kickoffTime: true };
    }) => Promise<{ kickoffTime: Date } | null>;
  };
};

export async function tournamentLockTime(
  prisma: FirstMatchSource
): Promise<Date | null> {
  const first = await prisma.match.findFirst({
    orderBy: { kickoffTime: "asc" },
    select: { kickoffTime: true },
  });
  return first?.kickoffTime ?? null;
}

export function isTournamentLocked(tournamentStart: Date | null, now: Date = new Date()): boolean {
  if (!tournamentStart) return false;
  return now.getTime() >= tournamentStart.getTime();
}
