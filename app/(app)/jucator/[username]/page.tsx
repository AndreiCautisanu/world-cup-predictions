import Link from "next/link";
import { notFound } from "next/navigation";
import type { Round } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isTournamentLocked, tournamentLockTime } from "@/lib/locking";
import { buildDisplayName, summarizeLeaderboardRows } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

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
});

export default async function JucatorPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername);

  const session = await auth();
  const meId = session?.user?.id;

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, firstName: true, lastName: true, createdAt: true },
  });
  if (!user) notFound();

  const isMe = meId === user.id;
  const displayName = buildDisplayName(user);
  const now = new Date();

  // Tournament lock — controls visibility of bonus + standings.
  // Considered "started" once either the first kickoff time has passed
  // OR any group-stage match has been resulted (covers admin-entered or
  // demo-spoofed results landing before the scheduled kickoff window).
  const tournamentStart = await tournamentLockTime(prisma);
  const anyGroupFinished = await prisma.match.findFirst({
    where: { round: { in: ["GROUP_1", "GROUP_2", "GROUP_3"] }, status: "FINISHED" },
    select: { id: true },
  });
  const tournamentStarted =
    isTournamentLocked(tournamentStart, now) || anyGroupFinished !== null;

  // ── Compute totals from ALL predictions (visible or not) so the header
  //    reflects the leaderboard exactly; the visibility filter only affects
  //    which individual predictions get displayed below. ─────────────────
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

  // ── Visible match predictions: kickoff has passed OR the match is
  //    already FINISHED (the admin may have entered a result before the
  //    scheduled kickoff e.g. for demo data; once a result exists the
  //    prediction can no longer change so it's safe to show). ─────────
  const visibleMatchPreds = await prisma.matchPrediction.findMany({
    where: {
      userId: user.id,
      match: { OR: [{ kickoffTime: { lte: now } }, { status: "FINISHED" }] },
    },
    include: {
      match: { include: { homeTeam: true, awayTeam: true, group: true } },
    },
    orderBy: { match: { kickoffTime: "desc" } },
  });

  // ── Visible bonus + standings (only if tournament started) ─────────────
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

  const hasAnyVisible = visibleMatchPreds.length > 0 || bonus !== null || standings.length > 0;

  return (
    <div className="space-y-8">
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
            <h1 className="font-display truncate text-4xl font-extrabold uppercase tracking-tight text-slate-50 sm:text-5xl">
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

      {!hasAnyVisible && (
        <NoVisibility tournamentStarted={tournamentStarted} tournamentStart={tournamentStart} />
      )}

      {visibleMatchPreds.length > 0 && (
        <section className="space-y-3">
          <SectionHeading
            label="Predicții deblocate"
            accent="emerald"
            sub={`${visibleMatchPreds.length} meciuri începute`}
          />
          <ul className="space-y-2">
            {visibleMatchPreds.map((p) => (
              <li key={p.id}>
                <MatchPredictionRow prediction={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {bonus && (
        <section className="space-y-3">
          <SectionHeading label="Bonus" accent="fuchsia" sub="Predicții pre-turneu" />
          <div className="grid gap-3 sm:grid-cols-2">
            <BonusCard
              eyebrow="Campion"
              accent="amber"
              team={bonus.champion}
              pts={bonus.championPts}
            />
            <BonusCard
              eyebrow="Finalist"
              accent="slate"
              team={bonus.runnerUp}
              pts={bonus.runnerUpPts}
            />
            <BonusCard
              eyebrow="Golgheter"
              accent="sky"
              value={bonus.topScorerName}
              pts={bonus.topScorerPts}
            />
            <BonusCard
              eyebrow="Cal negru"
              accent="violet"
              team={bonus.darkHorse}
              pts={bonus.darkHorsePts}
            />
          </div>
        </section>
      )}

      {standings.length > 0 && (
        <section className="space-y-3">
          <SectionHeading label="Clasament grupe" accent="sky" sub={`${standingsByGroup.size}/12 grupe`} />
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
                        <span className="shrink-0 text-lg leading-none" aria-hidden>
                          {r.team.flagEmoji}
                        </span>
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
        </section>
      )}
    </div>
  );
}

function SectionHeading({
  label,
  sub,
  accent,
}: {
  label: string;
  sub: string;
  accent: "emerald" | "fuchsia" | "sky";
}) {
  const tone =
    accent === "emerald"
      ? "text-emerald-300/80"
      : accent === "fuchsia"
        ? "text-fuchsia-300/80"
        : "text-sky-300/80";
  return (
    <div className="flex items-baseline justify-between gap-2 px-1">
      <h2 className={`font-display text-lg font-extrabold uppercase tracking-[0.18em] ${tone}`}>
        {label}
      </h2>
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">{sub}</p>
    </div>
  );
}

function MatchPredictionRow({
  prediction,
}: {
  prediction: {
    homeScore: number;
    awayScore: number;
    predictsEt: boolean | null;
    predictsPens: boolean | null;
    pointsAwarded: number | null;
    match: {
      kickoffTime: Date;
      round: Round;
      status: "SCHEDULED" | "LIVE" | "FINISHED";
      homeScore: number | null;
      awayScore: number | null;
      wentToEt: boolean | null;
      wentToPens: boolean | null;
      group: { name: string } | null;
      homeTeam: { name: string; flagEmoji: string } | null;
      awayTeam: { name: string; flagEmoji: string } | null;
    };
  };
}) {
  const m = prediction.match;
  const finished = m.status === "FINISHED" && m.homeScore !== null && m.awayScore !== null;
  const meta = m.group?.name ? `Grupa ${m.group.name}` : ROUND_LABELS[m.round];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/40">
      <div className="flex items-center gap-3 border-b border-slate-800/60 bg-slate-900/40 px-4 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          {KICKOFF_FMT.format(m.kickoffTime)}
        </span>
        <span className="text-slate-700">·</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{meta}</span>
        <div className="ml-auto">
          <PointsBadge pts={prediction.pointsAwarded} />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3 sm:gap-4">
        <TeamLabel team={m.homeTeam} align="right" />
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-10 w-16 items-center justify-center gap-1 rounded-lg border border-emerald-400/20 bg-emerald-500/5 text-emerald-200">
            <span className="font-display text-base font-extrabold leading-none tabular-nums">{prediction.homeScore}</span>
            <span className="font-display text-xs font-bold leading-none text-emerald-400/60">·</span>
            <span className="font-display text-base font-extrabold leading-none tabular-nums">{prediction.awayScore}</span>
          </div>
          <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-emerald-300/70">
            Predicție
          </span>
        </div>
        <TeamLabel team={m.awayTeam} align="left" />
      </div>

      {(prediction.predictsEt || prediction.predictsPens) && !finished && (
        <p className="border-t border-slate-800/60 bg-slate-900/30 px-4 py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-300/90">
          A pariat pe {prediction.predictsPens ? "penalty-uri" : "prelungiri"}
        </p>
      )}

      {finished && (
        <div className="flex items-center justify-between gap-3 border-t border-slate-800/60 bg-slate-900/30 px-4 py-2 text-xs">
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
    </div>
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
      {align === "left" && <span aria-hidden className="shrink-0 text-xl leading-none">{team.flagEmoji}</span>}
      <span className="font-display truncate text-sm font-semibold uppercase tracking-wide text-slate-100 sm:text-base">
        {team.name}
      </span>
      {align === "right" && <span aria-hidden className="shrink-0 text-xl leading-none">{team.flagEmoji}</span>}
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
      <span className="rounded-full border border-slate-700/60 bg-slate-900/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        0 pct
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
  team?: { name: string; flagEmoji: string };
  value?: string;
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
        {team && <span aria-hidden className="shrink-0 text-3xl leading-none">{team.flagEmoji}</span>}
        <p className="font-display truncate text-xl font-extrabold uppercase tracking-tight text-slate-50">
          {team ? team.name : value}
        </p>
      </div>
    </article>
  );
}

function NoVisibility({
  tournamentStarted,
  tournamentStart,
}: {
  tournamentStarted: boolean;
  tournamentStart: Date | null;
}) {
  const startStr = tournamentStart
    ? KICKOFF_FMT.format(tournamentStart)
    : null;
  return (
    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
      <p className="font-display text-xl font-extrabold uppercase tracking-tight text-slate-200">
        Predicțiile sunt încă private
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
        {tournamentStarted
          ? "Niciun meci nu a început încă, deci nu există predicții vizibile pentru acest jucător. Vor apărea pe măsură ce încep meciurile."
          : startStr
            ? `Bonusul și pronosticurile pe clasamentul grupelor devin publice când începe turneul (${startStr}). Predicțiile pe meciuri devin publice individual, după ce fluierul de start al fiecărui meci sună.`
            : "Predicțiile devin publice doar după ce sunt blocate — bonusul și clasamentele când începe turneul, predicțiile pe meciuri când începe fiecare meci."}
      </p>
    </div>
  );
}
