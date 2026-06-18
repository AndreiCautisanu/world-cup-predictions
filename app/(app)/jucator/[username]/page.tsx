import Link from "next/link";
import { notFound } from "next/navigation";
import type { Round } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { FlagImage } from "@/components/FlagImage";
import { isMatchLocked, LOCK_OFFSET_MS, tournamentLockTime } from "@/lib/locking";
import { buildDisplayName, summarizeLeaderboardRows } from "@/lib/leaderboard";
import { matchPredictionTier, MATCH_TIER_LABEL, type MatchTier } from "@/lib/match-tier";
import { TIER_TILE } from "@/lib/tier-styles";

const TIER_EYEBROW: Record<MatchTier, string> = {
  none: "text-slate-500",
  miss: "text-rose-300/80",
  partial: "text-amber-300/80",
  close: "text-sky-300/80",
  exact: "text-emerald-300/80",
  perfect: "text-yellow-200/90",
};
const TIER_BADGE: Record<MatchTier, string> = {
  none: "border-slate-700/60 bg-slate-900/60 text-slate-500",
  miss: "border-rose-500/40 bg-rose-500/15 text-rose-200",
  partial: "border-amber-500/40 bg-amber-500/15 text-amber-200",
  close: "border-sky-500/40 bg-sky-500/15 text-sky-200",
  exact: "border-emerald-400/50 bg-emerald-500/20 text-emerald-200",
  perfect:
    "border-yellow-300/60 bg-yellow-400/20 text-yellow-100 shadow-[0_0_18px_-2px_rgba(250,204,21,0.45)]",
};

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

const ROUND_LABELS: Record<Round, string> = {
  GROUP_1: "Etapa 1",
  GROUP_2: "Etapa 2",
  GROUP_3: "Etapa 3",
  R32: "Șaisprezecimi",
  R16: "Optimi",
  QF: "Sferturi",
  SF: "Semifinale",
  THIRD_PLACE: "Locul 3",
  FINAL: "Finala",
};

const KICKOFF_FMT = new Intl.DateTimeFormat("ro-RO", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Bucharest",
});

function isRound(value: string | undefined): value is Round {
  return !!value && TABS.some((t) => t.key === value);
}

export default async function JucatorPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ md?: string; tab?: string }>;
}) {
  const { username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername);

  const sp = await searchParams;
  const matchday: Round = isRound(sp.md) ? sp.md : "GROUP_2";
  const activeTabDef = TABS.find((t) => t.key === matchday)!;
  const section = sp.tab ?? "meciuri";

  const meId = getSessionUser(await auth())?.id;

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, firstName: true, lastName: true, createdAt: true },
  });
  if (!user) notFound();

  const isMe = meId === user.id;
  const displayName = buildDisplayName(user);
  const now = new Date();
  const lockCutoff = new Date(now.getTime() + LOCK_OFFSET_MS);

  // Tournament lock — controls visibility of bonus + standings.
  const tournamentStart = await tournamentLockTime(prisma);
  const anyGroupFinished = await prisma.match.findFirst({
    where: { round: { in: ["GROUP_1", "GROUP_2", "GROUP_3"] }, status: "FINISHED" },
    select: { id: true },
  });
  const tournamentStarted =
    (tournamentStart !== null && isMatchLocked(tournamentStart, now)) || anyGroupFinished !== null;

  // Totals from ALL predictions for the header score.
  const [matchPredsAll, standingsAll, bonusAll] = await Promise.all([
    prisma.matchPrediction.findMany({
      where: { userId: user.id },
      select: { pointsAwarded: true, match: { select: { round: true } } },
    }),
    prisma.groupStandingPrediction.findMany({
      where: { userId: user.id },
      select: { pointsAwarded: true },
    }),
    prisma.bonusPrediction.findUnique({
      where: { userId: user.id },
      select: {
        championPts: true,
        runnerUpPts: true,
        topScorerPts: true,
        darkHorsePts: true,
      },
    }),
  ]);
  const [totals] = summarizeLeaderboardRows([
    {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      matchPredictions: matchPredsAll,
      groupStandingPredictions: standingsAll,
      bonusPrediction: bonusAll,
    },
  ]);

  // All matches for the selected round, ordered by kickoff time.
  const matches = await prisma.match.findMany({
    where: { round: matchday },
    include: { homeTeam: true, awayTeam: true, group: true },
    orderBy: { kickoffTime: "asc" },
  });

  // User's predictions for the selected round (only locked/finished matches are visible).
  const predRows = await prisma.matchPrediction.findMany({
    where: {
      userId: user.id,
      match: {
        round: matchday,
        OR: [{ kickoffTime: { lte: lockCutoff } }, { status: "FINISHED" }],
      },
    },
    select: {
      matchId: true,
      homeScore: true,
      awayScore: true,
      predictsEt: true,
      predictsPens: true,
      pointsAwarded: true,
    },
  });
  const predByMatchId = new Map(predRows.map((p) => [p.matchId, p]));

  // Bonus + standings (only if tournament started).
  const bonus = tournamentStarted
    ? await prisma.bonusPrediction.findUnique({
        where: { userId: user.id },
        include: { champion: true, runnerUp: true, darkHorse: true },
      })
    : null;

  const standings = tournamentStarted
    ? await prisma.groupStandingPrediction.findMany({
        where: { userId: user.id },
        include: { team: true, group: true },
        orderBy: [{ group: { name: "asc" } }, { position: "asc" }],
      })
    : [];

  const standingsByGroup = standings.reduce<Map<string, typeof standings>>((acc, p) => {
    const key = p.group.name;
    const bucket = acc.get(key);
    if (bucket) bucket.push(p);
    else acc.set(key, [p]);
    return acc;
  }, new Map());

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Link
          href="/clasament"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 transition hover:text-slate-300"
        >
          <svg aria-hidden viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 10H5M9 5l-4 5 4 5" />
          </svg>
          Înapoi la clasament
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-emerald-300/70">
              Jucător
            </p>
            <h1 className="font-display break-words text-4xl font-extrabold uppercase leading-[1.05] tracking-tight text-slate-50 sm:text-5xl">
              {displayName}
            </h1>
            <p className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>@{user.username}</span>
              {isMe && (
                <span className="rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
                  tu
                </span>
              )}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="font-display text-5xl font-extrabold leading-none text-slate-50 sm:text-6xl">
              {totals?.total ?? 0}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">
              puncte
            </p>
          </div>
        </div>
      </header>

      {/* Section switcher */}
      <div className="flex gap-2">
        {(["meciuri", "grupe", "bonus"] as const).map((s) => (
          <Link
            key={s}
            href={`?md=${matchday}&tab=${s}`}
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
              section === s
                ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
                : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
            }`}
          >
            {s === "meciuri" ? "Meciuri" : s === "grupe" ? "Clasament grupe" : "Bonus"}
          </Link>
        ))}
      </div>

      {section === "meciuri" && (
        <>
          {/* Round tab nav */}
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
                    href={`?md=${t.key}&tab=meciuri`}
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

          {matches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center text-sm text-slate-500">
              Nicio etapă de afișat (încă).
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((m) => {
                const isVisible =
                  m.kickoffTime <= lockCutoff || m.status === "FINISHED" || m.status === "LIVE";
                const pred = isVisible ? (predByMatchId.get(m.id) ?? null) : null;
                const isPlaceholder = !m.homeTeam || !m.awayTeam;

                return (
                  <MatchRow
                    key={m.id}
                    match={m}
                    prediction={pred}
                    isVisible={isVisible}
                    isPlaceholder={isPlaceholder}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {section === "grupe" && (
        <section className="space-y-3">
          {!tournamentStarted ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
              <p className="font-display text-lg font-extrabold uppercase tracking-tight text-slate-200">
                Clasamentele sunt încă private
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Devin publice când începe turneul.
              </p>
            </div>
          ) : standingsByGroup.size === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-4 text-sm text-slate-500">
              Niciun pronostic completat.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {[...standingsByGroup.entries()].map(([groupName, rows]) => (
                <article
                  key={groupName}
                  className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/40"
                >
                  <header className="border-b border-slate-800/60 bg-slate-900/40 px-4 py-2">
                    <p className="font-display text-sm font-bold uppercase tracking-[0.24em] text-sky-200">
                      Grupa {groupName}
                    </p>
                  </header>
                  <ol className="divide-y divide-slate-800/60">
                    {rows.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="font-display w-6 shrink-0 text-center text-xs font-bold tabular-nums text-slate-500">
                            {r.position}
                          </span>
                          <FlagImage emoji={r.team.flagEmoji} className="h-5 w-auto shrink-0" />
                          <span className="truncate text-sm font-medium text-slate-100">
                            {r.team.name}
                          </span>
                        </div>
                        <PointsBadge pts={r.pointsAwarded} />
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {section === "bonus" && (
        <section className="space-y-3">
          {!tournamentStarted ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
              <p className="font-display text-lg font-extrabold uppercase tracking-tight text-slate-200">
                Bonusul e încă privat
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Devine public când începe turneul.
              </p>
            </div>
          ) : !bonus ? (
            <p className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-4 text-sm text-slate-500">
              Niciun pronostic bonus completat.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <BonusCard eyebrow="Campion" accent="amber" team={bonus.champion} pts={bonus.championPts} />
              <BonusCard eyebrow="Finalist" accent="slate" team={bonus.runnerUp} pts={bonus.runnerUpPts} />
              <BonusCard eyebrow="Golgheter" accent="sky" value={bonus.topScorerName} pts={bonus.topScorerPts} />
              <BonusCard eyebrow="Surpriza turneului" accent="violet" team={bonus.darkHorse} pts={bonus.darkHorsePts} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function MatchRow({
  match: m,
  prediction: pred,
  isVisible,
  isPlaceholder,
}: {
  match: {
    id: number;
    kickoffTime: Date;
    round: Round;
    status: string;
    homeScore: number | null;
    awayScore: number | null;
    wentToEt: boolean | null;
    wentToPens: boolean | null;
    slotDescription: string | null;
    group: { name: string } | null;
    homeTeam: { name: string; flagEmoji: string } | null;
    awayTeam: { name: string; flagEmoji: string } | null;
  };
  prediction: {
    homeScore: number;
    awayScore: number;
    predictsEt: boolean | null;
    predictsPens: boolean | null;
    pointsAwarded: number | null;
  } | null;
  isVisible: boolean;
  isPlaceholder: boolean;
}) {
  const finished = m.status === "FINISHED" && m.homeScore !== null && m.awayScore !== null;
  const meta = m.group?.name ? `Grupa ${m.group.name}` : (m.slotDescription ?? ROUND_LABELS[m.round]);
  const tier = pred ? matchPredictionTier(pred.pointsAwarded, m.round) : "none";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/40">
      <div className="flex items-center gap-3 border-b border-slate-800/60 bg-slate-900/40 px-4 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          {KICKOFF_FMT.format(m.kickoffTime)}
        </span>
        <span className="text-slate-700">·</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{meta}</span>
        {pred && (
          <div className="ml-auto">
            <TierBadge tier={tier} pts={pred.pointsAwarded} />
          </div>
        )}
      </div>

      {isPlaceholder ? (
        <div className="px-4 py-4 text-center text-sm italic text-slate-500">
          {m.slotDescription ?? "Echipe necunoscute"}
        </div>
      ) : !isVisible ? (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3 sm:gap-4">
          <TeamLabel team={m.homeTeam} align="right" />
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-10 w-16 items-center justify-center gap-1 rounded-lg border border-dashed border-slate-700/60">
              <span className="font-display text-base font-extrabold leading-none tabular-nums text-slate-600">?</span>
              <span className="font-display text-xs font-bold leading-none text-slate-700">·</span>
              <span className="font-display text-base font-extrabold leading-none tabular-nums text-slate-600">?</span>
            </div>
            <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-600">
              Privat
            </span>
          </div>
          <TeamLabel team={m.awayTeam} align="left" />
        </div>
      ) : pred ? (
        <>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3 sm:gap-4">
            <TeamLabel team={m.homeTeam} align="right" />
            <div className="flex flex-col items-center gap-1">
              <div className={`flex h-10 w-16 items-center justify-center gap-1 rounded-lg border ${TIER_TILE[tier]}`}>
                <span className="font-display text-base font-extrabold leading-none tabular-nums">{pred.homeScore}</span>
                <span className="font-display text-xs font-bold leading-none opacity-60">·</span>
                <span className="font-display text-base font-extrabold leading-none tabular-nums">{pred.awayScore}</span>
              </div>
              <span className={`text-[9px] font-semibold uppercase tracking-[0.22em] ${TIER_EYEBROW[tier]}`}>
                Predicție
              </span>
            </div>
            <TeamLabel team={m.awayTeam} align="left" />
          </div>

          {(pred.predictsEt || pred.predictsPens) && !finished && (
            <p className="border-t border-slate-800/60 bg-slate-900/30 px-4 py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-300/90">
              A pariat pe {pred.predictsPens ? "penalty-uri" : "prelungiri"}
            </p>
          )}

          {finished && (
            <div className="flex items-center justify-between gap-3 border-t border-slate-800/60 bg-slate-900/30 px-4 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Rezultat
              </span>
              <span className="font-display text-base font-bold tabular-nums text-slate-100">
                {m.homeScore} – {m.awayScore}
                {m.wentToPens && <span className="ml-2 text-[10px] font-semibold uppercase tracking-widest text-amber-300/80">(pen)</span>}
                {m.wentToEt && !m.wentToPens && (
                  <span className="ml-2 text-[10px] font-semibold uppercase tracking-widest text-amber-300/80">(prel)</span>
                )}
              </span>
            </div>
          )}
        </>
      ) : (
        /* Locked match with no prediction made */
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3 sm:gap-4">
          <TeamLabel team={m.homeTeam} align="right" />
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-10 w-16 items-center justify-center gap-1 rounded-lg border border-dashed border-slate-700/60">
              <span className="font-display text-base font-extrabold leading-none tabular-nums text-slate-600">—</span>
              <span className="font-display text-xs font-bold leading-none text-slate-700">·</span>
              <span className="font-display text-base font-extrabold leading-none tabular-nums text-slate-600">—</span>
            </div>
            <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-600">
              Fără pronostic
            </span>
          </div>
          <TeamLabel team={m.awayTeam} align="left" />
        </div>
      )}
    </div>
  );
}

function TierBadge({ tier, pts }: { tier: MatchTier; pts: number | null }) {
  const label = MATCH_TIER_LABEL[tier];
  const ptsText = pts === null ? "—" : pts === 0 ? "0" : `+${pts}`;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${TIER_BADGE[tier]}`}
    >
      <span className="tabular-nums">{ptsText}</span>
      {tier !== "none" && (
        <>
          <span aria-hidden className="opacity-60">·</span>
          <span>{label}</span>
        </>
      )}
    </span>
  );
}

function TeamLabel({
  team,
  align,
}: {
  team: { name: string; flagEmoji: string } | null;
  align: "left" | "right";
}) {
  const alignment = align === "right" ? "justify-end text-right" : "justify-start text-left";
  if (!team) {
    return (
      <div className={`flex items-center ${alignment}`}>
        <span className="font-display text-sm font-semibold uppercase tracking-wide text-slate-500">—</span>
      </div>
    );
  }
  return (
    <div className={`flex min-w-0 items-center gap-2 ${alignment}`}>
      {align === "left" && <FlagImage emoji={team.flagEmoji} className="h-5 w-auto shrink-0" />}
      <span className="font-display truncate text-sm font-semibold uppercase tracking-wide text-slate-100 sm:text-base">
        {team.name}
      </span>
      {align === "right" && <FlagImage emoji={team.flagEmoji} className="h-5 w-auto shrink-0" />}
    </div>
  );
}

function PointsBadge({ pts }: { pts: number | null }) {
  if (pts === null) {
    return (
      <span className="rounded-full border border-slate-700/60 bg-slate-900/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        —
      </span>
    );
  }
  if (pts === 0) {
    return (
      <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-200">
        Ratat
      </span>
    );
  }
  return (
    <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
      +{pts} pct
    </span>
  );
}

function BonusCard({
  eyebrow,
  accent,
  team,
  value,
  pts,
}: {
  eyebrow: string;
  accent: "amber" | "slate" | "sky" | "violet";
  team?: { name: string; flagEmoji: string } | null;
  value?: string | null;
  pts: number | null;
}) {
  const ringMap: Record<typeof accent, string> = {
    amber: "ring-amber-400/40 from-amber-500/15",
    slate: "ring-slate-300/30 from-slate-300/10",
    sky: "ring-sky-400/40 from-sky-500/10",
    violet: "ring-violet-400/40 from-violet-500/15",
  };
  const labelMap: Record<typeof accent, string> = {
    amber: "text-amber-200/90",
    slate: "text-slate-200/90",
    sky: "text-sky-200/90",
    violet: "text-violet-200/90",
  };

  return (
    <article
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br to-slate-950 p-4 ring-1 ${ringMap[accent]}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${labelMap[accent]}`}>
          {eyebrow}
        </p>
        <PointsBadge pts={pts} />
      </div>
      <div className="mt-3 flex min-w-0 items-center gap-3">
        {team && <FlagImage emoji={team.flagEmoji} className="h-8 w-auto shrink-0" />}
        <p className="font-display truncate text-xl font-extrabold uppercase tracking-tight text-slate-50">
          {team ? team.name : value}
        </p>
      </div>
    </article>
  );
}
