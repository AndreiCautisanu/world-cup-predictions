import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { matchPredictionTier, MATCH_TIER_LABEL } from "@/lib/match-tier";
import { FlagImage } from "@/components/FlagImage";

export const dynamic = "force-dynamic";

// Group-stage rounds first, then knockout, matching the public Meciuri order.
const ROUND_ORDER = [
  "GROUP_1", "GROUP_2", "GROUP_3", "R32", "R16", "QF", "SF", "THIRD_PLACE", "FINAL",
] as const;

const ROUND_LABEL: Record<string, string> = {
  GROUP_1: "Etapa 1", GROUP_2: "Etapa 2", GROUP_3: "Etapa 3",
  R32: "Șaisprezecimi", R16: "Optimi", QF: "Sferturi",
  SF: "Semifinale", THIRD_PLACE: "Locul 3", FINAL: "Finala",
};

export default async function AdminUserDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId < 1) notFound();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      matchPredictions: {
        include: {
          match: { include: { homeTeam: true, awayTeam: true, group: true } },
        },
      },
      groupStandingPredictions: {
        include: { group: true, team: true },
        orderBy: [{ groupId: "asc" }, { position: "asc" }],
      },
      bonusPrediction: {
        include: { champion: true, runnerUp: true, darkHorse: true },
      },
    },
  });
  if (!user) notFound();

  // Sort match predictions by round order, then kickoff time.
  const matchPreds = [...user.matchPredictions].sort((a, b) => {
    const ra = ROUND_ORDER.indexOf(a.match.round as (typeof ROUND_ORDER)[number]);
    const rb = ROUND_ORDER.indexOf(b.match.round as (typeof ROUND_ORDER)[number]);
    if (ra !== rb) return ra - rb;
    return a.match.kickoffTime.getTime() - b.match.kickoffTime.getTime();
  });

  // Group standings bucketed by group name.
  const standingsByGroup = new Map<string, typeof user.groupStandingPredictions>();
  for (const p of user.groupStandingPredictions) {
    const key = p.group.name;
    const arr = standingsByGroup.get(key) ?? [];
    arr.push(p);
    standingsByGroup.set(key, arr);
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const bonus = user.bonusPrediction;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <Link
          href="/admin/utilizatori"
          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 transition hover:text-slate-200"
        >
          ← Înapoi
        </Link>
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-rose-300/80">
          Admin · Pronosticuri
        </p>
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-slate-50 sm:text-4xl">
          {user.username}
        </h1>
        {fullName && <p className="text-sm text-slate-400">{fullName}</p>}
      </section>

      {/* Match predictions */}
      <section className="space-y-3">
        <h2 className="font-display text-xs font-bold uppercase tracking-[0.32em] text-slate-300">
          Meciuri
        </h2>
        {matchPreds.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-4 text-sm text-slate-500">
            Niciun pronostic
          </p>
        ) : (
          <ul className="space-y-2">
            {matchPreds.map((p) => {
              const tier = matchPredictionTier(p.pointsAwarded, p.match.round);
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/40 px-4 py-2"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {ROUND_LABEL[p.match.round] ?? p.match.round}
                  </span>
                  <span className="flex flex-1 flex-wrap items-center justify-center gap-1 text-center text-sm text-slate-100">
                    {p.match.homeTeam && <FlagImage emoji={p.match.homeTeam.flagEmoji} className="h-4 w-auto" />}
                    {p.match.homeTeam?.name ?? "—"}{" "}
                    <strong className="tabular-nums">{p.homeScore}–{p.awayScore}</strong>{" "}
                    {p.match.awayTeam?.name ?? "—"}
                    {p.match.awayTeam && <FlagImage emoji={p.match.awayTeam.flagEmoji} className="h-4 w-auto" />}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {p.pointsAwarded == null
                      ? MATCH_TIER_LABEL[tier]
                      : `${p.pointsAwarded} pct · ${MATCH_TIER_LABEL[tier]}`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Group standings */}
      <section className="space-y-3">
        <h2 className="font-display text-xs font-bold uppercase tracking-[0.32em] text-slate-300">
          Clasament grupe
        </h2>
        {standingsByGroup.size === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-4 text-sm text-slate-500">
            Niciun pronostic
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {[...standingsByGroup.entries()].map(([groupName, rows]) => (
              <div
                key={groupName}
                className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3"
              >
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Grupa {groupName}
                </p>
                <ol className="space-y-1">
                  {[...rows]
                    .sort((a, b) => a.position - b.position)
                    .map((r) => (
                      <li key={r.id} className="flex items-center gap-2 text-sm text-slate-100">
                        <span className="w-4 text-slate-500">{r.position}.</span>
                        <FlagImage emoji={r.team.flagEmoji} className="h-4 w-auto shrink-0" />
                        <span>{r.team.name}</span>
                        {r.pointsAwarded != null && (
                          <span className="ml-auto text-[10px] uppercase tracking-[0.18em] text-slate-500">
                            {r.pointsAwarded} pct
                          </span>
                        )}
                      </li>
                    ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bonus */}
      <section className="space-y-3">
        <h2 className="font-display text-xs font-bold uppercase tracking-[0.32em] text-slate-300">
          Bonus
        </h2>
        {!bonus ? (
          <p className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-4 text-sm text-slate-500">
            Niciun pronostic
          </p>
        ) : (
          <ul className="space-y-2">
            {(
              [
                { label: "Campioană", team: bonus.champion, pts: bonus.championPts },
                { label: "Finalistă", team: bonus.runnerUp, pts: bonus.runnerUpPts },
                { label: "Surpriză", team: bonus.darkHorse, pts: bonus.darkHorsePts },
              ] as const
            ).map((b) => (
              <li
                key={b.label}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/40 px-4 py-2"
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {b.label}
                </span>
                <span className="flex flex-1 items-center justify-center gap-1.5 text-sm text-slate-100">
                  <FlagImage emoji={b.team.flagEmoji} className="h-4 w-auto shrink-0" />
                  {b.team.name}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {b.pts == null ? "—" : `${b.pts} pct`}
                </span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/40 px-4 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Golgheter
              </span>
              <span className="flex-1 text-center text-sm text-slate-100">{bonus.topScorerName}</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {bonus.topScorerPts == null ? "—" : `${bonus.topScorerPts} pct`}
              </span>
            </li>
          </ul>
        )}
      </section>
    </div>
  );
}
