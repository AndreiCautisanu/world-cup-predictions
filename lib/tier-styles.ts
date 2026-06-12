import type { MatchTier } from "@/lib/match-tier";

// Tier → tile colour classes for compact score tiles. Shared by the /jucator
// prediction rows and the cross-player match board modal. MatchCard keeps its
// own distinct chrome variant (see its in-file comment) — do not consolidate it.
export const TIER_TILE: Record<MatchTier, string> = {
  none: "border-slate-700/40 bg-slate-900/40 text-slate-400",
  miss: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  partial: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  close: "border-sky-500/40 bg-sky-500/10 text-sky-200",
  exact: "border-emerald-400/50 bg-emerald-500/10 text-emerald-200",
  perfect:
    "border-yellow-300/60 bg-yellow-400/15 text-yellow-100 shadow-[0_0_28px_-6px_rgba(250,204,21,0.55)]",
};
