import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSessionUser } from "@/lib/session";

const TABS = [
  { href: "/admin/rezultate", label: "Rezultate" },
  { href: "/admin/utilizatori", label: "Utilizatori" },
  { href: "/admin/cod-invitatie", label: "Cod invitație" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = getSessionUser(await auth());
  if (!user?.isAdmin) redirect("/clasament");

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 border-b border-rose-900/40 bg-slate-950/85 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-slate-950/70">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-rose-200">
              Admin
            </span>
            <span className="font-display text-xl font-extrabold uppercase tracking-[0.04em] text-slate-50">
              <span className="text-rose-400/80">InRing</span> · Cupa<span className="text-rose-400">Mondiala</span>
            </span>
          </div>
          <Link
            href="/clasament"
            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 transition hover:text-slate-200"
          >
            ← Ieși din admin
          </Link>
        </div>
        <nav
          aria-label="Secțiuni admin"
          className="mx-auto mt-3 flex max-w-4xl gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              prefetch={false}
              className="shrink-0 rounded-full border border-slate-800 bg-slate-900/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-100"
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
