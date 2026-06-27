"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CountdownLock } from "./CountdownLock";
import { MatchPredictionsModal } from "./MatchPredictionsModal";
import { FlagImage } from "./FlagImage";
import { isKnockoutRound } from "@/lib/predictions";
import {
  matchPredictionTier,
  MATCH_TIER_LABEL,
  type MatchTier,
} from "@/lib/match-tier";

// MatchCard's own tier styling. Distinct from the /jucator variant because
// the card chrome already has an accent stripe + ring system to slot into.
const TIER_CHROME: Record<Exclude<MatchTier, "none">, string> = {
  miss: "border-rose-500/45 bg-rose-500/[0.05] ring-1 ring-rose-500/20",
  partial: "border-amber-500/45 bg-amber-500/[0.05] ring-1 ring-amber-500/20",
  close: "border-sky-500/45 bg-sky-500/[0.05] ring-1 ring-sky-500/20",
  exact: "border-emerald-500/50 bg-emerald-500/[0.06] ring-1 ring-emerald-500/25",
  perfect:
    "border-yellow-300/60 bg-yellow-400/[0.08] ring-1 ring-yellow-300/30 shadow-[0_0_28px_-6px_rgba(250,204,21,0.45)]",
};
const TIER_STRIPE: Record<Exclude<MatchTier, "none">, string> = {
  miss: "bg-gradient-to-b from-rose-400 to-rose-600",
  partial: "bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500",
  close: "bg-gradient-to-b from-sky-400 to-sky-600",
  exact: "bg-gradient-to-b from-emerald-400 to-emerald-600",
  perfect: "bg-gradient-to-b from-yellow-200 via-yellow-300 to-amber-400",
};
const TIER_BADGE: Record<Exclude<MatchTier, "none">, string> = {
  miss: "border-rose-500/40 bg-rose-500/15 text-rose-200",
  partial: "border-amber-500/40 bg-amber-500/15 text-amber-200",
  close: "border-sky-500/40 bg-sky-500/15 text-sky-200",
  exact: "border-emerald-400/50 bg-emerald-500/20 text-emerald-200",
  perfect:
    "border-yellow-300/60 bg-yellow-400/20 text-yellow-100 shadow-[0_0_18px_-2px_rgba(250,204,21,0.45)]",
};

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
  initialHomeAdvances?: boolean | null;
  pointsAwarded?: number | null;
  // Actual match result, present once the match has finished. Shown alongside
  // the points badge so a scored card explains itself without navigating away.
  actualHome?: number | null;
  actualAway?: number | null;
  wentToEt?: boolean | null;
  wentToPens?: boolean | null;
  isLocked: boolean;
};

export const DIRTY_EVENT = "pronosticuri:dirty";
export const BATCH_SAVED_EVENT = "pronosticuri:batch-saved";

export type DirtyPayload = {
  homeScore: number;
  awayScore: number;
  homeAdvances: boolean | null;
};

export type DirtyEventDetail = {
  matchId: number;
  isDirty: boolean;
  round: string;
  // Snapshot of the unsaved state when isDirty=true; null when clean. The
  // MatchdaySaveAll toolbar keeps the latest snapshot per matchId so a single
  // batch POST can be assembled when the user clicks "Salvează tot".
  payload: DirtyPayload | null;
};

export type BatchSavedEventDetail = {
  saved: Array<{ matchId: number; snapshot: DirtyPayload }>;
};

const KICKOFF_FORMATTER = new Intl.DateTimeFormat("ro-RO", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Bucharest",
});

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(20, Math.floor(value)));
}

type SavedSnapshot = { home: number; away: number; adv: boolean | null };

export function MatchCard(props: Props) {
  const isKnockout = isKnockoutRound(props.round);
  const isPlaceholder = !props.homeTeam || !props.awayTeam;

  const initialSnapshot = useMemo<SavedSnapshot | null>(() => {
    if (props.initialHome === null || props.initialHome === undefined) return null;
    return {
      home: props.initialHome,
      away: props.initialAway ?? 0,
      adv: props.initialHomeAdvances ?? null,
    };
  }, [props.initialHome, props.initialAway, props.initialHomeAdvances]);

  const [home, setHome] = useState<number>(initialSnapshot?.home ?? 0);
  const [away, setAway] = useState<number>(initialSnapshot?.away ?? 0);
  const [homeAdvances, setHomeAdvances] = useState<boolean | null>(initialSnapshot?.adv ?? null);
  const [lastSaved, setLastSaved] = useState<SavedSnapshot | null>(initialSnapshot);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [showBoard, setShowBoard] = useState(false);

  const hasSavedEver = lastSaved !== null;

  // A knockout draw is decided on penalties, so the pick is only complete once
  // the user says who advances. Decisive picks and group games are always fine.
  const isDraw = home === away;
  const needsAdvancer = isKnockout && isDraw;
  const incomplete = needsAdvancer && homeAdvances === null;

  const isDirty = useMemo(() => {
    if (lastSaved === null) return touched;
    if (home !== lastSaved.home || away !== lastSaved.away) return true;
    if (!needsAdvancer) return false;
    return homeAdvances !== lastSaved.adv;
  }, [home, away, homeAdvances, lastSaved, touched, needsAdvancer]);

  const canSave = (isDirty || !hasSavedEver) && !incomplete;

  // Dispatch dirty state + the latest unsaved payload so the parent toolbar
  // can batch-submit them with a single POST when the user clicks "Salvează
  // tot". Effect re-runs on every state change while dirty so the snapshot
  // in the toolbar stays current.
  useEffect(() => {
    if (props.isLocked || isPlaceholder) return;
    // An incomplete draw pick (no advancer chosen) emits no payload, so the
    // "Salvează tot" toolbar skips it rather than persisting a half-pick.
    const payload: DirtyPayload | null =
      isDirty && !incomplete
        ? {
            homeScore: home,
            awayScore: away,
            homeAdvances: needsAdvancer ? homeAdvances : null,
          }
        : null;
    const ev = new CustomEvent<DirtyEventDetail>(DIRTY_EVENT, {
      detail: { matchId: props.matchId, isDirty: isDirty && !incomplete, round: props.round, payload },
    });
    window.dispatchEvent(ev);
  }, [
    isDirty,
    incomplete,
    props.matchId,
    props.isLocked,
    props.round,
    isPlaceholder,
    home,
    away,
    homeAdvances,
    needsAdvancer,
  ]);

  // Apply a batch-save acknowledgement from the toolbar.
  useEffect(() => {
    if (props.isLocked || isPlaceholder) return;
    function handler(e: Event) {
      const detail = (e as CustomEvent<BatchSavedEventDetail>).detail;
      const match = detail?.saved.find((s) => s.matchId === props.matchId);
      if (!match) return;
      setLastSaved({
        home: match.snapshot.homeScore,
        away: match.snapshot.awayScore,
        adv: match.snapshot.homeAdvances,
      });
      setTouched(false);
      setStatus("saved");
    }
    window.addEventListener(BATCH_SAVED_EVENT, handler);
    return () => window.removeEventListener(BATCH_SAVED_EVENT, handler);
  }, [props.matchId, props.isLocked, isPlaceholder]);

  const save = useCallback(async () => {
    if (saving) return;
    if (!canSave) return; // nothing to do
    setSaving(true);
    setStatus("idle");
    const body: Record<string, unknown> = {
      matchId: props.matchId,
      homeScore: home,
      awayScore: away,
    };
    if (needsAdvancer) {
      body.homeAdvances = homeAdvances;
    }
    try {
      const res = await fetch("/api/predictions/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setLastSaved({ home, away, adv: needsAdvancer ? homeAdvances : null });
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
  }, [saving, canSave, props.matchId, home, away, homeAdvances, needsAdvancer]);

  // Scored predictions override locked/saved chrome with a tier-based palette
  // (rose miss → amber partial → sky close → emerald exact → gold perfect).
  // When pointsAwarded is null the card uses its standard saved/locked look.
  const hasPoints = props.pointsAwarded !== null && props.pointsAwarded !== undefined;
  const tier: MatchTier = hasPoints ? matchPredictionTier(props.pointsAwarded, props.round) : "none";
  const scoredTier = tier !== "none" ? (tier as Exclude<MatchTier, "none">) : null;
  const hasResult =
    props.actualHome !== null &&
    props.actualHome !== undefined &&
    props.actualAway !== null &&
    props.actualAway !== undefined;

  const chrome = (() => {
    if (scoredTier) return TIER_CHROME[scoredTier];
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

  const buttonDisabled = saving || !canSave;

  return (
    <article
      data-match-id={props.matchId}
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-slate-950 shadow-lg shadow-black/20 backdrop-blur transition ${chrome}`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-[3px] ${
          scoredTier
            ? TIER_STRIPE[scoredTier]
            : props.isLocked
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
          <CountdownLock kickoff={new Date(props.kickoffTime)} forcedLocked={props.isLocked} />
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

          {isKnockout && !props.isLocked && isDraw && (
            <div className="mt-3 flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300/80">
                Egal · cine merge mai departe la penalty-uri?
              </span>
              <div className="flex items-center gap-2">
                <AdvancerButton
                  label={props.homeTeam!.name}
                  active={homeAdvances === true}
                  onClick={() => {
                    setTouched(true);
                    setHomeAdvances(true);
                  }}
                />
                <AdvancerButton
                  label={props.awayTeam!.name}
                  active={homeAdvances === false}
                  onClick={() => {
                    setTouched(true);
                    setHomeAdvances(false);
                  }}
                />
              </div>
            </div>
          )}

          {!props.isLocked && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                {incomplete
                  ? "Alege cine avansează"
                  : hasSavedEver
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

          {props.isLocked && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setShowBoard(true)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-4 py-1.5 text-sm font-semibold text-slate-200 transition hover:border-emerald-400/50 hover:text-emerald-200"
              >
                Vezi ce-au pus ceilalți
              </button>
            </div>
          )}

          {showBoard && (
            <MatchPredictionsModal
              matchId={props.matchId}
              round={props.round}
              onClose={() => setShowBoard(false)}
            />
          )}

          {scoredTier && (
            <div className="mt-3 flex flex-col items-center gap-1.5">
              {hasResult && (
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Rezultat{" "}
                  <span className="font-display text-slate-100 tabular-nums">
                    {props.actualHome} – {props.actualAway}
                  </span>
                  {props.wentToPens ? (
                    <span className="ml-1 text-amber-300/80">(pen)</span>
                  ) : props.wentToEt ? (
                    <span className="ml-1 text-amber-300/80">(prel)</span>
                  ) : null}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${TIER_BADGE[scoredTier]}`}
              >
                <span className="tabular-nums">
                  {props.pointsAwarded === 0 ? "0 pct" : `+${props.pointsAwarded} pct`}
                </span>
                <span aria-hidden className="opacity-60">·</span>
                <span>{MATCH_TIER_LABEL[tier]}</span>
              </span>
            </div>
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
      <FlagImage emoji={team.flagEmoji} className="h-5 w-auto shrink-0" />
      {align === "left" && <TeamName name={team.name} />}
    </div>
  );
}

function TeamName({ name }: { name: string }) {
  return (
    <span className="truncate text-base font-bold tracking-tight text-slate-50 sm:text-lg">
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
  const [raw, setRaw] = useState(String(value));

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={raw}
      disabled={disabled}
      aria-label={ariaLabel}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
        setRaw(digits);
        if (digits !== "") {
          onChange(clampScore(parseInt(digits, 10)));
        }
      }}
      onBlur={() => {
        const n = raw === "" ? 0 : clampScore(parseInt(raw, 10) || 0);
        setRaw(String(n));
        onChange(n);
      }}
      className="score-input font-display h-12 w-12 rounded-lg border border-slate-700 bg-slate-950/70 text-center text-2xl font-bold text-slate-50 tabular-nums shadow-inner outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-60"
    />
  );
}

function AdvancerButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`max-w-[44%] truncate rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] transition ${
        active
          ? "border-amber-400/60 bg-amber-400/20 text-amber-100"
          : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-amber-400/40"
      }`}
    >
      {label}
    </button>
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
