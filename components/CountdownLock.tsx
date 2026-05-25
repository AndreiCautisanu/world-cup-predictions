"use client";

import { useEffect, useState } from "react";
import { isMatchLocked, lockTimeFor } from "@/lib/locking";

type Props = {
  kickoff: Date;
};

export function CountdownLock({ kickoff }: Props) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (isMatchLocked(kickoff, now)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-300 ring-1 ring-rose-500/30">
        <LockIcon />
        Blocat
      </span>
    );
  }

  const lockAt = lockTimeFor(kickoff);
  const diffMs = lockAt.getTime() - now.getTime();
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const urgent = totalMinutes <= 60;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ring-1 ${
        urgent
          ? "bg-amber-500/10 text-amber-200 ring-amber-400/30"
          : "bg-slate-800/80 text-slate-300 ring-slate-700"
      }`}
    >
      <ClockIcon />
      Blocare în {hours}h {minutes}m
    </span>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden className="h-2.5 w-2.5 fill-current">
      <path d="M3 5V3.5a3 3 0 1 1 6 0V5h.5A1.5 1.5 0 0 1 11 6.5v3A1.5 1.5 0 0 1 9.5 11h-7A1.5 1.5 0 0 1 1 9.5v-3A1.5 1.5 0 0 1 2.5 5H3Zm1.5 0h3V3.5a1.5 1.5 0 0 0-3 0V5Z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden className="h-2.5 w-2.5 fill-current">
      <path d="M6 0a6 6 0 1 0 0 12A6 6 0 0 0 6 0Zm.75 6.31 2.4 1.39a.75.75 0 1 1-.75 1.3l-2.78-1.6A.75.75 0 0 1 5.25 6.7V2.75a.75.75 0 0 1 1.5 0v3.56Z" />
    </svg>
  );
}
