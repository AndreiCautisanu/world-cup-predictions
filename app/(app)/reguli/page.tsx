export const metadata = {
  title: "Reguli · InRing · Cupa Mondiala 2026",
};

const GROUP_TIERS = [
  { pts: 0, label: "Rezultat greșit", example: "predicție 2-1 / real 0-2", tone: "miss" as const },
  { pts: 2, label: "Doar rezultatul corect", example: "predicție 2-1 / real 3-0", tone: "partial" as const },
  { pts: 4, label: "Rezultat corect + scorul unei echipe", example: "predicție 2-1 / real 2-0", tone: "close" as const },
  { pts: 7, label: "Scor exact", example: "predicție 2-1 / real 2-1", tone: "exact" as const },
];

const KO_TIERS = [
  { pts: 0, label: "Câștigător greșit", example: "ai zis Brazilia, a câștigat Franța", tone: "miss" as const },
  { pts: 4, label: "Doar câștigătorul corect", example: "ai zis 2-1 Brazilia, real 3-0 Brazilia", tone: "partial" as const },
  { pts: 8, label: "Câștigător + scor exact la 90 de minute", example: "ai zis 2-1, real 2-1 în timp regulamentar", tone: "exact" as const },
  { pts: 10, label: "... + prelungiri/penalty-uri ghicite", example: "ai bifat „Prelungiri” și meciul a mers acolo", tone: "perfect" as const },
];

const DARK_HORSE = [
  { round: "Eliminată în grupe", pts: 0 },
  { round: "Calificată în 16-imi", pts: 3 },
  { round: "Calificată în optimi", pts: 6 },
  { round: "Calificată în sferturi", pts: 10 },
  { round: "Calificată în semifinale", pts: 15 },
  { round: "Finalistă", pts: 22 },
  { round: "Campioană", pts: 30 },
];

const BONUS = [
  { label: "Campion", pts: 20, hint: "Echipa care câștigă turneul." },
  { label: "Finalist", pts: 10, hint: "Echipa care pierde finala." },
  { label: "Golgheter", pts: 15, hint: "Jucătorul cu cele mai multe goluri." },
  { label: "Surpriza turneului", pts: "0–30", hint: "Echipă din urna 3 sau 4 — punctaj progresiv." },
];

const TONE_BADGE = {
  miss: "border-rose-500/40 bg-rose-500/15 text-rose-200",
  partial: "border-amber-500/40 bg-amber-500/15 text-amber-200",
  close: "border-sky-500/40 bg-sky-500/15 text-sky-200",
  exact: "border-emerald-400/50 bg-emerald-500/20 text-emerald-200",
  perfect: "border-yellow-300/60 bg-yellow-400/20 text-yellow-100 shadow-[0_0_18px_-2px_rgba(250,204,21,0.45)]",
};

export default function ReguliPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-emerald-300/70">
          Reguli
        </p>
        <h1 className="font-display text-4xl font-extrabold uppercase leading-[1.05] tracking-tight text-slate-50 sm:text-5xl">
          Cum se acordă punctele
        </h1>
        <p className="max-w-prose text-sm text-slate-400">
          Pronostici scoruri, ordinea grupelor și câteva bonusuri pre-turneu. Cu cât e mai precis pronosticul, cu atât mai multe puncte. Maxim posibil: <span className="font-semibold text-slate-200">1043 puncte</span>.
        </p>
      </header>

      <Section accent="emerald" eyebrow="Meciurile din grupe" title="Etapele 1, 2, 3 · max 7 pct / meci">
        <p className="text-sm text-slate-400">
          Pentru fiecare meci din grupe pronostici scorul final. Punctele depind de cât te apropii:
        </p>
        <TierTable rows={GROUP_TIERS} />
        <Callout>
          72 de meciuri × maxim 7 puncte = <strong className="text-slate-100">504 pct</strong> din meciurile grupelor.
        </Callout>
      </Section>

      <Section accent="amber" eyebrow="Meciurile eliminatorii" title="Optimi → finală · max 10 pct / meci">
        <p className="text-sm text-slate-400">
          La eliminatorii contează cine se califică, nu doar scorul. Pentru meciurile care merg în prelungiri sau la penalty-uri, scorul din predicția ta se referă la sfârșitul timpului regulamentar (90 de minute). Bifează „Prelungiri” sau „Penalty-uri” dacă crezi că meciul ajunge acolo.
        </p>
        <TierTable rows={KO_TIERS} />
        <Callout>
          32 de meciuri × maxim 10 puncte = <strong className="text-slate-100">320 pct</strong> din eliminatorii.
        </Callout>
      </Section>

      <Section accent="sky" eyebrow="Clasamentul grupelor" title="Ordinea finală · 3 pct / loc corect">
        <p className="text-sm text-slate-400">
          Înainte de turneu plasezi cele 4 echipe din fiecare grupă în ordinea finală pe care o anticipezi. <strong className="text-slate-100">3 puncte pentru fiecare echipă plasată corect</strong> — fără bonus pentru ordinea completă, fiecare poziție are aceeași greutate.
        </p>
        <Callout>
          12 grupe × 12 puncte = <strong className="text-slate-100">144 pct</strong> din clasamente.
        </Callout>
      </Section>

      <Section accent="fuchsia" eyebrow="Bonusuri" title="Predicții pre-turneu · max 75 pct">
        <p className="text-sm text-slate-400">
          Patru predicții făcute o singură dată, înainte de turneu. Se blochează la primul fluier și se evaluează pe parcurs.
        </p>
        <ul className="space-y-2">
          {BONUS.map((b) => (
            <li
              key={b.label}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-display text-base font-bold uppercase tracking-tight text-slate-100">
                  {b.label}
                </p>
                <p className="text-xs text-slate-500">{b.hint}</p>
              </div>
              <span className="shrink-0 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1 font-display text-sm font-bold tabular-nums text-fuchsia-200">
                {b.pts} pct
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 rounded-xl border border-violet-400/30 bg-violet-500/5 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-200/80">
            Surpriza turneului — punctaj progresiv
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Alegi o echipă din urna 3 sau urna 4. Cu cât merge mai departe, cu atât mai multe puncte. Cumulativ — nu primești bonus pentru fiecare rundă în plus, ci punctajul rundei celei mai înalte la care a ajuns.
          </p>
          <ul className="mt-3 divide-y divide-slate-800/70 text-sm">
            {DARK_HORSE.map((d) => (
              <li key={d.round} className="flex items-center justify-between gap-3 py-1.5">
                <span className="text-slate-300">{d.round}</span>
                <span className="font-display text-base font-bold tabular-nums text-slate-50">
                  {d.pts}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section accent="rose" eyebrow="Blocarea pronosticurilor" title="Când se închid bilețele">
        <ul className="space-y-3 text-sm text-slate-300">
          <li className="flex items-start gap-3">
            <span aria-hidden className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-rose-400" />
            <div>
              <strong className="text-slate-100">Meciurile</strong> — pronosticul se blochează{" "}
              <strong className="text-slate-100">cu o oră înainte de fluierul de start</strong>. După blocare nu mai poți modifica scorul.
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span aria-hidden className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-rose-400" />
            <div>
              <strong className="text-slate-100">Clasamentul grupelor</strong> și{" "}
              <strong className="text-slate-100">bonusurile</strong> — se blochează la{" "}
              <strong className="text-slate-100">primul fluier al turneului</strong>, când începe primul meci.
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span aria-hidden className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-rose-400" />
            <div>
              Dacă te alături mai târziu, nu poți pronostica meciuri care deja s-au jucat (sau care s-au blocat). Restul rămân deschise.
            </div>
          </li>
        </ul>
      </Section>

      <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/70 to-slate-950 p-6 ring-1 ring-slate-800/60">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">
          Total maxim
        </p>
        <p className="mt-2 font-display text-5xl font-extrabold leading-none text-slate-50">
          1043 <span className="text-base font-semibold uppercase tracking-[0.32em] text-slate-500">pct</span>
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          <Component label="Grupe" value="504" tone="emerald" />
          <Component label="Clasamente" value="144" tone="sky" />
          <Component label="Knockout" value="320" tone="amber" />
          <Component label="Bonus" value="75" tone="fuchsia" />
        </dl>
        <p className="mt-4 text-xs text-slate-500">
          Realist, jucătorii ajung pe la 200–450 puncte. Cine trece de 500 va fi un magician.
        </p>
      </section>
    </div>
  );
}

function Section({
  accent,
  eyebrow,
  title,
  children,
}: {
  accent: "emerald" | "amber" | "sky" | "fuchsia" | "rose";
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  const accentTone: Record<typeof accent, string> = {
    emerald: "text-emerald-300/80",
    amber: "text-amber-300/80",
    sky: "text-sky-300/80",
    fuchsia: "text-fuchsia-300/80",
    rose: "text-rose-300/80",
  };
  const stripe: Record<typeof accent, string> = {
    emerald: "from-emerald-400 to-emerald-600",
    amber: "from-amber-300 via-amber-400 to-amber-500",
    sky: "from-sky-400 to-sky-600",
    fuchsia: "from-fuchsia-400 to-purple-600",
    rose: "from-rose-400 to-rose-600",
  };
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/40 p-6">
      <span aria-hidden className={`absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b ${stripe[accent]}`} />
      <p className={`text-[10px] font-semibold uppercase tracking-[0.32em] ${accentTone[accent]}`}>
        {eyebrow}
      </p>
      <h2 className="font-display mt-1 text-2xl font-extrabold uppercase leading-tight tracking-tight text-slate-50 sm:text-3xl">
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function TierTable({
  rows,
}: {
  rows: Array<{ pts: number; label: string; example: string; tone: keyof typeof TONE_BADGE }>;
}) {
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li
          key={r.pts}
          className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3 sm:items-center"
        >
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm font-semibold text-slate-100">{r.label}</p>
            <p className="text-xs italic text-slate-500">{r.example}</p>
          </div>
          <span
            className={`shrink-0 rounded-full border px-3 py-1 font-display text-sm font-bold tabular-nums ${TONE_BADGE[r.tone]}`}
          >
            {r.pts === 0 ? "0" : `+${r.pts}`} pct
          </span>
        </li>
      ))}
    </ul>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-slate-800/60 bg-slate-900/30 px-3 py-2 text-xs text-slate-400">
      {children}
    </p>
  );
}

function Component({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "sky" | "amber" | "fuchsia";
}) {
  const dot: Record<typeof tone, string> = {
    emerald: "bg-emerald-400",
    sky: "bg-sky-400",
    amber: "bg-amber-400",
    fuchsia: "bg-fuchsia-400",
  };
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="flex items-center gap-2 text-xs text-slate-300">
        <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${dot[tone]}`} />
        {label}
      </dt>
      <dd className="font-display text-sm font-bold tabular-nums text-slate-100">{value}</dd>
    </div>
  );
}
