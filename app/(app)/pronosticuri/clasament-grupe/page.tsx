import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isTournamentLocked, tournamentLockTime } from "@/lib/locking";
import { GroupStandingsForm } from "@/components/GroupStandingsForm";

export default async function ClasamentGrupePage() {
  const session = await auth();
  const userId = (session?.user as { id?: number } | undefined)?.id;
  if (!userId) redirect("/login");

  const [groups, predictions, lockAt] = await Promise.all([
    prisma.group.findMany({
      include: { teams: { orderBy: { pot: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.groupStandingPrediction.findMany({ where: { userId } }),
    tournamentLockTime(prisma),
  ]);

  const locked = isTournamentLocked(lockAt);

  const completedGroups = new Set<number>();
  const byGroup = new Map<number, typeof predictions>();
  for (const p of predictions) {
    const arr = byGroup.get(p.groupId) ?? [];
    arr.push(p);
    byGroup.set(p.groupId, arr);
  }
  for (const [gid, arr] of byGroup) {
    if (arr.length === 4 && new Set(arr.map((a) => a.teamId)).size === 4) {
      completedGroups.add(gid);
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-emerald-300/70">
          Pronosticuri · Clasament grupe
        </p>
        <div className="flex items-end justify-between gap-3">
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-slate-50 sm:text-4xl">
            Ordinea finală
          </h1>
          <span className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
            {completedGroups.size}/{groups.length} grupe
          </span>
        </div>
        <p className="text-sm text-slate-400">
          Plasează cele 4 echipe în ordinea finală pe care o anticipezi. 3 puncte
          per loc corect.
          {locked && (
            <span className="ml-1 text-rose-300">· Blocate</span>
          )}
        </p>
      </section>

      <nav
        aria-label="Navigație pronosticuri"
        className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em]"
      >
        <Link
          href="/pronosticuri"
          className="rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1 text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
        >
          ← Meciuri
        </Link>
        <Link
          href="/pronosticuri/bonus"
          className="rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1 text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
        >
          Bonus →
        </Link>
      </nav>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {groups.map((g) => {
          const initial = {
            1: g.teams[0]?.id ?? 0,
            2: g.teams[1]?.id ?? 0,
            3: g.teams[2]?.id ?? 0,
            4: g.teams[3]?.id ?? 0,
          } as Record<1 | 2 | 3 | 4, number>;
          for (const p of predictions.filter((pr) => pr.groupId === g.id)) {
            if (p.position >= 1 && p.position <= 4) {
              initial[p.position as 1 | 2 | 3 | 4] = p.teamId;
            }
          }
          return (
            <GroupStandingsForm
              key={g.id}
              groupId={g.id}
              groupName={g.name}
              teams={g.teams.map((t) => ({
                id: t.id,
                name: t.name,
                flagEmoji: t.flagEmoji,
              }))}
              initial={initial}
              locked={locked}
            />
          );
        })}
      </div>
    </div>
  );
}
