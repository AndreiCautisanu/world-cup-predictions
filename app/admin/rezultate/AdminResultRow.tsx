"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MatchStatus, Round } from "@prisma/client";

type Team = { id: number; name: string; flagEmoji: string };

type Match = {
  id: number;
  round: Round;
  kickoffTime: string;
  slotDescription: string | null;
  groupName: string | null;
  homeTeam: Team | null;
  awayTeam: Team | null;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeScore: number | null;
  awayScore: number | null;
  wentToEt: boolean | null;
  wentToPens: boolean | null;
  status: MatchStatus;
};

const KICKOFF_FORMATTER = new Intl.DateTimeFormat("ro-RO", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const GROUP_ROUNDS: Round[] = ["GROUP_1", "GROUP_2", "GROUP_3"];

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(20, Math.floor(value)));
}

type Status = "idle" | "saving" | "saved" | "error";

export function AdminResultRow({
  match,
  allTeams,
}: {
  match: Match;
  allTeams: Team[];
}) {
  const router = useRouter();

  const isKnockout = !GROUP_ROUNDS.includes(match.round);
  const hasInitial = match.homeScore !== null && match.awayScore !== null;

  const [home, setHome] = useState<number>(match.homeScore ?? 0);
  const [away, setAway] = useState<number>(match.awayScore ?? 0);
  const [wentToEt, setWentToEt] = useState<boolean>(match.wentToEt ?? false);
  const [wentToPens, setWentToPens] = useState<boolean>(match.wentToPens ?? false);
  const [homeTeamId, setHomeTeamId] = useState<number | null>(match.homeTeamId);
  const [awayTeamId, setAwayTeamId] = useState<number | null>(match.awayTeamId);
  const [status, setStatus] = useState<Status>(hasInitial ? "saved" : "idle");
  const [error, setError] = useState<string | null>(null);

  const kickoffLabel = useMemo(
    () => KICKOFF_FORMATTER.format(new Date(match.kickoffTime)),
    [match.kickoffTime]
  );

  const canSave =
    (match.homeTeam ? true : homeTeamId !== null) &&
    (match.awayTeam ? true : awayTeamId !== null);

  async function save() {
    if (!canSave) {
      setError("Alege ambele echipe înainte de a salva");
      setStatus("error");
      return;
    }
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/admin/results", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "save",
          matchId: match.id,
          homeScore: home,
          awayScore: away,
          wentToEt: isKnockout ? wentToEt : false,
          wentToPens: isKnockout ? wentToPens : false,
          ...(match.homeTeam ? {} : homeTeamId ? { homeTeamId } : {}),
          ...(match.awayTeam ? {} : awayTeamId ? { awayTeamId } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Eroare la salvare");
        setStatus("error");
        return;
      }
      setStatus("saved");
      router.refresh();
    } catch {
      setError("Eroare de rețea");
      setStatus("error");
    }
  }

  async function clear() {
    if (!window.confirm("Golești rezultatul? Toate punctele acordate pentru acest meci vor fi anulate.")) return;
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/admin/results", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "clear", matchId: match.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Eroare la golire");
        setStatus("error");
        return;
      }
      setHome(0);
      setAway(0);
      setWentToEt(false);
      setWentToPens(false);
      setStatus("idle");
      router.refresh();
    } catch {
      setError("Eroare de rețea");
      setStatus("error");
    }
  }

  const finished = status === "saved";
  const isBusy = status === "saving";

  return (
    <article
      className={`rounded-2xl border bg-slate-900/40 p-4 transition ${
        finished
          ? "border-emerald-500/30 shadow-[0_0_0_1px_rgba(16,185,129,0.18)]"
          : "border-slate-800 hover:border-slate-700"
      }`}
    >
      <header className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.22em] text-slate-500">
        <span>
          {match.groupName ? `Grupa ${match.groupName}` : match.slotDescription ?? match.round}
        </span>
        <span className="text-slate-400">{kickoffLabel}</span>
      </header>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_auto_auto_minmax(0,1fr)] items-center gap-2">
        <TeamSlot
          team={match.homeTeam}
          fallback={homeTeamId}
          onPick={setHomeTeamId}
          teams={allTeams}
          align="end"
        />
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={20}
          value={home}
          onChange={(e) => setHome(clampScore(Number(e.target.value)))}
          className="score-input w-14 rounded-xl border border-slate-800 bg-slate-950/60 px-2 py-2 text-center font-display text-2xl font-extrabold text-slate-50 focus:border-rose-400/60 focus:outline-none"
        />
        <span className="px-1 font-display text-xl text-slate-500">–</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={20}
          value={away}
          onChange={(e) => setAway(clampScore(Number(e.target.value)))}
          className="score-input w-14 rounded-xl border border-slate-800 bg-slate-950/60 px-2 py-2 text-center font-display text-2xl font-extrabold text-slate-50 focus:border-rose-400/60 focus:outline-none"
        />
        <TeamSlot
          team={match.awayTeam}
          fallback={awayTeamId}
          onPick={setAwayTeamId}
          teams={allTeams}
          align="start"
        />
      </div>

      {isKnockout && (
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-300">
          <label className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/40 px-3 py-1">
            <input
              type="checkbox"
              checked={wentToEt}
              onChange={(e) => setWentToEt(e.target.checked)}
              className="accent-rose-400"
            />
            Prelungiri
          </label>
          <label className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/40 px-3 py-1">
            <input
              type="checkbox"
              checked={wentToPens}
              onChange={(e) => setWentToPens(e.target.checked)}
              className="accent-rose-400"
            />
            Penalty-uri
          </label>
          <span className="text-[11px] text-slate-500">
            Convenție: scorul de mai sus încheie meciul — la pen-uri, câștigătorul are scorul mai mare.
          </span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-xs">
          {status === "saved" && (
            <span className="font-semibold uppercase tracking-[0.2em] text-emerald-300">
              ✓ Rezultat salvat
            </span>
          )}
          {status === "saving" && (
            <span className="font-semibold uppercase tracking-[0.2em] text-slate-400">
              Se salvează…
            </span>
          )}
          {status === "error" && (
            <span className="font-semibold uppercase tracking-[0.2em] text-rose-300">
              {error ?? "Eroare"}
            </span>
          )}
          {status === "idle" && (
            <span className="font-semibold uppercase tracking-[0.2em] text-slate-500">
              Nesalvat
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {finished && (
            <button
              type="button"
              onClick={clear}
              disabled={isBusy}
              className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 transition hover:border-rose-500/60 hover:text-rose-300 disabled:opacity-50"
            >
              Golire
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={isBusy || !canSave}
            className="rounded-full bg-rose-500 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-rose-50 transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {finished ? "Reactualizează" : "Salvează"}
          </button>
        </div>
      </div>
    </article>
  );
}

function TeamSlot({
  team,
  fallback,
  onPick,
  teams,
  align,
}: {
  team: Team | null;
  fallback: number | null;
  onPick: (id: number) => void;
  teams: Team[];
  align: "start" | "end";
}) {
  if (team) {
    return (
      <div
        className={`flex min-w-0 items-center gap-2 ${
          align === "end" ? "justify-end text-right" : "justify-start text-left"
        }`}
      >
        <span className="text-2xl leading-none">{team.flagEmoji}</span>
        <span className="truncate font-semibold text-slate-100">{team.name}</span>
      </div>
    );
  }
  return (
    <select
      value={fallback ?? ""}
      onChange={(e) => onPick(Number(e.target.value))}
      className={`min-w-0 rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-200 focus:border-rose-400/60 focus:outline-none ${
        align === "end" ? "text-right" : "text-left"
      }`}
    >
      <option value="" className="bg-slate-950">
        — alege echipa —
      </option>
      {teams.map((t) => (
        <option key={t.id} value={t.id} className="bg-slate-950">
          {t.flagEmoji} {t.name}
        </option>
      ))}
    </select>
  );
}
