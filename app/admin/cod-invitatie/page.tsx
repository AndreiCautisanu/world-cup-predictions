import { prisma } from "@/lib/prisma";
import { CodInvitatieForm } from "./CodInvitatieForm";

const HISTORY_FORMATTER = new Intl.DateTimeFormat("ro-RO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function CodInvitatiePage() {
  const codes = await prisma.inviteCode.findMany({ orderBy: { createdAt: "desc" } });
  const active = codes.find((c) => c.isActive) ?? null;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-rose-300/80">
          Admin · Acces
        </p>
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-slate-50 sm:text-4xl">
          Cod de invitație
        </h1>
        <p className="text-sm text-slate-400">
          Toți cei care vor să se înscrie au nevoie de codul activ. Rotește-l dacă se scurge.
        </p>
      </section>

      <section className="rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-slate-900/40 to-slate-900/60 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-rose-200/70">
          Cod activ
        </p>
        {active ? (
          <p className="mt-2 font-display text-3xl font-extrabold uppercase tracking-[0.08em] text-slate-50">
            {active.code}
          </p>
        ) : (
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
            Înregistrările sunt închise
          </p>
        )}
        <CodInvitatieForm active={!!active} />
      </section>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
          Istoric
        </h2>
        <ul className="mt-2 space-y-1.5">
          {codes.map((c) => (
            <li
              key={c.id}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                c.isActive
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-100"
                  : "border-slate-800 bg-slate-900/30 text-slate-500 line-through"
              }`}
            >
              <span className="font-mono text-sm">{c.code}</span>
              <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                {HISTORY_FORMATTER.format(new Date(c.createdAt))}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
