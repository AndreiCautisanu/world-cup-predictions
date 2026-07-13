import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const FMT = new Intl.DateTimeFormat("ro-RO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminBackupPage() {
  const ghConfigured = !!(
    process.env.BACKUP_GITHUB_REPO && process.env.BACKUP_GITHUB_TOKEN
  );
  const repo = process.env.BACKUP_GITHUB_REPO;
  const branch = process.env.BACKUP_GITHUB_BRANCH ?? "main";
  const path = process.env.BACKUP_GITHUB_PATH ?? "snapshot.json";

  const [lastPush, lastDownload, counts] = await Promise.all([
    prisma.adminAuditLog.findFirst({
      where: { action: "snapshot.push" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.adminAuditLog.findFirst({
      where: { action: "snapshot.download" },
      orderBy: { createdAt: "desc" },
    }),
    Promise.all([
      prisma.user.count(),
      prisma.matchPrediction.count(),
      prisma.groupStandingPrediction.count(),
      prisma.bonusPrediction.count(),
    ]),
  ]);
  const [users, matchPreds, standings, bonus] = counts;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-rose-300/80">
          Admin · Backup
        </p>
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-slate-50 sm:text-4xl">
          Backup & restaurare
        </h1>
        <p className="max-w-prose text-sm text-slate-400">
          Toate datele de utilizatori și predicții se pot exporta ca JSON. Datele despre meciuri/echipe/grupe nu se backup-ează — sunt recreate prin <code className="rounded bg-slate-800 px-1 text-[12px]">npm run db:bootstrap</code>.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
          Acum în DB
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          <Stat label="Utilizatori" value={users} />
          <Stat label="Predicții meciuri" value={matchPreds} />
          <Stat label="Predicții clasamente" value={standings} />
          <Stat label="Predicții bonus" value={bonus} />
        </dl>
      </section>

      <section className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/5 via-slate-900/40 to-slate-900/60 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-fuchsia-200/80">
          Export manual
        </p>
        <h2 className="font-display mt-1 text-xl font-extrabold uppercase tracking-tight text-slate-50">
          Descarcă snapshot acum
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Un JSON cu toți utilizatorii, predicțiile, codurile de invitație și logul de audit. Păstrează-l undeva sigur — conține hash-uri de parolă.
        </p>
        <a
          href="/api/admin/snapshot"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-fuchsia-500 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-50 transition hover:bg-fuchsia-400"
        >
          ↓ Descarcă JSON
        </a>
        {lastDownload && (
          <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Ultima descărcare: {FMT.format(new Date(lastDownload.createdAt))} · {lastDownload.actorUsername}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
          Backup automat
        </p>
        <h2 className="font-display mt-1 text-xl font-extrabold uppercase tracking-tight text-slate-50">
          GitHub
        </h2>

        {ghConfigured ? (
          <>
            <div className="mt-3 space-y-1 text-sm text-slate-300">
              <p>
                <span className="text-slate-500">Repo:</span>{" "}
                <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs">{repo}</code>
              </p>
              <p>
                <span className="text-slate-500">Branch:</span>{" "}
                <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs">{branch}</code>
              </p>
              <p>
                <span className="text-slate-500">Fișier:</span>{" "}
                <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs">{path}</code>
              </p>
            </div>
            {lastPush ? (
              <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-200">
                ✓ Ultimul push automat: {FMT.format(new Date(lastPush.createdAt))}
              </p>
            ) : (
              <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
                Variabile setate, dar niciun push nu s-a făcut încă. Verifică Railway cron.
              </p>
            )}
          </>
        ) : (
          <div className="mt-3 space-y-3 text-sm text-slate-400">
            <p>
              Pentru backup automat pe GitHub, setează aceste variabile pe Railway:
            </p>
            <ul className="space-y-1 text-xs">
              <li>
                <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono">BACKUP_GITHUB_REPO</code>{" "}
                = <span className="text-slate-500">owner/repo (privat recomandat)</span>
              </li>
              <li>
                <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono">BACKUP_GITHUB_TOKEN</code>{" "}
                = <span className="text-slate-500">fine-grained PAT cu contents:write pe repo</span>
              </li>
              <li>
                <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono">BACKUP_GITHUB_BRANCH</code>{" "}
                = <span className="text-slate-500">opțional, default „main”</span>
              </li>
              <li>
                <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono">BACKUP_GITHUB_PATH</code>{" "}
                = <span className="text-slate-500">opțional, default „snapshot.json”</span>
              </li>
            </ul>
            <p className="text-xs">
              Apoi adaugă o Railway Cron care face <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px]">POST /api/admin/snapshot</code> cu antetul <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px]">Authorization: Bearer $CRON_SECRET</code> (aceeași cheie folosită pentru sync-results).
            </p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
        <h3 className="font-display text-base font-bold uppercase tracking-tight text-slate-100">
          Cum se restaurează
        </h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-400">
          <li>Descarcă snapshot.json (manual sau din GitHub).</li>
          <li>
            Rulează <code className="rounded bg-slate-800 px-1 text-xs">scripts/_restore-snapshot.ts &lt;file&gt;</code> — script de restaurare existent ca utilitar în repo.
          </li>
          <li>Verifică pe <a href="/clasament" className="text-emerald-300 hover:text-emerald-200">/clasament</a> că totalurile s-au întors.</li>
        </ol>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </dt>
      <dd className="font-display text-lg font-extrabold tabular-nums text-slate-50">
        {value}
      </dd>
    </div>
  );
}
