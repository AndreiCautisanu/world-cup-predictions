import Link from "next/link";
import type { Round } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_MATCH_ROUND } from "@/lib/round-defaults";
import { AdminResultRow } from "./AdminResultRow";

const TABS: { key: Round; label: string; sub: string }[] = [
  { key: "GROUP_1", label: "Etapa 1", sub: "Grupe" },
  { key: "GROUP_2", label: "Etapa 2", sub: "Grupe" },
  { key: "GROUP_3", label: "Etapa 3", sub: "Grupe" },
  { key: "R32", label: "Șaisprezecimi", sub: "32" },
  { key: "R16", label: "Optimi", sub: "16" },
  { key: "QF", label: "Sferturi", sub: "8" },
  { key: "SF", label: "Semifinale", sub: "4" },
  { key: "THIRD_PLACE", label: "Locul 3", sub: "1" },
  { key: "FINAL", label: "Finala", sub: "1" },
];

function isRound(value: string | undefined): value is Round {
  return !!value && TABS.some((t) => t.key === value);
}

export default async function AdminRezultate({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>;
}) {
  const params = await searchParams;
  const round: Round = isRound(params.round) ? params.round : DEFAULT_MATCH_ROUND;
  const activeTab = TABS.find((t) => t.key === round)!;

  const matches = await prisma.match.findMany({
    where: { round },
    include: { homeTeam: true, awayTeam: true, group: true },
    orderBy: { kickoffTime: "asc" },
  });

  const allTeams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, flagEmoji: true },
  });

  const finishedCount = matches.filter((m) => m.status === "FINISHED").length;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-rose-300/80">
          Admin · Rezultate
        </p>
        <div className="flex items-end justify-between gap-3">
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-slate-50 sm:text-4xl">
            {activeTab.label}
          </h1>
          <span className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
            {finishedCount}/{matches.length} încheiate
          </span>
        </div>
        <p className="text-sm text-slate-400">
          Introdu scorul final. Punctele se recalculează imediat pentru toți utilizatorii.
        </p>
      </section>

      <div className="relative -mx-4">
        <nav
          aria-label="Etapă"
          className="flex gap-2 overflow-x-auto px-4 pb-2 pr-12 [scroll-padding-inline:1rem] [scroll-snap-type:x_proximity] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TABS.map((t) => {
            const active = t.key === round;
            return (
              <Link
                key={t.key}
                href={`/admin/rezultate?round=${t.key}`}
                prefetch={false}
                className={`group flex shrink-0 flex-col rounded-xl border px-3 py-1.5 text-left transition [scroll-snap-align:start] ${
                  active
                    ? "border-rose-400/60 bg-rose-500/10 text-rose-100 shadow-[0_0_0_1px_rgba(244,63,94,0.4)]"
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

      {matches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center text-sm text-slate-500">
          Niciun meci în această etapă.
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => (
            <AdminResultRow
              key={m.id}
              match={{
                id: m.id,
                round: m.round,
                kickoffTime: m.kickoffTime.toISOString(),
                slotDescription: m.slotDescription,
                groupName: m.group?.name ?? null,
                homeTeam: m.homeTeam
                  ? { id: m.homeTeam.id, name: m.homeTeam.name, flagEmoji: m.homeTeam.flagEmoji }
                  : null,
                awayTeam: m.awayTeam
                  ? { id: m.awayTeam.id, name: m.awayTeam.name, flagEmoji: m.awayTeam.flagEmoji }
                  : null,
                homeTeamId: m.homeTeamId,
                awayTeamId: m.awayTeamId,
                homeScore: m.homeScore,
                awayScore: m.awayScore,
                wentToEt: m.wentToEt,
                wentToPens: m.wentToPens,
                status: m.status,
              }}
              allTeams={allTeams}
            />
          ))}
        </div>
      )}
    </div>
  );
}
