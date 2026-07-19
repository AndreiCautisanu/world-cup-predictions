import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getLeaderboard } from "@/lib/leaderboard";
import { ClasamentBody } from "./_leaderboard";

export const dynamic = "force-dynamic";

export default async function ClasamentPage() {
  const meId = getSessionUser(await auth())?.id;
  const rows = await getLeaderboard(prisma);

  const totalPlayers = rows.length;
  const totalPoints = rows.reduce((s, r) => s + r.total, 0);
  const anyPoints = totalPoints > 0;

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
            ? `${totalPlayers} jucători au strâns laolaltă ${totalPoints} de puncte. Clasamentul final păstrează toată povestea turneului.`
            : `Sunt ${totalPlayers} jucători înscriși. Punctajele apar după primele rezultate.`}
        </p>
      </header>

      {anyPoints && (
        <Link
          href="/clasament/cursa"
          className="group relative isolate block overflow-hidden rounded-3xl border border-emerald-400/25 bg-slate-950/70 p-5 transition hover:border-emerald-300/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 sm:p-6"
        >
          <span
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_0%,rgba(52,211,153,.16),transparent_38%)] opacity-80 transition group-hover:opacity-100"
          />
          <span className="flex items-start justify-between gap-5">
            <span className="min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-emerald-300/80">
                Retrospectiva turneului
              </span>
              <span className="font-display mt-2 block text-2xl uppercase leading-none text-slate-50 sm:text-3xl">
                Cursa turneului
              </span>
              <span className="mt-2 block max-w-md text-xs leading-5 text-slate-400 sm:text-sm">
                Vezi cum s-a schimbat clasamentul, meci cu meci — inclusiv cine a pornit tare și cine a rămas până la final.
              </span>
            </span>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-emerald-300/30 bg-emerald-400/10 text-lg text-emerald-200 transition group-hover:translate-x-1 group-hover:bg-emerald-400/20" aria-hidden>
              →
            </span>
          </span>
          <span className="mt-5 flex items-end gap-1.5" aria-hidden>
            {[42, 68, 54, 88, 73, 100].map((height, index) => (
              <span
                key={height}
                className="h-1.5 rounded-full bg-emerald-400/40 transition-all duration-500 group-hover:bg-emerald-300/70"
                style={{ width: `${height / 2 + 8}px`, transitionDelay: `${index * 35}ms` }}
              />
            ))}
          </span>
        </Link>
      )}

      <ClasamentBody rows={rows} meId={meId} />

      <div className="flex justify-center pt-4">
        <Link
          href="/clasament/elite"
          className="text-[10px] text-slate-800 transition-colors hover:text-slate-600 select-none"
          tabIndex={-1}
          aria-hidden
        >
          elitele
        </Link>
      </div>
    </div>
  );
}
