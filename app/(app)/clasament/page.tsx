import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getLeaderboard, type LeaderboardRow } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  { key: "groupMatchPts", label: "Grupe", barClass: "bg-emerald-400" },
  { key: "groupStandingPts", label: "Clasamente", barClass: "bg-sky-400" },
  { key: "knockoutPts", label: "Knockout", barClass: "bg-amber-400" },
  { key: "bonusPts", label: "Bonus", barClass: "bg-fuchsia-400" },
] as const satisfies ReadonlyArray<{
  key: keyof Pick<LeaderboardRow, "groupMatchPts" | "groupStandingPts" | "knockoutPts" | "bonusPts">;
  label: string;
  barClass: string;
}>;

const PODIUM_RING: Record<number, string> = {
  1: "ring-amber-300/60 from-amber-500/15 via-amber-500/5",
  2: "ring-slate-300/40 from-slate-300/10 via-slate-300/5",
  3: "ring-orange-400/40 from-orange-500/15 via-orange-500/5",
};
const PODIUM_BADGE: Record<number, string> = {
  1: "bg-amber-300 text-amber-950",
  2: "bg-slate-200 text-slate-900",
  3: "bg-orange-400 text-orange-950",
};
const PODIUM_LABEL: Record<number, string> = {
  1: "Locul I",
  2: "Locul II",
  3: "Locul III",
};

function categoryShare(row: LeaderboardRow, key: (typeof CATEGORIES)[number]["key"]): number {
  if (row.total <= 0) return 0;
  return (row[key] / row.total) * 100;
}

export default async function ClasamentPage() {
  const session = await auth();
  const meId = session?.user?.id;
  const rows = await getLeaderboard(prisma);

  const totalPlayers = rows.length;
  const totalPoints = rows.reduce((s, r) => s + r.total, 0);
  const anyPoints = totalPoints > 0;

  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
          Clasament general
        </p>
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none tracking-tight text-slate-50 sm:text-5xl">
          Clasament
        </h1>
        <p className="max-w-prose text-sm text-slate-400">
          {anyPoints
            ? `${totalPlayers} jucători au strâns laolaltă ${totalPoints} de puncte. Primele locuri se joacă în finalul grupelor.`
            : `Sunt ${totalPlayers} jucători înscriși. Punctajele apar după primele rezultate.`}
        </p>
      </header>

      {totalPlayers === 0 && (
        <EmptyState
          title="Niciun jucător încă"
          description="Invită-ți prietenii cu codul comunității ca să dea drumul la pronosticuri."
        />
      )}

      {totalPlayers > 0 && (
        <>
          <section aria-label="Podium" className="grid gap-3 sm:grid-cols-3">
            {podium.map((row, i) => {
              const place = i + 1;
              const isMe = meId === row.userId;
              return (
                <PodiumCard
                  key={row.userId}
                  row={row}
                  place={place}
                  highlighted={isMe}
                  emphasis={place === 1}
                />
              );
            })}
            {/* Fill empty podium slots with placeholders so the grid looks intentional pre-tournament */}
            {Array.from({ length: Math.max(0, 3 - podium.length) }).map((_, i) => (
              <div
                key={`placeholder-${i}`}
                className="hidden rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 p-5 sm:block"
                aria-hidden
              />
            ))}
          </section>

          {rest.length > 0 && (
            <section aria-label="Restul clasamentului" className="space-y-2">
              <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                Plutonul
              </h2>
              <ol className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/40">
                {rest.map((row, i) => {
                  const place = i + 4;
                  const isMe = meId === row.userId;
                  return <LeaderboardRowItem key={row.userId} row={row} place={place} highlighted={isMe} />;
                })}
              </ol>
            </section>
          )}

          <Legend />
        </>
      )}
    </div>
  );
}

function PodiumCard({
  row,
  place,
  highlighted,
  emphasis,
}: {
  row: LeaderboardRow;
  place: number;
  highlighted: boolean;
  emphasis: boolean;
}) {
  const ring = PODIUM_RING[place] ?? "ring-slate-700/50 from-slate-800/30 via-slate-800/10";
  const badge = PODIUM_BADGE[place] ?? "bg-slate-700 text-slate-100";
  const label = PODIUM_LABEL[place] ?? `Locul ${place}`;

  return (
    <article
      className={[
        "relative flex flex-col gap-4 overflow-hidden rounded-2xl p-5",
        "bg-gradient-to-br to-slate-950",
        "ring-1",
        ring,
        emphasis ? "sm:p-6" : "",
        highlighted ? "outline outline-2 outline-offset-2 outline-emerald-400/70" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <span className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 font-display text-base font-bold ${badge}`}>
          {place}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
          {label}
        </span>
      </div>

      <div className="space-y-1">
        <p className="flex items-baseline gap-2 truncate">
          <span className="truncate text-lg font-semibold text-slate-50">{row.username}</span>
          {highlighted && (
            <span className="rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
              tu
            </span>
          )}
        </p>
        <p className="flex items-baseline gap-2 text-slate-300">
          <span className={`font-display font-extrabold leading-none ${emphasis ? "text-5xl sm:text-6xl" : "text-4xl"}`}>
            {row.total}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">puncte</span>
        </p>
      </div>

      <CategoryBar row={row} />

      <dl className="grid grid-cols-4 gap-1.5 text-[10px]">
        {CATEGORIES.map((c) => (
          <div key={c.key} className="rounded-md border border-slate-800/80 bg-slate-900/40 px-2 py-1.5">
            <dt className="font-semibold uppercase tracking-widest text-slate-500">{c.label.slice(0, 4)}</dt>
            <dd className="font-display text-sm font-bold text-slate-100">{row[c.key]}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function LeaderboardRowItem({
  row,
  place,
  highlighted,
}: {
  row: LeaderboardRow;
  place: number;
  highlighted: boolean;
}) {
  return (
    <li
      className={[
        "flex items-center gap-4 border-t border-slate-800/80 px-4 py-3 first:border-t-0",
        highlighted ? "bg-emerald-400/10" : "transition hover:bg-slate-900/40",
      ].join(" ")}
    >
      <span className="font-display w-8 shrink-0 text-center text-base font-bold tabular-nums text-slate-400">
        {place}
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="flex items-baseline gap-2 truncate">
          <span className="truncate text-sm font-semibold text-slate-100">{row.username}</span>
          {highlighted && (
            <span className="rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
              tu
            </span>
          )}
        </p>
        <CategoryBar row={row} thin />
      </div>
      <div className="shrink-0 text-right">
        <p className="font-display text-2xl font-extrabold leading-none text-slate-50">{row.total}</p>
        <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.28em] text-slate-500">pct</p>
      </div>
    </li>
  );
}

function CategoryBar({ row, thin }: { row: LeaderboardRow; thin?: boolean }) {
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

function Legend() {
  return (
    <section className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">Legendă</h3>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {CATEGORIES.map((c) => (
          <div key={c.key} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${c.barClass}`} aria-hidden />
            <dt className="text-xs font-medium text-slate-300">{c.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
      <p className="font-display text-xl font-extrabold uppercase tracking-tight text-slate-200">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">{description}</p>
    </div>
  );
}
