import Link from "next/link";
import type { Round } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isMatchLocked } from "@/lib/locking";
import { DEFAULT_MATCH_ROUND } from "@/lib/round-defaults";
import { FlagImage } from "@/components/FlagImage";

export const dynamic = "force-dynamic";

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

const DAY_FMT = new Intl.DateTimeFormat("ro-RO", {
  weekday: "short",
  day: "2-digit",
  month: "short",
});
const TIME_FMT = new Intl.DateTimeFormat("ro-RO", {
  hour: "2-digit",
  minute: "2-digit",
});
const DATE_KEY_FMT = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" });

export default async function MeciuriPage({
  searchParams,
}: {
  searchParams: Promise<{ md?: string }>;
}) {
  const params = await searchParams;
  const round: Round = isRound(params.md) ? params.md : DEFAULT_MATCH_ROUND;
  const activeTab = TABS.find((t) => t.key === round)!;

  const matches = await prisma.match.findMany({
    where: { round },
    include: { homeTeam: true, awayTeam: true, group: true },
    orderBy: { kickoffTime: "asc" },
  });

  const totalFinished = matches.filter((m) => m.status === "FINISHED").length;
  const totalScheduled = matches.length - totalFinished;

  // Group matches by calendar day for date dividers
  const groupedByDay = matches.reduce<Map<string, typeof matches>>((acc, m) => {
    const key = DATE_KEY_FMT.format(m.kickoffTime);
    const bucket = acc.get(key);
    if (bucket) bucket.push(m);
    else acc.set(key, [m]);
    return acc;
  }, new Map());

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-300/70">
          Calendar & rezultate
        </p>
        <div className="flex items-end justify-between gap-3">
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-slate-50 sm:text-4xl">
            {activeTab.label}
          </h1>
          <span className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
            {totalFinished}/{matches.length} disputate
          </span>
        </div>
        <p className="text-sm text-slate-400">
          {activeTab.sub} ·{" "}
          {totalScheduled === 0 && totalFinished > 0
            ? "rundă încheiată"
            : `${totalScheduled} de jucat`}
        </p>
      </header>

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
                href={`/meciuri?md=${t.key}`}
                prefetch={false}
                className={`group flex shrink-0 flex-col rounded-xl border px-3 py-1.5 text-left transition [scroll-snap-align:start] ${
                  active
                    ? "border-amber-400/60 bg-amber-500/10 text-amber-200 shadow-[0_0_0_1px_rgba(245,158,11,0.4)]"
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
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-10 text-center text-sm text-slate-500">
          Niciun meci în această rundă (încă).
        </div>
      ) : (
        <div className="space-y-6">
          {[...groupedByDay.entries()].map(([dayKey, ms]) => {
            const day = new Date(`${dayKey}T00:00:00`);
            return (
              <section key={dayKey} className="space-y-2">
                <h2 className="flex items-baseline gap-3 px-1">
                  <span className="font-display text-xs font-bold uppercase tracking-[0.32em] text-slate-300">
                    {DAY_FMT.format(day)}
                  </span>
                  <span className="h-px flex-1 bg-gradient-to-r from-slate-800 via-slate-800/30 to-transparent" aria-hidden />
                </h2>
                <ul className="space-y-2">
                  {ms.map((m) => (
                    <MatchRow
                      key={m.id}
                      match={{
                        kickoffTime: m.kickoffTime,
                        round: m.round,
                        status: m.status,
                        groupName: m.group?.name ?? null,
                        slotDescription: m.slotDescription,
                        homeTeam: m.homeTeam ? { name: m.homeTeam.name, flagEmoji: m.homeTeam.flagEmoji } : null,
                        awayTeam: m.awayTeam ? { name: m.awayTeam.name, flagEmoji: m.awayTeam.flagEmoji } : null,
                        homeScore: m.homeScore,
                        awayScore: m.awayScore,
                        wentToEt: m.wentToEt,
                        wentToPens: m.wentToPens,
                      }}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

type RoundKey = Round;

type MatchRowData = {
  kickoffTime: Date;
  round: RoundKey;
  status: "SCHEDULED" | "LIVE" | "FINISHED";
  groupName: string | null;
  slotDescription: string | null;
  homeTeam: { name: string; flagEmoji: string } | null;
  awayTeam: { name: string; flagEmoji: string } | null;
  homeScore: number | null;
  awayScore: number | null;
  wentToEt: boolean | null;
  wentToPens: boolean | null;
};

function MatchRow({ match }: { match: MatchRowData }) {
  const finished = match.status === "FINISHED" && match.homeScore !== null && match.awayScore !== null;
  const live = match.status === "LIVE";
  const locked = !finished && !live && isMatchLocked(match.kickoffTime);
  const isPlaceholder = !match.homeTeam || !match.awayTeam;

  const meta = match.groupName
    ? `Grupa ${match.groupName}`
    : match.slotDescription ?? roundLabel(match.round);

  return (
    <li className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/40">
      <div className="flex items-center gap-3 border-b border-slate-800/60 bg-slate-900/40 px-4 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
          {TIME_FMT.format(match.kickoffTime)}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">·</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{meta}</span>
        <span className="ml-auto">
          <StatusPill status={finished ? "FINISHED" : live ? "LIVE" : locked ? "LOCKED" : "SCHEDULED"} />
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3 sm:gap-4">
        <TeamSide team={match.homeTeam} align="right" isPlaceholder={isPlaceholder} />
        <Scoreboard match={match} finished={finished} />
        <TeamSide team={match.awayTeam} align="left" isPlaceholder={isPlaceholder} />
      </div>

      {finished && (match.wentToEt || match.wentToPens) && (
        <div className="border-t border-slate-800/60 bg-slate-900/30 px-4 py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-300/90">
          {match.wentToPens ? "Decis la penalty-uri" : "Prelungit până în prelungiri"}
        </div>
      )}
    </li>
  );
}

function TeamSide({
  team,
  align,
  isPlaceholder,
}: {
  team: { name: string; flagEmoji: string } | null;
  align: "left" | "right";
  isPlaceholder: boolean;
}) {
  const alignment = align === "right" ? "justify-end text-right" : "justify-start text-left";
  if (!team) {
    return (
      <div className={`flex items-center gap-2 ${alignment}`}>
        <span className="font-display text-sm font-semibold uppercase tracking-wide text-slate-500">
          {isPlaceholder ? "Necunoscut" : "—"}
        </span>
      </div>
    );
  }
  return (
    <div className={`flex min-w-0 items-center gap-2 ${alignment}`}>
      {align === "left" && <FlagImage emoji={team.flagEmoji} className="h-5 w-auto shrink-0" />}
      <span className="font-display truncate text-base font-semibold uppercase tracking-wide text-slate-100 sm:text-lg">
        {team.name}
      </span>
      {align === "right" && <FlagImage emoji={team.flagEmoji} className="h-5 w-auto shrink-0" />}
    </div>
  );
}

function Scoreboard({ match, finished }: { match: MatchRowData; finished: boolean }) {
  if (!finished) {
    return (
      <div className="flex h-12 w-14 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 sm:w-16">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">vs</span>
      </div>
    );
  }
  return (
    <div className="flex h-12 w-14 items-center justify-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-400/20 sm:w-16">
      <span className="font-display text-xl font-extrabold leading-none tabular-nums">{match.homeScore}</span>
      <span className="font-display text-base font-bold leading-none text-emerald-400/60">·</span>
      <span className="font-display text-xl font-extrabold leading-none tabular-nums">{match.awayScore}</span>
    </div>
  );
}

function StatusPill({ status }: { status: "FINISHED" | "LIVE" | "LOCKED" | "SCHEDULED" }) {
  const styles: Record<typeof status, { label: string; className: string }> = {
    FINISHED: { label: "Final", className: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30" },
    LIVE: { label: "Live", className: "bg-rose-500/15 text-rose-200 ring-rose-400/40 animate-pulse" },
    LOCKED: { label: "Blocat", className: "bg-amber-500/15 text-amber-200 ring-amber-400/30" },
    SCHEDULED: { label: "Programat", className: "bg-slate-800/80 text-slate-300 ring-slate-700/60" },
  };
  const s = styles[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ring-1 ${s.className}`}>
      {s.label}
    </span>
  );
}

function roundLabel(round: Round): string {
  return TABS.find((t) => t.key === round)?.label ?? round;
}
