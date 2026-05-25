"use client";

import { useEffect, useState } from "react";
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

export function MatchCard(props: Props) {
  const isKnockout = isKnockoutRound(props.round);
  const isPlaceholder = !props.homeTeam || !props.awayTeam;

  const [home, setHome] = useState<number>(props.initialHome ?? 0);
  const [away, setAway] = useState<number>(props.initialAway ?? 0);
  const [predictsEt, setPredictsEt] = useState<boolean>(props.initialPredictsEt ?? false);
  const [predictsPens, setPredictsPens] = useState<boolean>(props.initialPredictsPens ?? false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const hasInitial = props.initialHome !== null && props.initialHome !== undefined;

  useEffect(() => {
    if (status !== "saved") return;
    const t = setTimeout(() => setStatus("idle"), 2500);
    return () => clearTimeout(t);
  }, [status]);

  async function save() {
    if (saving) return;
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
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-slate-950 shadow-lg shadow-black/20 backdrop-blur transition ${
        props.isLocked
          ? "border-slate-800/80 opacity-80"
          : hasInitial
            ? "border-emerald-500/30 ring-1 ring-emerald-500/10"
            : "border-slate-800 hover:border-slate-700"
      }`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-[3px] ${
          props.isLocked
            ? "bg-slate-700"
            : isKnockout
              ? "bg-gradient-to-b from-amber-400 via-amber-500 to-rose-500"
              : "bg-gradient-to-b from-emerald-400 to-emerald-600"
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
        <CountdownLock kickoff={new Date(props.kickoffTime)} />
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
              onHome={(n) => setHome(clampScore(n))}
              onAway={(n) => setAway(clampScore(n))}
            />
            <TeamSide team={props.awayTeam!} align="left" />
          </div>

          {isKnockout && !props.isLocked && (
            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-400">
              <Toggle
                label="Prelungiri"
                checked={predictsEt}
                onChange={setPredictsEt}
              />
              <Toggle
                label="Penalty-uri"
                checked={predictsPens}
                onChange={setPredictsPens}
              />
            </div>
          )}

          {!props.isLocked && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                {hasInitial ? "Pronostic salvat" : "Nesalvat"}
              </span>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-emerald-950 shadow-[0_0_0_1px_rgba(16,185,129,0.4)] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Se salvează…"
                  : status === "saved"
                    ? "Salvat ✓"
                    : status === "error"
                      ? "Reîncearcă"
                      : "Salvează"}
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
    <div
      className={`flex min-w-0 items-center gap-2.5 ${align === "right" ? "justify-end" : "justify-start"}`}
    >
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
      onChange={(e) => onChange(Number(e.target.value))}
      className="font-display h-12 w-12 rounded-lg border border-slate-700 bg-slate-950/70 text-center text-2xl font-bold text-slate-50 tabular-nums shadow-inner outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-60"
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
      return "Optimi 1";
    case "R16":
      return "Optimi 2";
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
