"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { isKnockoutRound } from "@/lib/predictions";
import { matchPredictionTier } from "@/lib/match-tier";
import { TIER_TILE } from "@/lib/tier-styles";
import {
  bucketParticipants,
  koDrawBadge,
  type BoardParticipant,
  type Bucket,
} from "@/lib/match-board";

type BoardMatch = {
  id: number;
  round: string;
  status: "SCHEDULED" | "LIVE" | "FINISHED";
  homeTeam: { name: string; flagEmoji: string } | null;
  awayTeam: { name: string; flagEmoji: string } | null;
  final: boolean;
  homeScore: number | null;
  awayScore: number | null;
  wentToEt: boolean | null;
  wentToPens: boolean | null;
};

type BoardResponse = { match: BoardMatch; participants: BoardParticipant[] };

type Props = { matchId: number; round: string; onClose: () => void };

type State =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; data: BoardResponse };

export function MatchPredictionsModal({ matchId, round, onClose }: Props) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/matches/${matchId}/predictions`)
      .then(async (res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.json() as Promise<BoardResponse>;
      })
      .then((data) => {
        if (!cancelled) setState({ kind: "ready", data });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [matchId, retryKey]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-label="Pronosticurile celorlalți"
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <h2 className="font-display text-lg font-extrabold uppercase tracking-tight text-slate-50">
          Ce-au pus ceilalți
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
        >
          Închide
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {state.kind === "loading" && <Centered>Se încarcă…</Centered>}
        {state.kind === "error" && (
          <Centered>
            <p className="text-rose-300">Nu s-au putut încărca pronosticurile.</p>
            <button
              type="button"
              onClick={() => {
                setState({ kind: "loading" });
                setRetryKey((k) => k + 1);
              }}
              className="mt-3 rounded-full border border-slate-700 px-4 py-1.5 text-sm font-semibold text-slate-200"
            >
              Reîncearcă
            </button>
          </Centered>
        )}
        {state.kind === "ready" && <Board round={round} data={state.data} />}
      </div>
    </div>,
    document.body
  );
}

function Board({ round, data }: { round: string; data: BoardResponse }) {
  const { match, participants } = data;

  if (participants.length === 0) {
    return <Centered>Nimeni n-a pronosticat acest meci.</Centered>;
  }

  const columns = bucketParticipants(participants, match.final);
  const isKo = isKnockoutRound(round);
  const labels: Record<Bucket, string> = {
    home: match.homeTeam?.name ?? "Gazde",
    draw: "Egal",
    away: match.awayTeam?.name ?? "Oaspeți",
  };
  const order: Bucket[] = ["home", "draw", "away"];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {match.final && match.homeScore !== null && match.awayScore !== null && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Rezultat
          </span>
          <span className="font-display text-lg font-bold tabular-nums text-slate-50">
            {match.homeScore} – {match.awayScore}
          </span>
          {match.wentToPens && <Tag>pen</Tag>}
          {match.wentToEt && !match.wentToPens && <Tag>prel</Tag>}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {order.map((bucket) => (
          <section key={bucket} className="space-y-2">
            <h3 className="truncate text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              {labels[bucket]}
            </h3>
            <ul className="space-y-1.5">
              {columns[bucket].length === 0 && (
                <li className="rounded-lg border border-dashed border-slate-800 py-3 text-center text-[10px] uppercase tracking-widest text-slate-600">
                  —
                </li>
              )}
              {columns[bucket].map((p, i) => (
                <li key={`${p.displayName}-${i}`}>
                  <ParticipantTile
                    p={p}
                    round={round}
                    final={match.final}
                    showBadge={isKo && bucket === "draw"}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function ParticipantTile({
  p,
  round,
  final,
  showBadge,
}: {
  p: BoardParticipant;
  round: string;
  final: boolean;
  showBadge: boolean;
}) {
  const tier = final ? matchPredictionTier(p.pointsAwarded, round) : "none";
  const badge = showBadge ? koDrawBadge(p) : null;
  return (
    <div className={`rounded-lg border px-2 py-1.5 ${TIER_TILE[tier]}`}>
      <span className="block truncate text-[11px] font-medium">
        {p.displayName}
        {p.isMe && (
          <span className="ml-1 rounded bg-emerald-400/20 px-1 text-[9px] font-semibold uppercase tracking-wide text-emerald-300">
            tu
          </span>
        )}
      </span>
      <span className="mt-0.5 flex items-center gap-1">
        <span className="font-display text-sm font-extrabold tabular-nums">
          {p.homeScore} · {p.awayScore}
        </span>
        {badge && (
          <span className="rounded bg-amber-400/15 px-1 text-[9px] font-semibold uppercase tracking-wide text-amber-300">
            {badge}
          </span>
        )}
      </span>
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center text-sm text-slate-400">
      {children}
    </div>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-amber-300">
      {children}
    </span>
  );
}
