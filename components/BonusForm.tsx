"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { normalizeTopScorerName } from "@/lib/bonus";
import { FlagImage } from "./FlagImage";

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
    focusRing: string;
    focusBorder: string;
  }
> = {
  gold: {
    stripe: "bg-gradient-to-b from-amber-300 via-amber-400 to-yellow-600",
    ring: "ring-amber-400/30",
    text: "text-amber-200",
    chip: "bg-amber-500/10 ring-amber-400/30 text-amber-200",
    focusRing: "focus-within:ring-amber-400/30",
    focusBorder: "focus-within:border-amber-400",
  },
  silver: {
    stripe: "bg-gradient-to-b from-slate-200 via-slate-300 to-slate-500",
    ring: "ring-slate-300/30",
    text: "text-slate-200",
    chip: "bg-slate-300/10 ring-slate-300/30 text-slate-100",
    focusRing: "focus-within:ring-slate-300/30",
    focusBorder: "focus-within:border-slate-300",
  },
  sky: {
    stripe: "bg-gradient-to-b from-sky-300 via-sky-400 to-sky-600",
    ring: "ring-sky-400/30",
    text: "text-sky-200",
    chip: "bg-sky-500/10 ring-sky-400/30 text-sky-200",
    focusRing: "focus-within:ring-sky-400/30",
    focusBorder: "focus-within:border-sky-400",
  },
  violet: {
    stripe: "bg-gradient-to-b from-fuchsia-300 via-fuchsia-400 to-purple-600",
    ring: "ring-fuchsia-400/30",
    text: "text-fuchsia-200",
    chip: "bg-fuchsia-500/10 ring-fuchsia-400/30 text-fuchsia-200",
    focusRing: "focus-within:ring-fuchsia-400/30",
    focusBorder: "focus-within:border-fuchsia-400",
  },
};

const DARK_HORSE_BREAKDOWN: Array<{ round: string; pts: number }> = [
  { round: "Eliminată în grupe", pts: 0 },
  { round: "Calificată în 16-imi", pts: 3 },
  { round: "Calificată în optimi", pts: 6 },
  { round: "Calificată în sferturi", pts: 10 },
  { round: "Calificată în semifinale", pts: 15 },
  { round: "Finalistă", pts: 22 },
  { round: "Campioană", pts: 30 },
];

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
    normalizeTopScorerName(initial.topScorerName ?? "")
  );
  const [darkHorseTeamId, setDarkHorseTeamId] = useState<number | null>(
    initial.darkHorseTeamId
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [lastSaved, setLastSaved] = useState<Initial>({
    ...initial,
    topScorerName: normalizeTopScorerName(initial.topScorerName ?? ""),
  });

  const normalizedTopScorer = normalizeTopScorerName(topScorerName);
  const championRunnerUpSame =
    championTeamId !== null && championTeamId === runnerUpTeamId;
  const missingField =
    championTeamId === null ||
    runnerUpTeamId === null ||
    darkHorseTeamId === null ||
    normalizedTopScorer.length < 2;

  const isDirty =
    championTeamId !== lastSaved.championTeamId ||
    runnerUpTeamId !== lastSaved.runnerUpTeamId ||
    darkHorseTeamId !== lastSaved.darkHorseTeamId ||
    normalizedTopScorer !== normalizeTopScorerName(lastSaved.topScorerName ?? "");

  const everSaved =
    lastSaved.championTeamId !== null &&
    lastSaved.runnerUpTeamId !== null &&
    lastSaved.darkHorseTeamId !== null &&
    normalizeTopScorerName(lastSaved.topScorerName ?? "").length >= 2;

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
          topScorerName: normalizedTopScorer,
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
        topScorerName: normalizedTopScorer,
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
    normalizedTopScorer,
  ]);

  const championTeam = allTeams.find((t) => t.id === championTeamId) ?? null;
  const runnerUpTeam = allTeams.find((t) => t.id === runnerUpTeamId) ?? null;
  const darkHorseTeam = allTeams.find((t) => t.id === darkHorseTeamId) ?? null;

  return (
    <div className="space-y-4">
      <TrophyCard
        accent="gold"
        eyebrow="Trofeu suprem"
        title="Campion"
        points="20 pts"
        selectedTeam={championTeam}
        teams={allTeams}
        value={championTeamId}
        onChange={setChampionTeamId}
        locked={locked}
        invalid={championRunnerUpSame}
        ariaLabel="Campion"
      />

      <TrophyCard
        accent="silver"
        eyebrow="Finalistă învinsă"
        title="Finalist"
        points="10 pts"
        selectedTeam={runnerUpTeam}
        teams={allTeams}
        value={runnerUpTeamId}
        onChange={setRunnerUpTeamId}
        locked={locked}
        invalid={championRunnerUpSame}
        ariaLabel="Finalist"
        warning={
          championRunnerUpSame
            ? "Campionul și finalista trebuie să fie diferite"
            : null
        }
      />

      <ScorerCard
        eyebrow="Gheata de aur"
        title="Golgheter"
        points="15 pts"
        value={topScorerName}
        onChange={setTopScorerName}
        locked={locked}
      />

      <TrophyCard
        accent="violet"
        eyebrow="Outsider"
        title="Surpriza turneului"
        points="0–30 pts"
        subtitle="Doar urna 3 sau urna 4"
        selectedTeam={darkHorseTeam}
        teams={darkHorseTeams}
        value={darkHorseTeamId}
        onChange={setDarkHorseTeamId}
        locked={locked}
        ariaLabel="Surpriza turneului"
        showPot
        pointsTooltip={
          <PointsBreakdown
            title="Punctaj — Surpriza turneului"
            rows={DARK_HORSE_BREAKDOWN}
          />
        }
      />

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

function TrophyCard({
  accent,
  eyebrow,
  title,
  points,
  subtitle,
  selectedTeam,
  teams,
  value,
  onChange,
  locked,
  invalid,
  warning,
  ariaLabel,
  showPot,
  pointsTooltip,
}: {
  accent: Accent;
  eyebrow: string;
  title: string;
  points: string;
  subtitle?: string;
  selectedTeam: Team | null;
  teams: Team[];
  value: number | null;
  onChange: (id: number) => void;
  locked: boolean;
  invalid?: boolean;
  warning?: string | null;
  ariaLabel: string;
  showPot?: boolean;
  pointsTooltip?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const a = ACCENTS[accent];
  return (
    <article
      className={`group relative rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-slate-950 shadow-lg shadow-black/20 backdrop-blur ring-1 transition ${
        invalid ? "ring-rose-500/40" : a.ring
      }`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 w-[3px] rounded-l-2xl ${
          invalid ? "bg-gradient-to-b from-rose-400 to-rose-600" : a.stripe
        }`}
      />

      <header className="flex items-start justify-between gap-3 border-b border-slate-800/70 px-4 py-2.5">
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
            <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>
          )}
        </div>
        {pointsTooltip ? (
          <InfoChip className={a.chip} label={points}>
            {pointsTooltip}
          </InfoChip>
        ) : (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ring-1 ${a.chip}`}
          >
            {points}
          </span>
        )}
      </header>

      <button
        type="button"
        aria-label={ariaLabel}
        disabled={locked}
        onClick={() => setOpen(true)}
        className={`relative block w-full cursor-pointer px-4 py-5 text-left transition ${
          locked ? "cursor-not-allowed opacity-80" : "hover:bg-slate-900/40"
        }`}
      >
        {selectedTeam ? (
          <div className="flex items-center gap-4">
            <FlagImage emoji={selectedTeam.flagEmoji} className="h-12 w-auto shrink-0 sm:h-16" />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">
                {selectedTeam.name}
              </span>
              {showPot && (
                <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                  Urna {selectedTeam.pot}
                </span>
              )}
            </div>
            {!locked && (
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Schimbă <ChevronDown />
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 text-slate-500">
            <span className="text-4xl leading-none" aria-hidden>
              🏳️
            </span>
            <span className="text-base font-semibold tracking-tight">
              Atinge pentru a alege o echipă
            </span>
            <ChevronDown />
          </div>
        )}
      </button>
      {open && (
        <TeamPickerDialog
          teams={teams}
          onSelect={(id) => { onChange(id); setOpen(false); }}
          onClose={() => setOpen(false)}
          showPot={showPot}
          ariaLabel={ariaLabel}
        />
      )}

      {warning && (
        <p className="border-t border-rose-500/30 bg-rose-500/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-300">
          {warning}
        </p>
      )}
    </article>
  );
}

function ScorerCard({
  eyebrow,
  title,
  points,
  value,
  onChange,
  locked,
}: {
  eyebrow: string;
  title: string;
  points: string;
  value: string;
  onChange: (v: string) => void;
  locked: boolean;
}) {
  const a = ACCENTS.sky;
  return (
    <article
      className={`group relative rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-slate-950 shadow-lg shadow-black/20 backdrop-blur ring-1 transition ${a.ring}`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 w-[3px] rounded-l-2xl ${a.stripe}`}
      />

      <header className="flex items-start justify-between gap-3 border-b border-slate-800/70 px-4 py-2.5">
        <div className="flex min-w-0 flex-col">
          <span className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${a.text}`}>
            {eyebrow}
          </span>
          <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-slate-50">
            {title}
          </h3>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ring-1 ${a.chip}`}>
          {points}
        </span>
      </header>

      <div className="flex items-center gap-3 px-4 py-5">
        <span className="text-4xl leading-none drop-shadow" aria-hidden>
          ⚽
        </span>
        <input
          type="text"
          aria-label="Golgheter"
          value={value}
          disabled={locked}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nume jucător"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-lg font-bold tracking-tight text-slate-50 placeholder:text-base placeholder:font-normal placeholder:text-slate-600 shadow-inner outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
    </article>
  );
}

function TeamPickerDialog({
  teams,
  onSelect,
  onClose,
  showPot,
  ariaLabel,
}: {
  teams: Team[];
  onSelect: (id: number) => void;
  onClose: () => void;
  showPot?: boolean;
  ariaLabel: string;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = (
    query
      ? teams.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
      : teams
  ).slice().sort((a, b) => a.name.localeCompare(b.name, "ro"));

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex w-full max-w-sm flex-col rounded-t-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:rounded-2xl" style={{ maxHeight: "70dvh" }}>
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-800 px-3 py-2.5">
          <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5 shrink-0 fill-slate-500">
            <path d="M6.5 1a5.5 5.5 0 1 0 3.45 9.86l3.1 3.09a.75.75 0 1 0 1.06-1.06l-3.09-3.1A5.5 5.5 0 0 0 6.5 1ZM2.5 6.5a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            aria-label={`Caută ${ariaLabel}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Caută echipă…"
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Închide"
            className="shrink-0 rounded-full p-1 text-slate-500 transition hover:text-slate-300"
          >
            <svg viewBox="0 0 12 12" aria-hidden className="h-3 w-3 fill-current">
              <path d="M1.5 1.5 10.5 10.5M10.5 1.5 1.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </svg>
          </button>
        </div>
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className="overflow-y-auto divide-y divide-slate-800/50"
        >
          {filtered.map((t) => (
            <li
              key={t.id}
              role="option"
              aria-selected={false}
              onClick={() => onSelect(t.id)}
              className="flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-slate-800/60 active:bg-slate-800"
            >
              <FlagImage emoji={t.flagEmoji} className="h-6 w-auto shrink-0" />
              <span className="text-sm font-medium text-slate-100">{t.name}</span>
              {showPot && (
                <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Urna {t.pot}
                </span>
              )}
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-slate-500">
              Nicio echipă găsită
            </li>
          )}
        </ul>
      </div>
    </div>,
    document.body
  );
}

function InfoChip({
  className,
  label,
  children,
}: {
  className: string;
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ring-1 transition ${className} hover:brightness-110`}
      >
        {label}
        <QuestionMark />
      </button>
      {open && (
        <div
          role="dialog"
          // Render ABOVE the chip and on top of everything (z-50 beats the
          // bottom nav at z-50 + the sticky save bar) so the breakdown is
          // never clipped or hidden behind sibling cards.
          className="absolute bottom-full right-0 z-50 mb-2 w-64 rounded-2xl border border-slate-700 bg-slate-900/95 p-3 text-left shadow-2xl shadow-black/40 backdrop-blur"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function PointsBreakdown({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ round: string; pts: number }>;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200">
        {title}
      </p>
      <ul className="divide-y divide-slate-800/70 text-sm">
        {rows.map((r) => (
          <li
            key={r.round}
            className="flex items-center justify-between gap-3 py-1.5 normal-case"
          >
            <span className="text-slate-300 normal-case">{r.round}</span>
            <span className="font-display text-base font-bold text-slate-50 tabular-nums">
              {r.pts}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
        Punctele cresc cu cât echipa avansează mai mult.
      </p>
    </div>
  );
}

function QuestionMark() {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden
      className="h-2.5 w-2.5 fill-current opacity-80"
    >
      <path d="M6 0a6 6 0 1 0 0 12A6 6 0 0 0 6 0Zm.6 9.5h-1.2v-1.2h1.2v1.2Zm1.32-4.28c-.1.17-.32.36-.66.58l-.33.21c-.24.16-.4.31-.47.43-.05.1-.09.22-.1.4h-1.18c.01-.36.05-.62.13-.78.07-.16.27-.36.6-.58l.34-.23c.13-.1.22-.2.28-.3a.6.6 0 0 0 .1-.34.61.61 0 0 0-.2-.46.74.74 0 0 0-.52-.18c-.28 0-.49.1-.61.28-.12.18-.18.39-.18.6h-1.2c.04-.68.28-1.17.72-1.47.28-.19.62-.28 1.04-.28.54 0 .98.13 1.31.4.32.25.49.6.49 1.06 0 .28-.07.51-.2.66Z" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden
      className="h-2.5 w-2.5 fill-current opacity-70"
    >
      <path d="M2.5 4.5h7L6 8.5 2.5 4.5Z" />
    </svg>
  );
}
