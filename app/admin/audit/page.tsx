import { prisma } from "@/lib/prisma";

const FMT = new Intl.DateTimeFormat("ro-RO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const ACTION_LABEL: Record<string, { label: string; tone: string }> = {
  "result.save":      { label: "Rezultat salvat",     tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" },
  "result.clear":     { label: "Rezultat golit",      tone: "border-rose-500/30 bg-rose-500/10 text-rose-200" },
  "user.update":      { label: "Utilizator modificat", tone: "border-amber-500/30 bg-amber-500/10 text-amber-200" },
  "invite.toggle":    { label: "Cod (de)activat",     tone: "border-sky-500/30 bg-sky-500/10 text-sky-200" },
  "invite.rotate":    { label: "Cod rotit",           tone: "border-sky-500/30 bg-sky-500/10 text-sky-200" },
  "snapshot.push":    { label: "Backup cron",         tone: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200" },
  "snapshot.download": { label: "Backup manual",      tone: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200" },
};

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const entries = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-rose-300/80">
          Admin · Audit
        </p>
        <div className="flex items-end justify-between gap-3">
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-slate-50 sm:text-4xl">
            Istoric acțiuni
          </h1>
          <span className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
            ultimele {entries.length}
          </span>
        </div>
        <p className="text-sm text-slate-400">
          Fiecare acțiune de admin se loghează aici — rezultate, modificări de utilizatori, rotații de cod, backupuri.
        </p>
      </section>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center text-sm text-slate-500">
          Nicio acțiune logată încă.
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => {
            const meta = ACTION_LABEL[e.action] ?? { label: e.action, tone: "border-slate-700 bg-slate-800/60 text-slate-300" };
            return (
              <li
                key={e.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4"
              >
                <header className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${meta.tone}`}>
                    {meta.label}
                  </span>
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                    {FMT.format(new Date(e.createdAt))}
                  </span>
                </header>
                <div className="mt-2 flex items-baseline gap-2 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">{e.actorUsername}</span>
                  <span className="font-mono text-[10px] text-slate-600">{e.action}</span>
                </div>
                <pre className="mt-2 overflow-x-auto rounded-lg border border-slate-800/60 bg-slate-950/60 p-2 text-[11px] leading-relaxed text-slate-400">
{JSON.stringify(e.payload, null, 2)}
                </pre>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
