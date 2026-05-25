"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CountdownLock } from "./CountdownLock";
import { isKnockoutRound } from "@/lib/predictions";

type Team = { name: string; flagEmoji: string };

type Props = {
  matchId: number;
  homeTeam: Team | null;
  awayTeam: Team | null;
  kickoffTime: Date;
  slotDescription: string | null;
  groupName?: string | null;
  round: string;
  initialHome?: number | null;
  initialAway?: number | null;
  initialPredictsEt?: boolean | null;
  initialPredictsPens?: boolean | null;
  pointsAwarded?: number | null;
  isLocked: boolean;
};

export const DIRTY_EVENT = "pronosticuri:dirty";
export const SAVE_ALL_EVENT = "pronosticuri:save-all";

export type DirtyEventDetail = { matchId: number; isDirty: boolean };

const KICKOFF_FORMATTER = new Intl.DateTimeFormat("ro-RO", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(20, Math.floor(value)));
}

type SavedSnapshot = { home: number; away: number; et: boolean; pens: boolean };

export function MatchCard(props: Props) {
  const isKnockout = isKnockoutRound(props.round);
  const isPlaceholder = !props.homeTeam || !props.awayTeam;

  const initialSnapshot = useMemo<SavedSnapshot | null>(() => {
    if (props.initialHome === null || props.initialHome === undefined) return null;
    return {
      home: props.initialHome,
      away: props.initialAway ?? 0,
      et: props.initialPredictsEt ?? false,
      pens: props.initialPredictsPens ?? false,
    };
  }, [props.initialHome, props.initialAway, props.initialPredictsEt, props.initialPredictsPens]);

  const [home, setHome] = useState<number>(initialSnapshot?.home ?? 0);
  const [away, setAway] = useState<number>(initialSnapshot?.away ?? 0);
  const [predictsEt, setPredictsEt] = useState<boolean>(initialSnapshot?.et ?? false);
  const [predictsPens, setPredictsPens] = useState<boolean>(initialSnapshot?.pens ?? false);
  const [lastSaved, setLastSaved] = useState<SavedSnapshot | null>(initialSnapshot);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const hasSavedEver = lastSaved !== null;

  const isDirty = useMemo(() => {
    if (lastSaved === null) return touched;
    if (home !== lastSaved.home || away !== lastSaved.away) return true;
    if (!isKnockout) return false;
    return predictsEt !== lastSaved.et || predictsPens !== lastSaved.pens;
  }, [home, away, predictsEt, predictsPens, lastSaved, touched, isKnockout]);

  // Dispatch dirty state for the parent toolbar to count
  useEffect(() => {
    if (props.isLocked || isPlaceholder) return;
    const ev = new CustomEvent<DirtyEventDetail>(DIRTY_EVENT, {
      detail: { matchId: props.matchId, isDirty },
    });
    window.dispatchEvent(ev);
  }, [isDirty, props.matchId, props.isLocked, isPlaceholder]);

  const saveRef = useRef<() => Promise<void>>(async () => {});

  const save = useCallback(async () => {
    if (saving) return;
    if (!isDirty) return; // nothing to do
    setSaving(true);
    setStatus("idle");
    const body: Record<string, unknown> = {
      matchId: props.matchId,
      homeScore: home,
      awayScore: away,
    };
    if (isKnockout) {
      body.predictsEt = predictsEt;
      body.predictsPens = predictsPens;
    }
    try {
      const res = await fetch("/api/predictions/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setLastSaved({ home, away, et: predictsEt, pens: predictsPens });
        setTouched(false);
        setStatus("saved");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }, [saving, isDirty, props.matchId, home, away, predictsEt, predictsPens, isKnockout]);

  // Keep a stable ref so the event listener always calls the latest save()
  saveRef.current = save;

  // Listen for "save all" broadcast
  useEffect(() => {
    if (props.isLocked || isPlaceholder) return;
    const handler = () => {
      if (saveRef.current) void saveRef.current();
    };
    window.addEventListener(SAVE_ALL_EVENT, handler);
    return () => window.removeEventListener(SAVE_ALL_EVENT, handler);
  }, [props.isLocked, isPlaceholder]);

  // Visual state for the card chrome
  const chrome = (() => {
    if (props.isLocked) return "border-slate-800/80 opacity-80";
    if (isDirty && hasSavedEver) return "border-amber-400/50 bg-amber-500/[0.04] ring-1 ring-amber-400/15";
    if (isDirty && !hasSavedEver) return "border-amber-400/35 bg-amber-500/[0.025]";
    if (hasSavedEver) return "border-emerald-500/45 bg-emerald-500/[0.04] ring-1 ring-emerald-500/20";
    return "border-slate-800 hover:border-slate-700";
  })();

  const buttonLabel = (() => {
    if (saving) return "Se salvează…";
    if (status === "error") return "Reîncearcă";
    if (hasSavedEver && isDirty) return "Actualizează";
    if (hasSavedEver && !isDirty) return "Salvat ✓";
    return "Salvează";
  })();

  const buttonDisabled = saving || !isDirty;

  return (
    <article
      data-match-id={props.matchId}
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-slate-950 shadow-lg shadow-black/20 backdrop-blur transition ${chrome}`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-[3px] ${
          props.isLocked
            ? "bg-slate-700"
            : isDirty
              ? "bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500"
              : hasSavedEver
                ? "bg-gradient-to-b from-emerald-400 to-emerald-600"
                : isKnockout
                  ? "bg-gradient-to-b from-slate-500 via-slate-600 to-slate-700"
                  : "bg-gradient-to-b from-slate-600 to-slate-800"
        }`}
      />

      <header className="flex items-center justify-between gap-3 border-b border-slate-800/70 px-4 py-2.5">
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/80">
            {props.groupName
              ? `Grupa ${props.groupName}`
              : props.slotDescription ?? roundLabel(props.round)}
          </span>
          <span className="truncate text-xs text-slate-400">
            {KICKOFF_FORMATTER.format(new Date(props.kickoffTime))}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {!props.isLocked && hasSavedEver && !isDirty && (
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" aria-label="salvat" />
          )}
          {!props.isLocked && isDirty && (
            <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" aria-label="nesalvat" />
          )}
          <CountdownLock kickoff={new Date(props.kickoffTime)} />
        </div>
      </header>

      {isPlaceholder ? (
        <div className="px-4 py-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-slate-700 text-slate-500">
            <QuestionMark />
          </div>
          <p className="mt-3 text-sm italic text-slate-500">Echipe necunoscute</p>
          {props.slotDescription && (
            <p className="mt-1 text-xs text-slate-600">{props.slotDescription}</p>
          )}
        </div>
      ) : (
        <div className="px-4 py-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <TeamSide team={props.homeTeam!} align="right" />
            <ScorePair
              home={home}
              away={away}
              disabled={props.isLocked}
              onHome={(n) => {
                setTouched(true);
                setHome(clampScore(n));
              }}
              onAway={(n) => {
                setTouched(true);
                setAway(clampScore(n));
              }}
            />
            <TeamSide team={props.awayTeam!} align="left" />
          </div>

          {isKnockout && !props.isLocked && (
            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-400">
              <Toggle
                label="Prelungiri"
                checked={predictsEt}
                onChange={(v) => {
                  setTouched(true);
                  setPredictsEt(v);
                }}
              />
              <Toggle
                label="Penalty-uri"
                checked={predictsPens}
                onChange={(v) => {
                  setTouched(true);
                  setPredictsPens(v);
                }}
              />
            </div>
          )}

          {!props.isLocked && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                {hasSavedEver
                  ? isDirty
                    ? "Modificări nesalvate"
                    : "Pronostic salvat"
                  : isDirty
                    ? "Apasă „Salvează"
                    : "Niciun pronostic încă"}
              </span>
              <button
                type="button"
                onClick={() => void save()}
                disabled={buttonDisabled}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isDirty
                    ? "bg-amber-400 text-amber-950 shadow-[0_0_0_1px_rgba(251,191,36,0.5)] hover:bg-amber-300"
                    : hasSavedEver
                      ? "bg-emerald-500/20 text-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]"
                      : "bg-emerald-500 text-emerald-950 shadow-[0_0_0_1px_rgba(16,185,129,0.4)] hover:bg-emerald-400"
                }`}
              >
                {buttonLabel}
              </button>
            </div>
          )}

          {props.pointsAwarded !== null && props.pointsAwarded !== undefined && (
            <p className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              +{props.pointsAwarded} puncte
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function TeamSide({ team, align }: { team: Team; align: "left" | "right" }) {
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${align === "right" ? "justify-end" : "justify-start"}`}>
      {align === "right" && <TeamName name={team.name} />}
      <span className="text-3xl leading-none drop-shadow" aria-hidden>
        {team.flagEmoji}
      </span>
      {align === "left" && <TeamName name={team.name} />}
    </div>
  );
}

function TeamName({ name }: { name: string }) {
  return (
    <span className="font-display truncate text-sm font-semibold uppercase tracking-[0.06em] text-slate-100">
      {name}
    </span>
  );
}

function ScorePair({
  home,
  away,
  disabled,
  onHome,
  onAway,
}: {
  home: number;
  away: number;
  disabled: boolean;
  onHome: (n: number) => void;
  onAway: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <ScoreInput value={home} disabled={disabled} onChange={onHome} ariaLabel="Scor gazde" />
      <span className="font-display text-2xl text-slate-600" aria-hidden>
        ·
      </span>
      <ScoreInput value={away} disabled={disabled} onChange={onAway} ariaLabel="Scor oaspeți" />
    </div>
  );
}

function ScoreInput({
  value,
  disabled,
  onChange,
  ariaLabel,
}: {
  value: number;
  disabled: boolean;
  onChange: (n: number) => void;
  ariaLabel: string;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={20}
      step={1}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => onChange(Number(e.target.value))}
      className="score-input font-display h-12 w-12 rounded-lg border border-slate-700 bg-slate-950/70 text-center text-2xl font-bold text-slate-50 tabular-nums shadow-inner outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-60"
    />
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-[11px] uppercase tracking-[0.1em] transition hover:border-amber-400/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 cursor-pointer rounded border-slate-600 bg-slate-950 text-amber-400 accent-amber-400"
      />
      {label}
    </label>
  );
}

function QuestionMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-current">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm.85 14.5h-1.7v-1.7h1.7v1.7Zm1.86-6.04c-.14.24-.45.5-.93.81l-.46.3c-.34.22-.57.43-.67.61-.07.13-.12.31-.14.55h-1.66c.01-.5.07-.86.18-1.09.11-.23.39-.5.85-.81l.47-.32c.18-.13.31-.27.4-.41a.83.83 0 0 0 .14-.47.86.86 0 0 0-.27-.65 1.04 1.04 0 0 0-.73-.25c-.4 0-.69.14-.86.4-.16.27-.24.55-.24.86h-1.7c.05-.96.39-1.65 1.01-2.07.4-.27.88-.4 1.46-.4.76 0 1.37.18 1.84.55.46.36.69.86.69 1.5 0 .39-.1.71-.28.93Z" />
    </svg>
  );
}

function roundLabel(round: string): string {
  switch (round) {
    case "GROUP_1":
      return "Etapa 1";
    case "GROUP_2":
      return "Etapa 2";
    case "GROUP_3":
      return "Etapa 3";
    case "R32":
      return "Șaisprezecimi";
    case "R16":
      return "Optimi";
    case "QF":
      return "Sferturi";
    case "SF":
      return "Semifinale";
    case "THIRD_PLACE":
      return "Locul 3";
    case "FINAL":
      return "Finala";
    default:
      return round;
  }
}
