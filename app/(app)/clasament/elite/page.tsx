import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getLeaderboard } from "@/lib/leaderboard";
import { ClasamentBody } from "../_leaderboard";

export const dynamic = "force-dynamic";

const ELITE_NAMES = [
  "Vlad Dumitrache",
  "Razvan Raul",
  "Alexandru AD",
  "Octavian Moose",
  "Sebastian Cirstoninovic",
  "Lorin-Iulian Adam",
  "Stefan Doncu",
  "Eduard Sebastian",
  "Andrei Cautisanu",
  "Adrian Todosi",
  "Alexander Cojocaru",
];

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .trim();
}

const ELITE_NORMALIZED = new Set(ELITE_NAMES.map(normalize));

export default async function ElitePage() {
  const meId = getSessionUser(await auth())?.id;
  const allRows = await getLeaderboard(prisma);
  const rows = allRows.filter((r) => ELITE_NORMALIZED.has(normalize(r.displayName)));

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Link
          href="/clasament"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500 transition hover:text-slate-300"
        >
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 10H5M9 5l-5 5 5 5" />
          </svg>
          Clasament general
        </Link>
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none tracking-tight text-slate-50 sm:text-5xl">
          Elitele
        </h1>
        <p className="max-w-prose text-sm text-slate-400">
          Clasamentul grupului de chat. {rows.length} jucători aleși.
        </p>
      </header>

      <ClasamentBody rows={rows} meId={meId} />
    </div>
  );
}
