import Link from "next/link";
import type { LeaderboardRow } from "@/lib/leaderboard";

export const CATEGORIES = [
  { key: "groupMatchPts", label: "Grupe", barClass: "bg-emerald-400", dotClass: "bg-emerald-400" },
  { key: "groupStandingPts", label: "Clasamente", barClass: "bg-sky-400", dotClass: "bg-sky-400" },
  { key: "knockoutPts", label: "Knockout", barClass: "bg-amber-400", dotClass: "bg-amber-400" },
  { key: "bonusPts", label: "Bonus", barClass: "bg-fuchsia-400", dotClass: "bg-fuchsia-400" },
] as const satisfies ReadonlyArray<{
  key: keyof Pick<LeaderboardRow, "groupMatchPts" | "groupStandingPts" | "knockoutPts" | "bonusPts">;
  label: string;
  barClass: string;
  dotClass: string;
}>;

export const PODIUM_RING: Record<number, string> = {
  1: "ring-amber-300/60 from-amber-500/15 via-amber-500/5",
  2: "ring-slate-300/40 from-slate-300/10 via-slate-300/5",
  3: "ring-orange-400/40 from-orange-500/15 via-orange-500/5",
};
export const PODIUM_BADGE: Record<number, string> = {
  1: "bg-amber-300 text-amber-950",
  2: "bg-slate-200 text-slate-900",
  3: "bg-orange-400 text-orange-950",
};
export const PODIUM_LABEL: Record<number, string> = {
  1: "Locul I",
  2: "Locul II",
  3: "Locul III",
};

export function categoryShare(row: LeaderboardRow, key: (typeof CATEGORIES)[number]["key"]): number {
  if (row.total <= 0) return 0;
  return (row[key] / row.total) * 100;
}

export function computeRanks(rows: LeaderboardRow[]): number[] {
  const ranks: number[] = [];
  let rank = 1;
  for (let i = 0; i < rows.length; i++) {
    if (i > 0 && rows[i].total !== rows[i - 1].total) rank = i + 1;
    ranks.push(rank);
  }
  return ranks;
}

export function PodiumHero({
  row,
  place,
  highlighted,
}: {
  row: LeaderboardRow;
  place: number;
  highlighted: boolean;
}) {
  const badge = PODIUM_BADGE[place] ?? PODIUM_BADGE[1];
  const label = PODIUM_LABEL[place] ?? PODIUM_LABEL[1];
  return (
    <article
      className={[
        "relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-slate-950 p-6 ring-1 ring-amber-300/60 sm:p-8",
        highlighted ? "outline outline-2 outline-offset-2 outline-emerald-400/70" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 font-display text-lg font-bold ${badge}`}>
          {place}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-200/80">
          {label}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <NameLink username={row.username} className="font-display break-words text-3xl font-extrabold uppercase leading-[1.05] tracking-tight text-slate-50 transition hover:text-amber-100 sm:text-4xl">
              {row.displayName}
            </NameLink>
            {highlighted && <YouPill />}
          </p>
          {(row.firstName || row.lastName) && (
            <p className="mt-1 text-xs font-medium text-amber-100/60">@{row.username}</p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className="font-display text-6xl font-extrabold leading-none text-slate-50 sm:text-7xl">
            {row.total}
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">
            puncte
          </p>
        </div>
      </div>

      <div className="mt-5">
        <CategoryBar row={row} />
      </div>

      <CategoryBreakdown row={row} className="mt-5" />

      <ViewPredictionsLink username={row.username} className="mt-5 text-amber-200/90 hover:text-amber-100" />
    </article>
  );
}

export function PodiumSide({
  row,
  place,
  tied,
  highlighted,
}: {
  row: LeaderboardRow;
  place: number;
  tied?: boolean;
  highlighted: boolean;
}) {
  const ring = PODIUM_RING[place] ?? "ring-slate-700/50 from-slate-800/30 via-slate-800/10";
  const badge = PODIUM_BADGE[place] ?? "bg-slate-700 text-slate-100";
  const label = PODIUM_LABEL[place] ?? `Locul ${place}`;

  return (
    <article
      className={[
        "relative flex flex-col gap-4 overflow-hidden rounded-2xl bg-gradient-to-br to-slate-950 p-5 ring-1",
        ring,
        highlighted ? "outline outline-2 outline-offset-2 outline-emerald-400/70" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <span className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 font-display text-base font-bold ${badge}`}>
          {tied ? `=${place}` : place}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
          {label}
        </span>
      </div>

      <div className="space-y-1">
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <NameLink username={row.username} className="font-display break-words text-xl font-extrabold uppercase leading-[1.05] tracking-tight text-slate-50 transition hover:text-slate-200">
            {row.displayName}
          </NameLink>
          {highlighted && <YouPill />}
        </p>
        {(row.firstName || row.lastName) && (
          <p className="text-[11px] font-medium text-slate-500">@{row.username}</p>
        )}
        <p className="flex items-baseline gap-2 pt-1 text-slate-300">
          <span className="font-display text-4xl font-extrabold leading-none">{row.total}</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">puncte</span>
        </p>
      </div>

      <CategoryBar row={row} />
      <CategoryBreakdown row={row} compact />
      <ViewPredictionsLink username={row.username} className="text-slate-400 hover:text-slate-200" />
    </article>
  );
}

export function LeaderboardRowItem({
  row,
  place,
  tied,
  highlighted,
}: {
  row: LeaderboardRow;
  place: number;
  tied?: boolean;
  highlighted: boolean;
}) {
  return (
    <li className={highlighted ? "bg-emerald-400/10" : ""}>
      <details className="group border-t border-slate-800/80 first:border-t-0">
        <summary
          className={[
            "flex cursor-pointer list-none items-center gap-4 px-4 py-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 focus-visible:ring-inset",
            highlighted ? "" : "hover:bg-slate-900/40",
            "[&::-webkit-details-marker]:hidden",
          ].join(" ")}
        >
          <span className="font-display w-8 shrink-0 text-center text-base font-bold tabular-nums text-slate-400">
            {tied ? `=${place}` : place}
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="break-words text-sm font-semibold leading-tight text-slate-100">{row.displayName}</span>
              {(row.firstName || row.lastName) && (
                <span className="hidden text-[11px] text-slate-500 sm:inline">@{row.username}</span>
              )}
              {highlighted && <YouPill />}
            </p>
            <CategoryBar row={row} thin />
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-2xl font-extrabold leading-none text-slate-50">{row.total}</p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.28em] text-slate-500">pct</p>
          </div>
          <Chevron />
        </summary>
        <div className="border-t border-slate-800/40 bg-slate-900/30 px-4 py-4 sm:pl-16">
          <CategoryBreakdown row={row} className="grid-cols-2 gap-y-2" />
          <ViewPredictionsLink
            username={row.username}
            className="mt-4 text-slate-300 hover:text-emerald-200"
          />
        </div>
      </details>
    </li>
  );
}

function Chevron() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-90"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 5l6 5-6 5" />
    </svg>
  );
}

function NameLink({
  username,
  className,
  children,
}: {
  username: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={`/jucator/${encodeURIComponent(username)}`} className={className}>
      {children}
    </Link>
  );
}

function ViewPredictionsLink({
  username,
  className,
}: {
  username: string;
  className?: string;
}) {
  return (
    <Link
      href={`/jucator/${encodeURIComponent(username)}`}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.22em] transition ${className ?? ""}`}
    >
      Vezi predicțiile
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 10h10M11 5l5 5-5 5" />
      </svg>
    </Link>
  );
}

export function CategoryBar({ row, thin }: { row: LeaderboardRow; thin?: boolean }) {
  const hasAny = row.total > 0;
  return (
    <div
      className={`flex w-full overflow-hidden rounded-full bg-slate-900/80 ring-1 ring-slate-800 ${thin ? "h-1.5" : "h-2"}`}
      aria-hidden
    >
      {hasAny ? (
        CATEGORIES.map((c) => {
          const share = categoryShare(row, c.key);
          if (share <= 0) return null;
          return (
            <span
              key={c.key}
              className={c.barClass}
              style={{ width: `${share}%` }}
              title={`${c.label}: ${row[c.key]} pct`}
            />
          );
        })
      ) : (
        <span className="w-full bg-slate-800/60" />
      )}
    </div>
  );
}

export function CategoryBreakdown({
  row,
  className,
  compact,
}: {
  row: LeaderboardRow;
  className?: string;
  compact?: boolean;
}) {
  return (
    <dl
      className={[
        "grid gap-x-4 gap-y-1.5 text-sm",
        compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2",
        className ?? "",
      ].join(" ")}
    >
      {CATEGORIES.map((c) => (
        <div key={c.key} className="flex items-center justify-between gap-3">
          <dt className="flex min-w-0 items-center gap-2 text-xs text-slate-300">
            <span className={`h-2 w-2 shrink-0 rounded-full ${c.dotClass}`} aria-hidden />
            <span className="truncate">{c.label}</span>
          </dt>
          <dd className="font-display text-sm font-bold tabular-nums text-slate-100">
            {row[c.key]}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function YouPill() {
  return (
    <span className="rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
      tu
    </span>
  );
}

export function Legend() {
  return (
    <section className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">Legendă</h3>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {CATEGORIES.map((c) => (
          <div key={c.key} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${c.dotClass}`} aria-hidden />
            <dt className="text-xs font-medium text-slate-300">{c.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
      <p className="font-display text-xl font-extrabold uppercase tracking-tight text-slate-200">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">{description}</p>
    </div>
  );
}

export function ClasamentBody({ rows, meId }: { rows: LeaderboardRow[]; meId?: number }) {
  const totalPlayers = rows.length;
  const ranks = computeRanks(rows);
  const podium = rows.slice(0, 3);
  const podiumRanks = ranks.slice(0, 3);
  const rest = rows.slice(3);
  const restRanks = ranks.slice(3);

  if (totalPlayers === 0) {
    return (
      <EmptyState
        title="Niciun jucător"
        description="Niciun jucător nu face parte din această categorie."
      />
    );
  }

  return (
    <>
      {podium.length > 0 && (
        <PodiumHero row={podium[0]} place={podiumRanks[0]} highlighted={meId === podium[0].userId} />
      )}

      {podium.length > 1 && (
        <section aria-label="Locurile 2 și 3" className="grid gap-3 sm:grid-cols-2">
          {podium.slice(1).map((row, i) => {
            const place = podiumRanks[i + 1];
            const tied = podiumRanks.filter((r) => r === place).length > 1;
            return (
              <PodiumSide
                key={row.userId}
                row={row}
                place={place}
                tied={tied}
                highlighted={meId === row.userId}
              />
            );
          })}
        </section>
      )}

      {rest.length > 0 && (
        <section aria-label="Restul clasamentului" className="space-y-2">
          <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
            Plutonul
          </h2>
          <ol className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/40">
            {rest.map((row, i) => {
              const place = restRanks[i];
              const tied = restRanks.filter((r) => r === place).length > 1;
              const isMe = meId === row.userId;
              return (
                <LeaderboardRowItem key={row.userId} row={row} place={place} tied={tied} highlighted={isMe} />
              );
            })}
          </ol>
        </section>
      )}

      <Legend />
    </>
  );
}
