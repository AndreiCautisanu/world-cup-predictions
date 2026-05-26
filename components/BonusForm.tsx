"use client";

import { useCallback, useMemo, useState } from "react";

type Team = { id: number; name: string; flagEmoji: string; pot: number };

type Initial = {
  championTeamId: number | null;
  runnerUpTeamId: number | null;
  topScorerName: string;
  darkHorseTeamId: number | null;
};

type Props = {
  allTeams: Team[];
  initial: Initial;
  locked: boolean;
};

type Accent = "gold" | "silver" | "sky" | "violet";

const ACCENTS: Record<
  Accent,
  {
    stripe: string;
    ring: string;
    text: string;
    chip: string;
  }
> = {
  gold: {
    stripe: "bg-gradient-to-b from-amber-300 via-amber-400 to-yellow-600",
    ring: "ring-amber-400/30",
    text: "text-amber-200",
    chip: "bg-amber-500/10 ring-amber-400/30 text-amber-200",
  },
  silver: {
    stripe: "bg-gradient-to-b from-slate-200 via-slate-300 to-slate-500",
    ring: "ring-slate-300/30",
    text: "text-slate-200",
    chip: "bg-slate-300/10 ring-slate-300/30 text-slate-100",
  },
  sky: {
    stripe: "bg-gradient-to-b from-sky-300 via-sky-400 to-sky-600",
    ring: "ring-sky-400/30",
    text: "text-sky-200",
    chip: "bg-sky-500/10 ring-sky-400/30 text-sky-200",
  },
  violet: {
    stripe: "bg-gradient-to-b from-fuchsia-300 via-fuchsia-400 to-purple-600",
    ring: "ring-fuchsia-400/30",
    text: "text-fuchsia-200",
    chip: "bg-fuchsia-500/10 ring-fuchsia-400/30 text-fuchsia-200",
  },
};

export function BonusForm({ allTeams, initial, locked }: Props) {
  const darkHorseTeams = useMemo(
    () => allTeams.filter((t) => t.pot === 3 || t.pot === 4),
    [allTeams]
  );

  const [championTeamId, setChampionTeamId] = useState<number | null>(
    initial.championTeamId
  );
  const [runnerUpTeamId, setRunnerUpTeamId] = useState<number | null>(
    initial.runnerUpTeamId
  );
  const [topScorerName, setTopScorerName] = useState<string>(
    initial.topScorerName ?? ""
  );
  const [darkHorseTeamId, setDarkHorseTeamId] = useState<number | null>(
    initial.darkHorseTeamId
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [lastSaved, setLastSaved] = useState<Initial>(initial);

  const trimmedTopScorer = topScorerName.trim();
  const championRunnerUpSame =
    championTeamId !== null && championTeamId === runnerUpTeamId;
  const missingField =
    championTeamId === null ||
    runnerUpTeamId === null ||
    darkHorseTeamId === null ||
    trimmedTopScorer.length < 2;

  const isDirty =
    championTeamId !== lastSaved.championTeamId ||
    runnerUpTeamId !== lastSaved.runnerUpTeamId ||
    darkHorseTeamId !== lastSaved.darkHorseTeamId ||
    trimmedTopScorer !== (lastSaved.topScorerName ?? "").trim();

  const everSaved =
    lastSaved.championTeamId !== null &&
    lastSaved.runnerUpTeamId !== null &&
    lastSaved.darkHorseTeamId !== null &&
    (lastSaved.topScorerName ?? "").trim().length >= 2;

  const canSave =
    !locked &&
    !saving &&
    !missingField &&
    !championRunnerUpSame &&
    isDirty;

  const save = useCallback(async () => {
    if (
      !canSave ||
      championTeamId === null ||
      runnerUpTeamId === null ||
      darkHorseTeamId === null
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    setStatus("idle");
    try {
      const res = await fetch("/api/predictions/bonus", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          championTeamId,
          runnerUpTeamId,
          topScorerName: trimmedTopScorer,
          darkHorseTeamId,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "A apărut o eroare");
        setStatus("error");
        return;
      }
      setLastSaved({
        championTeamId,
        runnerUpTeamId,
        topScorerName: trimmedTopScorer,
        darkHorseTeamId,
      });
      setStatus("saved");
    } catch {
      setError("Conexiune întreruptă");
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }, [
    canSave,
    championTeamId,
    runnerUpTeamId,
    darkHorseTeamId,
    trimmedTopScorer,
  ]);

  const championPreview = allTeams.find((t) => t.id === championTeamId);
  const runnerUpPreview = allTeams.find((t) => t.id === runnerUpTeamId);
  const darkHorsePreview = allTeams.find((t) => t.id === darkHorseTeamId);

  return (
    <div className="space-y-4">
      <BonusCard
        accent="gold"
        eyebrow="Trofeu suprem"
        title="Campion"
        points="20 pts"
        preview={championPreview}
      >
        <TeamSelect
          ariaLabel="Campion"
          value={championTeamId}
          teams={allTeams}
          onChange={setChampionTeamId}
          locked={locked}
          invalid={championRunnerUpSame}
        />
      </BonusCard>

      <BonusCard
        accent="silver"
        eyebrow="Finalistă învinsă"
        title="Finalist"
        points="10 pts"
        preview={runnerUpPreview}
      >
        <TeamSelect
          ariaLabel="Finalist"
          value={runnerUpTeamId}
          teams={allTeams}
          onChange={setRunnerUpTeamId}
          locked={locked}
          invalid={championRunnerUpSame}
        />
        {championRunnerUpSame && (
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-300">
            Campionul și finalista trebuie să fie diferite
          </p>
        )}
      </BonusCard>

      <BonusCard
        accent="sky"
        eyebrow="Gheata de aur"
        title="Golgheter"
        points="15 pts"
      >
        <input
          type="text"
          aria-label="Golgheter"
          value={topScorerName}
          disabled={locked}
          onChange={(e) => setTopScorerName(e.target.value)}
          placeholder="Nume jucător"
          className="font-display w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm font-semibold uppercase tracking-[0.06em] text-slate-100 placeholder:text-slate-600 placeholder:normal-case shadow-inner outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </BonusCard>

      <BonusCard
        accent="violet"
        eyebrow="Surpriza turneului"
        title="Cal negru"
        points="0–30 pts"
        subtitle="Doar echipe din urna 3 sau 4"
        preview={darkHorsePreview}
      >
        <TeamSelect
          ariaLabel="Cal negru"
          value={darkHorseTeamId}
          teams={darkHorseTeams}
          onChange={setDarkHorseTeamId}
          locked={locked}
          showPot
        />
      </BonusCard>

      {!locked && (
        <div className="sticky bottom-20 -mx-4 flex items-center justify-between gap-3 border-y border-slate-800/70 bg-slate-950/80 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:rounded-2xl sm:border">
          <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            {missingField
              ? "Completează toate câmpurile"
              : championRunnerUpSame
                ? "Echipe identice"
                : isDirty
                  ? everSaved
                    ? "Modificări nesalvate"
                    : "Apasă „Salvează"
                  : everSaved
                    ? "Pronostic salvat"
                    : "Niciun pronostic încă"}
          </span>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!canSave}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isDirty && !missingField && !championRunnerUpSame
                ? "bg-amber-400 text-amber-950 shadow-[0_0_0_1px_rgba(251,191,36,0.5)] hover:bg-amber-300"
                : everSaved
                  ? "bg-emerald-500/20 text-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]"
                  : "bg-emerald-500 text-emerald-950 shadow-[0_0_0_1px_rgba(16,185,129,0.4)] hover:bg-emerald-400"
            }`}
          >
            {saving
              ? "Se salvează…"
              : status === "error"
                ? "Reîncearcă"
                : everSaved && !isDirty
                  ? "Salvat ✓"
                  : everSaved
                    ? "Actualizează"
                    : "Salvează"}
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-2xl border border-rose-500/30 bg-rose-500/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}

function BonusCard({
  accent,
  eyebrow,
  title,
  points,
  subtitle,
  preview,
  children,
}: {
  accent: Accent;
  eyebrow: string;
  title: string;
  points: string;
  subtitle?: string;
  preview?: { name: string; flagEmoji: string; pot?: number };
  children: React.ReactNode;
}) {
  const a = ACCENTS[accent];
  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-slate-950 shadow-lg shadow-black/20 backdrop-blur ring-1 transition ${a.ring}`}
    >
      <span aria-hidden className={`absolute inset-y-0 left-0 w-[3px] ${a.stripe}`} />

      <header className="flex items-center justify-between gap-3 border-b border-slate-800/70 px-4 py-2.5">
        <div className="flex min-w-0 flex-col">
          <span
            className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${a.text}`}
          >
            {eyebrow}
          </span>
          <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-slate-50">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-slate-500">{subtitle}</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ring-1 ${a.chip}`}
        >
          {points}
        </span>
      </header>

      <div className="px-4 py-3">{children}</div>

      {preview && (
        <div className="flex items-center gap-3 border-t border-slate-800/70 bg-slate-950/40 px-4 py-2.5">
          <span className="text-2xl leading-none drop-shadow" aria-hidden>
            {preview.flagEmoji}
          </span>
          <span className="font-display truncate text-sm font-semibold uppercase tracking-[0.06em] text-slate-100">
            {preview.name}
          </span>
        </div>
      )}
    </article>
  );
}

function TeamSelect({
  ariaLabel,
  value,
  teams,
  onChange,
  locked,
  invalid,
  showPot,
}: {
  ariaLabel: string;
  value: number | null;
  teams: Team[];
  onChange: (id: number) => void;
  locked: boolean;
  invalid?: boolean;
  showPot?: boolean;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value ?? ""}
      disabled={locked}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`font-display w-full rounded-lg border bg-slate-950/70 px-3 py-2 text-sm font-semibold uppercase tracking-[0.06em] text-slate-100 shadow-inner outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
        invalid
          ? "border-rose-500/60 focus:border-rose-400 focus:ring-rose-400/30"
          : "border-slate-700 focus:border-emerald-400 focus:ring-emerald-400/30"
      }`}
    >
      <option value="" disabled>
        Alege o echipă
      </option>
      {teams.map((t) => (
        <option key={t.id} value={t.id}>
          {t.flagEmoji} {t.name}
          {showPot ? ` · urna ${t.pot}` : ""}
        </option>
      ))}
    </select>
  );
}
