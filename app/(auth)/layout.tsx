export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <BackgroundGlow />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <header className="mb-8 space-y-2 text-center">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.32em] text-emerald-200">
            <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            InRing
          </p>
          <h1 className="font-display text-4xl font-extrabold uppercase tracking-[0.04em] text-slate-50 sm:text-5xl">
            Cupa<span className="text-emerald-400">Mondiala</span>
            <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">
              2026
            </span>
          </h1>
          <p className="mx-auto max-w-xs text-sm text-slate-400">
            Turneul InRing de pronosticuri Cupa Mondială
          </p>
        </header>

        {children}
      </div>
    </div>
  );
}

function BackgroundGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-72 w-72 translate-x-1/4 translate-y-1/4 rounded-full bg-amber-500/10 blur-3xl" />
    </div>
  );
}
