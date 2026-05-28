import Link from "next/link";
import { redirect } from "next/navigation";
import { Round } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { isMatchLocked } from "@/lib/locking";
import { MatchCard } from "@/components/MatchCard";
import { MatchdaySaveAll } from "@/components/MatchdaySaveAll";

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
  const userId = getSessionUser(await auth())?.id;
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
        <p className="text-sm text-slate-400">
          {activeTab.sub} · pronosticurile se blochează cu o oră înainte de fluier
        </p>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CTACard
          href="/pronosticuri/clasament-grupe"
          eyebrow="Pre-turneu"
          title="Clasament grupe"
          description="Ordinea finală 1–4 în fiecare grupă. 3 puncte per loc corect."
          accent="emerald"
        />
        <CTACard
          href="/pronosticuri/bonus"
          eyebrow="Pre-turneu"
          title="Bonus"
          description="Campion, finalist, golgheter, surpriza turneului."
          accent="amber"
        />
      </section>

      <div className="relative -mx-4">
        <nav
          aria-label="Etapă"
          className="flex gap-2 overflow-x-auto px-4 pb-2 pr-12 [scroll-padding-inline:1rem] [scroll-snap-type:x_proximity] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TABS.map((t) => {
            const active = t.key === matchday;
            return (
              <Link
                key={t.key}
                href={`/pronosticuri?md=${t.key}`}
                prefetch={false}
                className={`group flex shrink-0 flex-col rounded-xl border px-3 py-1.5 text-left transition [scroll-snap-align:start] ${
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
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-slate-950 via-slate-950/80 to-transparent"
        />
      </div>

      <MatchdaySaveAll total={playable.length} />

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
                isLocked={m.status !== "SCHEDULED" || isMatchLocked(m.kickoffTime)}
              />
            );
          })}
        </div>
      )}

    </div>
  );
}

function CTACard({
  href,
  eyebrow,
  title,
  description,
  accent,
}: {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  accent: "emerald" | "amber";
}) {
  const ring = accent === "emerald" ? "ring-emerald-500/20 hover:ring-emerald-500/50" : "ring-amber-500/20 hover:ring-amber-500/50";
  const arrow = accent === "emerald" ? "text-emerald-300" : "text-amber-300";
  const stripe = accent === "emerald" ? "from-emerald-400 to-emerald-600" : "from-amber-300 to-amber-500";
  return (
    <Link
      href={href}
      className={`group relative flex flex-col gap-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 p-4 ring-1 ${ring} transition`}
    >
      <span aria-hidden className={`absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b ${stripe}`} />
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{eyebrow}</span>
      <span className="flex items-center justify-between gap-2">
        <span className="font-display text-xl font-extrabold uppercase tracking-tight text-slate-50">{title}</span>
        <span className={`text-lg ${arrow} transition group-hover:translate-x-0.5`}>→</span>
      </span>
      <span className="text-xs text-slate-400">{description}</span>
    </Link>
  );
}
