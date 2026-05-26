import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isTournamentLocked, tournamentLockTime } from "@/lib/locking";
import { BonusForm } from "@/components/BonusForm";

export default async function BonusPage() {
  const session = await auth();
  const userId = (session?.user as { id?: number } | undefined)?.id;
  if (!userId) redirect("/login");

  const [allTeams, existing, lockAt] = await Promise.all([
    prisma.team.findMany({
      orderBy: [{ pot: "asc" }, { name: "asc" }],
      select: { id: true, name: true, flagEmoji: true, pot: true },
    }),
    prisma.bonusPrediction.findUnique({ where: { userId } }),
    tournamentLockTime(prisma),
  ]);

  const locked = isTournamentLocked(lockAt);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-emerald-300/70">
          Pronosticuri · Bonus
        </p>
        <div className="flex items-end justify-between gap-3">
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-slate-50 sm:text-4xl">
            Marile pariuri
          </h1>
          <span
            className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.2em] ${
              existing
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-slate-800 bg-slate-900/60 text-slate-400"
            }`}
          >
            {existing ? "Trimis" : "În așteptare"}
          </span>
        </div>
        <p className="text-sm text-slate-400">
          Predicții pre-turneu, blocate la primul fluier. Punctaj concentrat —
          puține câmpuri, mize mari.
          {locked && (
            <span className="ml-1 text-rose-300">· Blocate</span>
          )}
        </p>
      </section>

      <nav
        aria-label="Navigație pronosticuri"
        className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em]"
      >
        <Link
          href="/pronosticuri"
          className="rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1 text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
        >
          ← Meciuri
        </Link>
        <Link
          href="/pronosticuri/clasament-grupe"
          className="rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1 text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
        >
          ← Clasament grupe
        </Link>
      </nav>

      <BonusForm
        allTeams={allTeams}
        initial={{
          championTeamId: existing?.championTeamId ?? null,
          runnerUpTeamId: existing?.runnerUpTeamId ?? null,
          topScorerName: existing?.topScorerName ?? "",
          darkHorseTeamId: existing?.darkHorseTeamId ?? null,
        }}
        locked={locked}
      />
    </div>
  );
}
