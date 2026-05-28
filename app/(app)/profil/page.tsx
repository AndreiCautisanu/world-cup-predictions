import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { buildDisplayName, summarizeLeaderboardRows } from "@/lib/leaderboard";
import { ProfileForms } from "@/components/ProfileForms";
import { handleSignOut } from "./actions";

export const dynamic = "force-dynamic";

export default async function Profil() {
  const userId = getSessionUser(await auth())?.id;
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      isAdmin: true,
      matchPredictions: {
        select: { pointsAwarded: true, match: { select: { round: true } } },
      },
      groupStandingPredictions: { select: { pointsAwarded: true } },
      bonusPrediction: {
        select: {
          championPts: true,
          runnerUpPts: true,
          topScorerPts: true,
          darkHorsePts: true,
        },
      },
    },
  });
  if (!user) redirect("/login");

  const [row] = summarizeLeaderboardRows([
    {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      matchPredictions: user.matchPredictions,
      groupStandingPredictions: user.groupStandingPredictions,
      bonusPrediction: user.bonusPrediction,
    },
  ]);

  const displayName = buildDisplayName(user);
  const total = row?.total ?? 0;
  const submittedMatchCount = user.matchPredictions.length;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-emerald-300/70">
          Profil
        </p>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0 flex-1">
            <h1 className="font-display truncate text-4xl font-extrabold uppercase tracking-tight text-slate-50 sm:text-5xl">
              {displayName}
            </h1>
            <p className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>@{user.username}</span>
              {user.isAdmin && (
                <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-rose-200">
                  admin
                </span>
              )}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-5xl font-extrabold leading-none text-slate-50 sm:text-6xl">
              {total}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">
              puncte
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em]">
          <Link
            href={`/jucator/${encodeURIComponent(user.username)}`}
            className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-emerald-200 transition hover:border-emerald-400/60"
          >
            Pagina ta publică →
          </Link>
          <span className="rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1 text-slate-400">
            {submittedMatchCount} predicții
          </span>
        </div>
      </header>

      <ProfileForms
        initial={{
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
        }}
      />

      <article className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 ring-1 ring-slate-800/60">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-rose-300/80">
          Sesiune
        </p>
        <h3 className="font-display mt-1 text-lg font-extrabold uppercase tracking-tight text-slate-50">
          Ieși din cont
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Te delogăm din acest dispozitiv. Vei avea nevoie de parolă pentru a intra din nou.
        </p>
        <form action={handleSignOut} className="mt-4">
          <button
            type="submit"
            className="rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.18em] text-rose-200 transition hover:border-rose-400/60 hover:bg-rose-500/20"
          >
            Delogare
          </button>
        </form>
      </article>
    </div>
  );
}
