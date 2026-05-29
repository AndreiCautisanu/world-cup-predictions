import { BottomNav } from "@/components/BottomNav";
import { auth } from "@/auth";
import { getSessionUser } from "@/lib/session";
import Link from "next/link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = getSessionUser(await auth());

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/80 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/clasament" className="group inline-flex items-baseline gap-2">
            <span className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.32em] text-emerald-200 transition group-hover:border-emerald-400/60">
              InRing
            </span>
            <span className="font-display text-xl font-extrabold uppercase tracking-[0.04em] text-slate-50">
              Cupa<span className="text-emerald-400">Mondiala</span>
            </span>
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500 sm:inline">
              2026
            </span>
          </Link>
          {user?.isAdmin && (
            <Link
              href="/admin/rezultate"
              className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200 transition hover:border-amber-400/60"
            >
              Admin
            </Link>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      <BottomNav />
    </div>
  );
}
