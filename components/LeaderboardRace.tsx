"use client";

import { useEffect, useMemo, useState } from "react";
import type { RacePlayerSnapshot, RaceTimeline } from "@/lib/leaderboard-race";

const ROW_HEIGHT = 58;
const PLAYER_COLORS = [
  "#34d399",
  "#60a5fa",
  "#f59e0b",
  "#f472b6",
  "#a78bfa",
  "#22d3ee",
  "#fb7185",
  "#a3e635",
] as const;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  return reduced;
}

function playerColor(userId: number): string {
  return PLAYER_COLORS[Math.abs(userId) % PLAYER_COLORS.length];
}

function formatRaceDate(iso: string): string {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Bucharest",
  })
    .format(new Date(iso))
    .replace(".", "")
    .toUpperCase();
}

type DisplayedPlayer = {
  player: RacePlayerSnapshot;
  state: "active" | "exiting";
  position: number;
};

export function LeaderboardRace({ timeline }: { timeline: RaceTimeline }) {
  const { snapshots } = timeline;
  const lastIndex = Math.max(0, snapshots.length - 1);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reducedMotion = useReducedMotion();
  const frame = snapshots[Math.min(frameIndex, lastIndex)];
  const previousFrame = snapshots[Math.max(0, frameIndex - 1)] ?? frame;
  const isFinal = frameIndex === lastIndex && frame?.kind !== "start";

  useEffect(() => {
    if (!playing || frameIndex >= lastIndex) return;
    const nextFrame = snapshots[frameIndex + 1];
    const delay = reducedMotion ? 240 : nextFrame?.leaderChanged ? 1280 : 760;
    const timeout = window.setTimeout(() => {
      const nextIndex = Math.min(frameIndex + 1, lastIndex);
      setFrameIndex(nextIndex);
      if (nextIndex >= lastIndex) setPlaying(false);
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [frameIndex, lastIndex, playing, reducedMotion, snapshots]);

  const displayedPlayers = useMemo<DisplayedPlayer[]>(() => {
    if (!frame) return [];
    const currentIds = new Set(frame.players.map((player) => player.userId));
    const active = frame.players.map((player, position) => ({
      player,
      state: "active" as const,
      position,
    }));
    const exiting = (previousFrame?.players ?? [])
      .filter((player) => !currentIds.has(player.userId))
      .map((player, position) => ({
        player,
        state: "exiting" as const,
        position: previousFrame.players.findIndex((item) => item.userId === player.userId) || position,
      }));
    return [...active, ...exiting];
  }, [frame, previousFrame]);

  if (!frame) return null;

  const currentMaximum = Math.max(1, ...frame.players.map((player) => player.total));
  const rowCount = Math.max(frame.players.length, previousFrame?.players.length ?? 0);
  const progress = lastIndex === 0 ? 0 : (frameIndex / lastIndex) * 100;
  const winner = isFinal ? frame.players[0] : null;

  function togglePlayback(): void {
    if (isFinal) {
      setFrameIndex(0);
      setPlaying(true);
      return;
    }
    setPlaying((current) => !current);
  }

  function restart(): void {
    setPlaying(false);
    setFrameIndex(0);
  }

  return (
    <section
      className="relative isolate overflow-hidden rounded-[28px] border border-slate-700/70 bg-[#050b18] shadow-2xl shadow-black/30"
      aria-label="Cursa clasamentului"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(circle at 82% -8%, rgba(52,211,153,.16), transparent 33%), linear-gradient(rgba(148,163,184,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.025) 1px, transparent 1px)",
          backgroundSize: "auto, 34px 34px, 34px 34px",
        }}
      />

      <header className="border-b border-slate-800/80 px-4 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-emerald-300/80">
            {frame.kind === "start" ? "Retrospectiva turneului" : `Momentul ${frameIndex} din ${lastIndex}`}
          </p>
          <p className="font-mono text-[9px] font-bold tracking-[0.18em] text-slate-500">
            {formatRaceDate(frame.occurredAt)}
          </p>
        </div>
        <div className="mt-3 flex min-h-14 items-end justify-between gap-4" aria-live="polite">
          <div className="min-w-0">
            <h2 className="font-display text-2xl uppercase leading-none tracking-[0.025em] text-slate-50 sm:text-3xl">
              {frame.label}
            </h2>
            <p className="mt-1.5 truncate text-xs font-semibold text-slate-400 sm:text-sm">
              {frame.detail ?? "Toți pornesc de la zero."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {winner && (
              <div className="hidden text-right min-[430px]:block">
                <p className="text-[8px] font-bold uppercase tracking-[0.28em] text-amber-300">Câștigător</p>
                <p className="mt-1 max-w-28 truncate text-sm font-extrabold text-amber-100">{winner.displayName}</p>
              </div>
            )}
            <button
              type="button"
              onClick={togglePlayback}
              aria-label={playing ? "Pauză" : isFinal ? "Redă din nou" : "Pornește cursa"}
              title={playing ? "Pauză" : isFinal ? "Redă din nou" : "Pornește cursa"}
              className={[
                "grid h-12 w-12 place-items-center rounded-full border text-base shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                isFinal
                  ? "border-amber-300/50 bg-amber-300 text-amber-950 shadow-amber-300/15 hover:bg-amber-200 focus-visible:ring-amber-200"
                  : "border-emerald-300/40 bg-emerald-400 text-emerald-950 shadow-emerald-400/15 hover:bg-emerald-300 focus-visible:ring-emerald-200",
              ].join(" ")}
            >
              <span aria-hidden>{playing ? "Ⅱ" : "▶"}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="px-3 py-4 sm:px-5 sm:py-5">
        <div
          data-testid="race-stage"
          data-reduced-motion={String(reducedMotion)}
          className="relative transition-[height] duration-700 ease-out motion-reduce:transition-none"
          style={{ height: `${Math.max(1, rowCount) * ROW_HEIGHT}px` }}
        >
          {displayedPlayers.map(({ player, state, position }) => {
            const isWinner = Boolean(winner && winner.userId === player.userId && state === "active");
            const color = isWinner ? "#fbbf24" : playerColor(player.userId);
            const width = player.total <= 0 ? 0 : Math.max(8, (player.total / currentMaximum) * 100);
            const transform = `translate(${state === "exiting" ? -18 : 0}px, ${position * ROW_HEIGHT}px)`;
            return (
              <div
                key={player.userId}
                data-testid={`race-row-${player.userId}`}
                data-rank={player.rank}
                data-state={state}
                className={[
                  "absolute inset-x-0 top-0 flex h-12 items-center gap-2.5 sm:gap-3",
                  reducedMotion ? "" : "transition-[transform,opacity] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]",
                  state === "exiting" ? "pointer-events-none opacity-0" : "opacity-100",
                ].join(" ")}
                style={{ transform }}
              >
                <span className="font-display w-6 shrink-0 text-center text-sm text-slate-500" aria-label={`Locul ${player.rank}`}>
                  {player.rank}
                </span>
                <div className="relative h-11 min-w-0 flex-1 overflow-hidden rounded-xl bg-slate-900/80 ring-1 ring-inset ring-slate-800/80">
                  <div
                    aria-hidden
                    className={[
                      "absolute inset-y-0 left-0 rounded-xl",
                      reducedMotion ? "" : "transition-[width] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]",
                    ].join(" ")}
                    style={{
                      width: `${width}%`,
                      background: `linear-gradient(90deg, ${color}45, ${color}b8)`,
                      boxShadow: isWinner ? `0 0 24px ${color}30` : undefined,
                    }}
                  />
                  <div className="absolute inset-0 flex items-center gap-2 px-3">
                    <span className="min-w-0 flex-1 truncate text-xs font-extrabold text-slate-50 sm:text-sm">
                      {player.displayName}
                    </span>
                    {player.delta > 0 && state === "active" && frame.kind !== "start" && (
                      <span
                        className="rounded-full border px-1.5 py-0.5 text-[9px] font-extrabold tabular-nums"
                        style={{ borderColor: `${color}70`, color }}
                      >
                        +{player.delta}
                      </span>
                    )}
                    <span
                      data-total
                      className={[
                        "font-display w-9 shrink-0 text-right text-xl tabular-nums",
                        isWinner ? "text-amber-100" : "text-white",
                      ].join(" ")}
                    >
                      {player.total}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="sticky bottom-[65px] z-10 border-t border-slate-800/80 bg-slate-950/90 px-4 py-4 backdrop-blur-xl sm:static sm:px-6">
        <div className="mb-3 flex items-center gap-3">
          <span className="w-8 font-mono text-[9px] font-bold text-slate-500">START</span>
          <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-slate-800">
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-amber-300 transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="w-8 text-right font-mono text-[9px] font-bold text-slate-500">FINAL</span>
        </div>

        <label htmlFor="race-timeline" className="sr-only">Cronologia turneului</label>
        <input
          id="race-timeline"
          aria-label="Cronologia turneului"
          type="range"
          min={0}
          max={lastIndex}
          step={1}
          value={frameIndex}
          onChange={(event) => {
            setPlaying(false);
            setFrameIndex(Number(event.target.value));
          }}
          className="h-5 w-full cursor-pointer accent-emerald-400"
        />

        <div className="mt-3">
          <button
            type="button"
            onClick={restart}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-700 bg-slate-900/80 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300 transition hover:border-slate-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
          >
            Reia de la început
          </button>
        </div>
      </div>
    </section>
  );
}
