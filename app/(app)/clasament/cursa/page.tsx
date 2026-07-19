import Link from "next/link";
import { LeaderboardRace } from "@/components/LeaderboardRace";
import { getLeaderboardRaceTimeline } from "@/lib/leaderboard-race";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CursaPage() {
  const timeline = await getLeaderboardRaceTimeline(prisma);
  const hasHistory = timeline.snapshots.length > 1;

  return (
    <div className="space-y-6 sm:space-y-8">
      <Link
        href="/clasament"
        className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 transition hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
      >
        <span aria-hidden>←</span>
        Înapoi la clasament
      </Link>

      <header className="relative overflow-hidden rounded-[28px] border border-slate-800/80 bg-slate-950/50 px-5 py-6 sm:px-7 sm:py-8">
        <div
          aria-hidden
          className="absolute -right-12 -top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl"
        />
        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-emerald-300/80">
            Retrospectiva 2026
          </p>
          <h1 className="font-display mt-2 text-4xl uppercase leading-[0.94] tracking-[0.02em] text-slate-50 sm:text-6xl">
            Cursa turneului
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">
            Meci cu meci, punct cu punct. Urmărește cum s-a schimbat clasamentul de la primul fluier până la trofeu.
          </p>
          {hasHistory && (
            <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-800/70 pt-4">
              <div>
                <dt className="text-[8px] font-bold uppercase tracking-[0.24em] text-slate-600">Momente</dt>
                <dd className="font-display mt-0.5 text-xl text-slate-200">{timeline.snapshots.length - 1}</dd>
              </div>
              <div>
                <dt className="text-[8px] font-bold uppercase tracking-[0.24em] text-slate-600">Ritm</dt>
                <dd className="font-display mt-0.5 text-xl text-slate-200">Meci cu meci</dd>
              </div>
            </dl>
          )}
        </div>
      </header>

      {hasHistory ? (
        <LeaderboardRace timeline={timeline} />
      ) : (
        <section className="rounded-[28px] border border-dashed border-slate-700 bg-slate-950/40 px-6 py-12 text-center">
          <p className="font-display text-2xl uppercase text-slate-200">Cursa nu e disponibilă</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Nu există încă suficiente rezultate punctate pentru a reconstrui istoria clasamentului.
          </p>
          <Link
            href="/clasament"
            className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-emerald-400 px-5 text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-950 transition hover:bg-emerald-300"
          >
            Vezi clasamentul
          </Link>
        </section>
      )}
    </div>
  );
}
