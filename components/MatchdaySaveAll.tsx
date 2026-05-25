"use client";

import { useEffect, useRef, useState } from "react";
import { DIRTY_EVENT, SAVE_ALL_EVENT, type DirtyEventDetail } from "./MatchCard";

type Props = {
  total: number;
};

export function MatchdaySaveAll({ total }: Props) {
  const [dirtyCount, setDirtyCount] = useState(0);
  const stateRef = useRef<Map<number, boolean>>(new Map());

  useEffect(() => {
    stateRef.current = new Map();
    setDirtyCount(0);
  }, [total]);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<DirtyEventDetail>).detail;
      if (!detail) return;
      const prev = stateRef.current.get(detail.matchId) ?? false;
      if (prev === detail.isDirty) return;
      stateRef.current.set(detail.matchId, detail.isDirty);
      let count = 0;
      stateRef.current.forEach((v) => v && count++);
      setDirtyCount(count);
    }
    window.addEventListener(DIRTY_EVENT, handler);
    return () => window.removeEventListener(DIRTY_EVENT, handler);
  }, []);

  if (dirtyCount === 0) return null;

  return (
    <div className="sticky top-[60px] z-30 -mx-4 flex items-center justify-between gap-3 border-y border-amber-400/30 bg-amber-500/10 px-4 py-2 backdrop-blur">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
        {dirtyCount} pronostic{dirtyCount === 1 ? "" : "uri"} nesalvat{dirtyCount === 1 ? "" : "e"}
      </span>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent(SAVE_ALL_EVENT))}
        className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-amber-950 transition hover:bg-amber-300"
      >
        Salvează tot
      </button>
    </div>
  );
}
