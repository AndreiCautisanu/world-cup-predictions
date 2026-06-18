import Link from "next/link";
import { notFound } from "next/navigation";
import { Round } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { matchPredictionTier, MATCH_TIER_LABEL, type MatchTier } from "@/lib/match-tier";
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

const ROUND_LABEL: Record<string, string> = {
  GROUP_1: "Etapa 1", GROUP_2: "Etapa 2", GROUP_3: "Etapa 3",
  R32: "Șaisprezecimi", R16: "Optimi", QF: "Sferturi",
  SF: "Semifinale", THIRD_PLACE: "Locul 3", FINAL: "Finala",
};

function isRound(value: string | undefined): value is Round {
  return !!value && TABS.some((t) => t.key === value);
}

const KICKOFF_FORMATTER = new Intl.DateTimeFormat("ro-RO", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Bucharest",
});

const TIER_CHROME: Record<Exclude<MatchTier, "none">, string> = {
  miss: "border-rose-500/45 bg-rose-500/[0.05] ring-1 ring-rose-500/20",
  partial: "border-amber-500/45 bg-amber-500/[0.05] ring-1 ring-amber-500/20",
  close: "border-sky-500/45 bg-sky-500/[0.05] ring-1 ring-sky-500/20",
  exact: "border-emerald-500/50 bg-emerald-500/[0.06] ring-1 ring-emerald-500/25",
  perfect: "border-yellow-300/60 bg-yellow-400/[0.08] ring-1 ring-yellow-300/30 shadow-[0_0_28px_-6px_rgba(250,204,21,0.45)]",
};
const TIER_STRIPE: Record<Exclude<MatchTier, "none">, string> = {
  miss: "bg-gradient-to-b from-rose-400 to-rose-600",
  partial: "bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500",
  close: "bg-gradient-to-b from-sky-400 to-sky-600",
  exact: "bg-gradient-to-b from-emerald-400 to-emerald-600",
  perfect: "bg-gradient-to-b from-yellow-200 via-yellow-300 to-amber-400",
};
const TIER_BADGE: Record<Exclude<MatchTier, "none">, string> = {
  miss: "border-rose-500/40 bg-rose-500/15 text-rose-200",
  partial: "border-amber-500/40 bg-amber-500/15 text-amber-200",
  close: "border-sky-500/40 bg-sky-500/15 text-sky-200",
  exact: "border-emerald-400/50 bg-emerald-500/20 text-emerald-200",
  perfect: "border-yellow-300/60 bg-yellow-400/20 text-yellow-100 shadow-[0_0_18px_-2px_rgba(250,204,21,0.45)]",
};

export default async function AdminUserDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ md?: string; tab?: string }>;
}) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId < 1) notFound();

  const sp = await searchParams;
  const matchday: Round = isRound(sp.md) ? sp.md : "GROUP_2";
  const activeTab = TABS.find((t) => t.key === matchday)!;
  const section = sp.tab ?? "meciuri";

  const [user, matches] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        matchPredictions: {
          where: { match: { round: matchday } },
          include: { match: true },
        },
        groupStandingPredictions: {
          include: { group: true, team: true },
          orderBy: [{ groupId: "asc" }, { position: "asc" }],
        },
        bonusPrediction: {
          include: { champion: true, runnerUp: true, darkHorse: true },
        },
      },
    }),
    prisma.match.findMany({
      where: { round: matchday },
      include: { homeTeam: true, awayTeam: true, group: true },
      orderBy: { kickoffTime: "asc" },
    }),
  ]);
  if (!user) notFound();

  const predByMatchId = new Map(user.matchPredictions.map((p) => [p.matchId, p]));
  const playable = matches.filter((m) => m.homeTeam && m.awayTeam);
  const savedCount = playable.filter((m) => predByMatchId.has(m.id)).length;

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
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-slate-50 sm:text-4xl">
              {user.username}
            </h1>
            {fullName && <p className="text-sm text-slate-400">{fullName}</p>}
          </div>
          <span className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
            {savedCount}/{playable.length} salvate
          </span>
        </div>
      </section>

      {/* Section switcher */}
      <div className="flex gap-2">
        {(["meciuri", "grupe", "bonus"] as const).map((s) => (
          <Link
            key={s}
            href={`?md=${matchday}&tab=${s}`}
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
              section === s
                ? "border-rose-400/60 bg-rose-500/10 text-rose-200"
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
                        ? "border-rose-400/60 bg-rose-500/10 text-rose-200 shadow-[0_0_0_1px_rgba(251,113,133,0.4)]"
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
                const pred = predByMatchId.get(m.id) ?? null;
                const hasResult =
                  m.status === "FINISHED" &&
                  m.homeScore !== null &&
                  m.awayScore !== null;
                const tier: MatchTier =
                  pred?.pointsAwarded !== undefined && pred?.pointsAwarded !== null
                    ? matchPredictionTier(pred.pointsAwarded, m.round)
                    : "none";
                const scoredTier = tier !== "none" ? (tier as Exclude<MatchTier, "none">) : null;

                const chrome = scoredTier
                  ? TIER_CHROME[scoredTier]
                  : pred
                    ? "border-emerald-500/45 bg-emerald-500/[0.04] ring-1 ring-emerald-500/20"
                    : "border-slate-800/80 bg-slate-900/20";

                const stripe = scoredTier
                  ? TIER_STRIPE[scoredTier]
                  : pred
                    ? "bg-gradient-to-b from-emerald-400 to-emerald-600"
                    : "bg-gradient-to-b from-slate-600 to-slate-800";

                const isPlaceholder = !m.homeTeam || !m.awayTeam;

                return (
                  <article
                    key={m.id}
                    className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-slate-950 shadow-lg shadow-black/20 backdrop-blur transition ${chrome}`}
                  >
                    <span
                      aria-hidden
                      className={`absolute inset-y-0 left-0 w-[3px] ${stripe}`}
                    />

                    <header className="flex items-center justify-between gap-3 border-b border-slate-800/70 px-4 py-2.5">
                      <div className="flex min-w-0 flex-col">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-300/80">
                          {m.group ? `Grupa ${m.group.name}` : (m.slotDescription ?? ROUND_LABEL[m.round] ?? m.round)}
                        </span>
                        <span className="truncate text-xs text-slate-400">
                          {KICKOFF_FORMATTER.format(new Date(m.kickoffTime))}
                        </span>
                      </div>
                      {pred && !scoredTier && (
                        <span
                          className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400"
                          aria-label="salvat"
                        />
                      )}
                    </header>

                    {isPlaceholder ? (
                      <div className="px-4 py-6 text-center">
                        <p className="text-sm italic text-slate-500">Echipe necunoscute</p>
                        {m.slotDescription && (
                          <p className="mt-1 text-xs text-slate-600">{m.slotDescription}</p>
                        )}
                      </div>
                    ) : (
                      <div className="px-4 py-4">
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                          {/* Home team */}
                          <div className="flex min-w-0 items-center justify-end gap-2.5">
                            <span className="truncate text-base font-bold tracking-tight text-slate-50 sm:text-lg">
                              {m.homeTeam!.name}
                            </span>
                            <FlagImage emoji={m.homeTeam!.flagEmoji} className="h-5 w-auto shrink-0" />
                          </div>

                          {/* Score display */}
                          <div className="flex items-center gap-2">
                            {pred ? (
                              <>
                                <span className="font-display flex h-12 w-12 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/70 text-2xl font-bold tabular-nums text-slate-50">
                                  {pred.homeScore}
                                </span>
                                <span className="font-display text-2xl text-slate-600" aria-hidden>·</span>
                                <span className="font-display flex h-12 w-12 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/70 text-2xl font-bold tabular-nums text-slate-50">
                                  {pred.awayScore}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-slate-700/60 text-xl text-slate-600">
                                  —
                                </span>
                                <span className="font-display text-2xl text-slate-600" aria-hidden>·</span>
                                <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-slate-700/60 text-xl text-slate-600">
                                  —
                                </span>
                              </>
                            )}
                          </div>

                          {/* Away team */}
                          <div className="flex min-w-0 items-center justify-start gap-2.5">
                            <FlagImage emoji={m.awayTeam!.flagEmoji} className="h-5 w-auto shrink-0" />
                            <span className="truncate text-base font-bold tracking-tight text-slate-50 sm:text-lg">
                              {m.awayTeam!.name}
                            </span>
                          </div>
                        </div>

                        {/* ET/pens badges for KO predictions */}
                        {pred && (pred.predictsEt || pred.predictsPens) && (
                          <div className="mt-2 flex justify-center gap-2">
                            {pred.predictsEt && (
                              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                                Prelungiri
                              </span>
                            )}
                            {pred.predictsPens && (
                              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                                Penalty-uri
                              </span>
                            )}
                          </div>
                        )}

                        {/* Points / tier badge */}
                        {scoredTier && (
                          <div className="mt-3 flex flex-col items-center gap-1.5">
                            {hasResult && (
                              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Rezultat{" "}
                                <span className="font-display text-slate-100 tabular-nums">
                                  {m.homeScore} – {m.awayScore}
                                </span>
                                {m.wentToPens ? (
                                  <span className="ml-1 text-amber-300/80">(pen)</span>
                                ) : m.wentToEt ? (
                                  <span className="ml-1 text-amber-300/80">(prel)</span>
                                ) : null}
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${TIER_BADGE[scoredTier]}`}
                            >
                              <span className="tabular-nums">
                                {pred!.pointsAwarded === 0 ? "0 pct" : `+${pred!.pointsAwarded} pct`}
                              </span>
                              <span aria-hidden className="opacity-60">·</span>
                              <span>{MATCH_TIER_LABEL[tier]}</span>
                            </span>
                          </div>
                        )}

                        {!pred && (
                          <p className="mt-3 text-center text-[11px] uppercase tracking-[0.18em] text-slate-600">
                            Niciun pronostic
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {section === "grupe" && (
        <section className="space-y-3">
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
      )}

      {section === "bonus" && (
        <section className="space-y-3">
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
      )}
    </div>
  );
}
