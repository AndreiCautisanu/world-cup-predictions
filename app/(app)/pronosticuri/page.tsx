import Link from "next/link";
import { redirect } from "next/navigation";
import { Round } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isMatchLocked } from "@/lib/locking";
import { MatchCard } from "@/components/MatchCard";

const TABS: { key: Round; label: string; sub: string }[] = [
  { key: "GROUP_1", label: "Etapa 1", sub: "Grupe" },
  { key: "GROUP_2", label: "Etapa 2", sub: "Grupe" },
  { key: "GROUP_3", label: "Etapa 3", sub: "Grupe" },
  { key: "R32", label: "Șaisprezecimi", sub: "32 echipe" },
  { key: "R16", label: "Optimi", sub: "16 echipe" },
  { key: "QF", label: "Sferturi", sub: "8 echipe" },
  { key: "SF", label: "Semifinale", sub: "4 echipe" },
  { key: "THIRD_PLACE", label: "Locul 3", sub: "1 meci" },
  { key: "FINAL", label: "Finala", sub: "1 meci" },
];

function isRound(value: string | undefined): value is Round {
  return !!value && TABS.some((t) => t.key === value);
}

export default async function PronosticuriPage({
  searchParams,
}: {
  searchParams: Promise<{ md?: string }>;
}) {
  const session = await auth();
  const userId = (session?.user as { id?: number } | undefined)?.id;
  if (!userId) redirect("/login");

  const params = await searchParams;
  const matchday: Round = isRound(params.md) ? params.md : "GROUP_1";
  const activeTab = TABS.find((t) => t.key === matchday)!;

  const matches = await prisma.match.findMany({
    where: { round: matchday },
    include: {
      homeTeam: true,
      awayTeam: true,
      group: true,
      predictions: { where: { userId } },
    },
    orderBy: { kickoffTime: "asc" },
  });

  const playable = matches.filter((m) => m.homeTeam && m.awayTeam);
  const totalPredictions = playable.filter((m) => m.predictions.length > 0).length;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-emerald-300/70">
          Pronosticuri · Meciuri
        </p>
        <div className="flex items-end justify-between gap-3">
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-slate-50 sm:text-4xl">
            {activeTab.label}
          </h1>
          <span className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
            {totalPredictions}/{playable.length} salvate
          </span>
        </div>
        <p className="text-sm text-slate-400">{activeTab.sub} · pronosticurile se blochează cu o oră înainte de fluier</p>
      </section>

      <nav
        aria-label="Etapă"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map((t) => {
          const active = t.key === matchday;
          return (
            <Link
              key={t.key}
              href={`/pronosticuri?md=${t.key}`}
              prefetch={false}
              scroll={false}
              className={`group flex shrink-0 flex-col rounded-xl border px-3 py-1.5 text-left transition ${
                active
                  ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.4)]"
                  : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              <span className="text-[10px] uppercase tracking-[0.18em] opacity-70">{t.sub}</span>
              <span className="font-display text-sm font-semibold uppercase tracking-wide">{t.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-wrap gap-2 text-xs">
        <Link
          href="/pronosticuri/clasament-grupe"
          className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/40 px-3 py-1 text-slate-300 transition hover:border-emerald-500/40 hover:text-emerald-300"
        >
          Clasament grupe →
        </Link>
        <Link
          href="/pronosticuri/bonus"
          className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/40 px-3 py-1 text-slate-300 transition hover:border-emerald-500/40 hover:text-emerald-300"
        >
          Bonus →
        </Link>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center text-sm text-slate-500">
          Nicio etapă de pronosticat aici (încă).
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => {
            const userPred = m.predictions[0];
            return (
              <MatchCard
                key={m.id}
                matchId={m.id}
                homeTeam={
                  m.homeTeam
                    ? { name: m.homeTeam.name, flagEmoji: m.homeTeam.flagEmoji }
                    : null
                }
                awayTeam={
                  m.awayTeam
                    ? { name: m.awayTeam.name, flagEmoji: m.awayTeam.flagEmoji }
                    : null
                }
                kickoffTime={m.kickoffTime}
                slotDescription={m.slotDescription}
                groupName={m.group?.name ?? null}
                round={m.round}
                initialHome={userPred?.homeScore ?? null}
                initialAway={userPred?.awayScore ?? null}
                initialPredictsEt={userPred?.predictsEt ?? null}
                initialPredictsPens={userPred?.predictsPens ?? null}
                pointsAwarded={userPred?.pointsAwarded ?? null}
                isLocked={isMatchLocked(m.kickoffTime)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
