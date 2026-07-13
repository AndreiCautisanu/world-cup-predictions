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
            ? `${totalPlayers} jucători au strâns laolaltă ${totalPoints} de puncte. Primele locuri se joacă în finalul grupelor.`
            : `Sunt ${totalPlayers} jucători înscriși. Punctajele apar după primele rezultate.`}
        </p>
      </header>

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
