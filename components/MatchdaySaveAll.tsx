"use client";

import { useEffect, useRef, useState } from "react";
import {
  BATCH_SAVED_EVENT,
  DIRTY_EVENT,
  type BatchSavedEventDetail,
  type DirtyEventDetail,
  type DirtyPayload,
} from "./MatchCard";

type Props = {
  total: number;
};

type Pending = { round: string; payload: DirtyPayload };

export function MatchdaySaveAll({ total }: Props) {
  const [dirtyCount, setDirtyCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef<Map<number, Pending>>(new Map());

  // Reset state when the visible matchday changes — total is the playable-match
  // count for the active round and is a reliable trip-wire for that. State
  // resets happen during render via the previous-render pattern; the ref is
  // wiped in a follow-up effect (refs may not be written during render).
  const [prevTotal, setPrevTotal] = useState(total);
  if (total !== prevTotal) {
    setPrevTotal(total);
    setDirtyCount(0);
    setError(null);
  }
  useEffect(() => {
    pendingRef.current = new Map();
  }, [total]);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<DirtyEventDetail>).detail;
      if (!detail) return;
      if (detail.isDirty && detail.payload) {
        pendingRef.current.set(detail.matchId, {
          round: detail.round,
          payload: detail.payload,
        });
      } else {
        pendingRef.current.delete(detail.matchId);
      }
      setDirtyCount(pendingRef.current.size);
    }
    window.addEventListener(DIRTY_EVENT, handler);
    return () => window.removeEventListener(DIRTY_EVENT, handler);
  }, []);

  async function saveAll() {
    if (saving) return;
    const items = [...pendingRef.current.entries()].map(([matchId, p]) => ({
      matchId,
      ...p.payload,
    }));
    if (items.length === 0) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/predictions/match/batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ predictions: items }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        saved?: number[];
        skipped?: { matchId: number; reason: string }[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Eroare la salvare");
        return;
      }
      const savedSet = new Set(data.saved ?? []);
      const saved = items
        .filter((it) => savedSet.has(it.matchId))
        .map((it) => ({
          matchId: it.matchId,
          snapshot: {
            homeScore: it.homeScore,
            awayScore: it.awayScore,
            predictsEt: it.predictsEt,
            predictsPens: it.predictsPens,
          },
        }));
      // Drop the now-saved entries from the pending map BEFORE the cards
      // react and re-dispatch isDirty=false (we want their post-save state
      // to confirm clean, not a fight against a stale entry).
      for (const s of saved) pendingRef.current.delete(s.matchId);
      setDirtyCount(pendingRef.current.size);
      window.dispatchEvent(
        new CustomEvent<BatchSavedEventDetail>(BATCH_SAVED_EVENT, {
          detail: { saved },
        })
      );
      if ((data.skipped?.length ?? 0) > 0) {
        const reasons = new Set((data.skipped ?? []).map((s) => s.reason));
        setError(
          reasons.has("locked")
            ? "Unele pronosticuri s-au blocat între timp"
            : "Câteva pronosticuri nu au putut fi salvate"
        );
      }
    } catch {
      setError("Conexiune întreruptă");
    } finally {
      setSaving(false);
    }
  }

  if (dirtyCount === 0 && !saving && !error) return null;

  return (
    <div className="sticky top-[60px] z-30 -mx-4 flex flex-col gap-1 border-y border-amber-400/30 bg-amber-500/10 px-4 py-2 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
          {dirtyCount === 0 && !saving
            ? "Toate pronosticurile sunt salvate"
            : `${dirtyCount} pronostic${dirtyCount === 1 ? "" : "uri"} nesalvat${
                dirtyCount === 1 ? "" : "e"
              }`}
        </span>
        <button
          type="button"
          onClick={() => void saveAll()}
          disabled={saving || dirtyCount === 0}
          className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-amber-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Se salvează…" : "Salvează tot"}
        </button>
      </div>
      {error && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-200">
          {error}
        </p>
      )}
    </div>
  );
}
