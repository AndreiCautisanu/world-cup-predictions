export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-900 text-white px-6">
      <div className="text-center space-y-8 max-w-lg">

        {/* InRing wordmark */}
        <div className="space-y-1">
          <p className="text-zinc-500 text-sm uppercase tracking-[0.3em] font-medium">InRing prezintă</p>
          <h1 className="text-6xl font-black tracking-tight text-white">INRING</h1>
          <p className="text-zinc-400 text-base uppercase tracking-[0.25em]">Wrestling</p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-zinc-700" />
          <span className="text-2xl">⚽</span>
          <div className="flex-1 h-px bg-zinc-700" />
        </div>

        {/* Teaser */}
        <div className="space-y-3">
          <h2 className="text-3xl font-bold tracking-tight">
            Cupa Mondiala 2026
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Pronosticuri și clasament live.
          </p>
          <p className="text-zinc-600 text-sm">
            În curând.
          </p>
        </div>

        {/* Coming soon pill */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-700 text-zinc-400 text-sm">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          În dezvoltare
        </div>

      </div>
    </main>
  );
}
