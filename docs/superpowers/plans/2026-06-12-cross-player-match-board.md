# Cross-player match prediction board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Once a match is locked, let any logged-in user open a full-screen modal showing everyone's predictions arranged into three columns (home win / draw / away win), colour-coded by the app's 5-tier palette once the result is final.

**Architecture:** A new authenticated `GET` route serves a match's predictions only when that match is locked (enforced server-side). All bucketing/sorting/shaping lives in a pure, unit-tested `lib/match-board.ts`. A client `MatchPredictionsModal` fetches on open and renders the board, reusing the tier tile palette extracted into `lib/tier-styles.ts`. `MatchCard` gains a button in its locked state to open the modal.

**Tech Stack:** Next.js 16 App Router (route handlers, async `params`), React 19, Prisma 7, Tailwind v4, Jest + React Testing Library (jsdom). Romanian UI with typographic quotes `„ ”`.

**Reference (read before starting):**
- `lib/locking.ts` — `isMatchLocked(kickoff)` lock rule (now ≥ kickoff − 1h).
- `lib/match-tier.ts` — `matchPredictionTier(pts, round)` → tier; tiers are `none|miss|partial|close|exact|perfect`.
- `lib/leaderboard.ts` — `buildDisplayName({ username, firstName, lastName })`.
- `lib/predictions.ts` — `isKnockoutRound(round)`.
- `app/api/predictions/match/route.ts` — existing route style (NextResponse, `getSessionUser(await auth())`, `prisma`).
- `app/(app)/jucator/[username]/page.tsx` — source of the `TIER_TILE` map being extracted; visibility precedent.
- Spec: `docs/superpowers/specs/2026-06-12-cross-player-match-board-design.md`.

---

### Task 1: Bucketing + KO badge helpers

**Files:**
- Create: `lib/match-board.ts`
- Test: `__tests__/match-board.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/match-board.test.ts`:

```ts
import { predictionBucket, koDrawBadge } from "@/lib/match-board";

describe("predictionBucket", () => {
  it("returns 'home' when home outscores away", () => {
    expect(predictionBucket(2, 1)).toBe("home");
  });
  it("returns 'away' when away outscores home", () => {
    expect(predictionBucket(0, 3)).toBe("away");
  });
  it("returns 'draw' on equal scores", () => {
    expect(predictionBucket(1, 1)).toBe("draw");
    expect(predictionBucket(0, 0)).toBe("draw");
  });
});

describe("koDrawBadge", () => {
  it("returns 'pen' when penalties predicted (takes precedence)", () => {
    expect(koDrawBadge({ predictsEt: true, predictsPens: true })).toBe("pen");
    expect(koDrawBadge({ predictsEt: false, predictsPens: true })).toBe("pen");
  });
  it("returns 'prel' when only extra time predicted", () => {
    expect(koDrawBadge({ predictsEt: true, predictsPens: false })).toBe("prel");
  });
  it("returns null when neither", () => {
    expect(koDrawBadge({ predictsEt: false, predictsPens: false })).toBeNull();
    expect(koDrawBadge({ predictsEt: null, predictsPens: null })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- match-board`
Expected: FAIL — `Cannot find module '@/lib/match-board'`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/match-board.ts`:

```ts
export type Bucket = "home" | "draw" | "away";

export function predictionBucket(homeScore: number, awayScore: number): Bucket {
  if (homeScore > awayScore) return "home";
  if (homeScore < awayScore) return "away";
  return "draw";
}

export type DrawBadge = "pen" | "prel" | null;

// For knockout predicted-draws: which tiebreak the user expects to advance the
// game. Penalties take precedence over extra time (a pens prediction implies ET).
export function koDrawBadge(p: {
  predictsEt: boolean | null;
  predictsPens: boolean | null;
}): DrawBadge {
  if (p.predictsPens) return "pen";
  if (p.predictsEt) return "prel";
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- match-board`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add lib/match-board.ts __tests__/match-board.test.ts
git commit -m "feat: predictionBucket + koDrawBadge helpers for match board"
```

---

### Task 2: Participant shaping + bucketing/sorting

**Files:**
- Modify: `lib/match-board.ts`
- Test: `__tests__/match-board.test.ts`

- [ ] **Step 1: Write the failing test**

First, **replace** the existing top import line in `__tests__/match-board.test.ts`
(`import { predictionBucket, koDrawBadge } from "@/lib/match-board";`) with a single
combined import (avoids `no-duplicate-imports`):

```ts
import {
  predictionBucket,
  koDrawBadge,
  shapeParticipants,
  bucketParticipants,
  type PredictionRow,
  type BoardParticipant,
} from "@/lib/match-board";
```

Then append the new describe blocks to `__tests__/match-board.test.ts`:

```ts
const row = (over: Partial<PredictionRow> = {}): PredictionRow => ({
  userId: 1,
  homeScore: 1,
  awayScore: 0,
  predictsEt: null,
  predictsPens: null,
  pointsAwarded: null,
  user: { username: "u", firstName: null, lastName: null },
  ...over,
});

describe("shapeParticipants", () => {
  it("builds display names and flags the current user", () => {
    const out = shapeParticipants(
      [
        row({ userId: 7, user: { username: "ana", firstName: "Ana", lastName: "Pop" } }),
        row({ userId: 9, user: { username: "bob", firstName: null, lastName: null } }),
      ],
      7
    );
    expect(out[0]).toMatchObject({ displayName: "Ana Pop", isMe: true });
    expect(out[1]).toMatchObject({ displayName: "bob", isMe: false });
  });
});

describe("bucketParticipants", () => {
  const p = (over: Partial<BoardParticipant> = {}): BoardParticipant => ({
    displayName: "x",
    isMe: false,
    homeScore: 0,
    awayScore: 0,
    predictsEt: null,
    predictsPens: null,
    pointsAwarded: null,
    ...over,
  });

  it("buckets by predicted outcome", () => {
    const cols = bucketParticipants(
      [
        p({ displayName: "H", homeScore: 2, awayScore: 0 }),
        p({ displayName: "D", homeScore: 1, awayScore: 1 }),
        p({ displayName: "A", homeScore: 0, awayScore: 2 }),
      ],
      false
    );
    expect(cols.home.map((x) => x.displayName)).toEqual(["H"]);
    expect(cols.draw.map((x) => x.displayName)).toEqual(["D"]);
    expect(cols.away.map((x) => x.displayName)).toEqual(["A"]);
  });

  it("sorts by points desc when final, alphabetically otherwise", () => {
    const list = [
      p({ displayName: "Ana", homeScore: 1, awayScore: 0, pointsAwarded: 2 }),
      p({ displayName: "Zoe", homeScore: 1, awayScore: 0, pointsAwarded: 7 }),
    ];
    expect(bucketParticipants(list, true).home.map((x) => x.displayName)).toEqual(["Zoe", "Ana"]);
    expect(bucketParticipants(list, false).home.map((x) => x.displayName)).toEqual(["Ana", "Zoe"]);
  });

  it("breaks point ties alphabetically", () => {
    const list = [
      p({ displayName: "Zoe", homeScore: 1, awayScore: 0, pointsAwarded: 7 }),
      p({ displayName: "Ana", homeScore: 1, awayScore: 0, pointsAwarded: 7 }),
    ];
    expect(bucketParticipants(list, true).home.map((x) => x.displayName)).toEqual(["Ana", "Zoe"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- match-board`
Expected: FAIL — `shapeParticipants`/`bucketParticipants`/`BoardParticipant` not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `lib/match-board.ts`:

```ts
import { buildDisplayName } from "@/lib/leaderboard";

export type BoardParticipant = {
  displayName: string;
  isMe: boolean;
  homeScore: number;
  awayScore: number;
  predictsEt: boolean | null;
  predictsPens: boolean | null;
  pointsAwarded: number | null;
};

export type PredictionRow = {
  userId: number;
  homeScore: number;
  awayScore: number;
  predictsEt: boolean | null;
  predictsPens: boolean | null;
  pointsAwarded: number | null;
  user: { username: string; firstName: string | null; lastName: string | null };
};

export function shapeParticipants(
  rows: PredictionRow[],
  meId: number
): BoardParticipant[] {
  return rows.map((r) => ({
    displayName: buildDisplayName(r.user),
    isMe: r.userId === meId,
    homeScore: r.homeScore,
    awayScore: r.awayScore,
    predictsEt: r.predictsEt,
    predictsPens: r.predictsPens,
    pointsAwarded: r.pointsAwarded,
  }));
}

// Group into outcome columns. Within a column: best score first once the match
// is final (so the winners float to the top), else alphabetical by name.
export function bucketParticipants(
  participants: BoardParticipant[],
  final: boolean
): Record<Bucket, BoardParticipant[]> {
  const columns: Record<Bucket, BoardParticipant[]> = { home: [], draw: [], away: [] };
  for (const p of participants) {
    columns[predictionBucket(p.homeScore, p.awayScore)].push(p);
  }
  const sorter = (a: BoardParticipant, b: BoardParticipant) => {
    if (final) {
      const diff = (b.pointsAwarded ?? 0) - (a.pointsAwarded ?? 0);
      if (diff !== 0) return diff;
    }
    return a.displayName.localeCompare(b.displayName, "ro");
  };
  columns.home.sort(sorter);
  columns.draw.sort(sorter);
  columns.away.sort(sorter);
  return columns;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- match-board`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add lib/match-board.ts __tests__/match-board.test.ts
git commit -m "feat: shapeParticipants + bucketParticipants for match board"
```

---

### Task 3: Extract tier tile palette into a shared module

**Files:**
- Create: `lib/tier-styles.ts`
- Modify: `app/(app)/jucator/[username]/page.tsx` (replace inline `TIER_TILE` const with an import; lines ~15-23)

This is a pure refactor — no behaviour change. Existing tests must stay green.

- [ ] **Step 1: Create the shared module**

Create `lib/tier-styles.ts`:

```ts
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
```

- [ ] **Step 2: Update `/jucator` to import it**

In `app/(app)/jucator/[username]/page.tsx`, delete the inline `const TIER_TILE: Record<MatchTier, string> = { ... };` block (the one with `none: "border-slate-700/40 ..."`), and add to the imports near the top (alongside the existing `match-tier` import):

```ts
import { TIER_TILE } from "@/lib/tier-styles";
```

Leave `TIER_EYEBROW` and `TIER_BADGE` inline — only `TIER_TILE` moves. Keep the existing `matchPredictionTier, MATCH_TIER_LABEL, type MatchTier` import line intact (`MatchTier` is still referenced by the remaining maps).

- [ ] **Step 3: Verify nothing broke**

Run: `npx tsc --noEmit && npm test -- jucator match-tier`
Expected: typecheck clean; any jucator/match-tier tests still PASS. (If there is no jucator test file, the command simply reports no tests for that pattern — that's fine; the tsc check is the gate.)

- [ ] **Step 4: Commit**

```bash
git add lib/tier-styles.ts "app/(app)/jucator/[username]/page.tsx"
git commit -m "refactor: extract TIER_TILE palette into lib/tier-styles"
```

---

### Task 4: API route — serve a locked match's predictions

**Files:**
- Create: `app/api/matches/[matchId]/predictions/route.ts`

The lock gate reuses the already-tested `isMatchLocked`; the shaping reuses the Task-2 helper (already unit-tested). The route itself is thin glue, so it has no dedicated test harness (consistent with the repo — no route tests exist). Verification is via tsc + the manual check at the end.

- [ ] **Step 1: Write the route**

Create `app/api/matches/[matchId]/predictions/route.ts`:

```ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { isMatchLocked } from "@/lib/locking";
import { shapeParticipants } from "@/lib/match-board";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const meId = getSessionUser(await auth())?.id;
  if (!meId) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const { matchId: raw } = await params;
  const matchId = Number.parseInt(raw, 10);
  if (!Number.isInteger(matchId)) {
    return NextResponse.json({ error: "Meci invalid" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      round: true,
      status: true,
      kickoffTime: true,
      homeScore: true,
      awayScore: true,
      wentToEt: true,
      wentToPens: true,
      homeTeam: { select: { name: true, flagEmoji: true } },
      awayTeam: { select: { name: true, flagEmoji: true } },
    },
  });
  if (!match) {
    return NextResponse.json({ error: "Meci inexistent" }, { status: 404 });
  }

  // Fairness gate: never reveal others' picks before the match locks. Mirrors
  // the rule used on the Pronosticuri page and /jucator.
  const locked = match.status !== "SCHEDULED" || isMatchLocked(match.kickoffTime);
  if (!locked) {
    return NextResponse.json({ error: "Meciul nu este blocat încă" }, { status: 403 });
  }

  const rows = await prisma.matchPrediction.findMany({
    where: { matchId },
    select: {
      userId: true,
      homeScore: true,
      awayScore: true,
      predictsEt: true,
      predictsPens: true,
      pointsAwarded: true,
      user: { select: { username: true, firstName: true, lastName: true } },
    },
  });

  const final =
    match.status === "FINISHED" && match.homeScore !== null && match.awayScore !== null;

  return NextResponse.json({
    match: {
      id: match.id,
      round: match.round,
      status: match.status,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      final,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      wentToEt: match.wentToEt,
      wentToPens: match.wentToPens,
    },
    participants: shapeParticipants(rows, meId),
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. (If it errors on `prisma.matchPrediction`/`match` selects, run `npx prisma generate` first — required after any schema touch, and harmless here.)

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors for the new file.

- [ ] **Step 4: Commit**

```bash
git add "app/api/matches/[matchId]/predictions/route.ts"
git commit -m "feat: GET /api/matches/[matchId]/predictions (lock-gated)"
```

---

### Task 5: The modal component

**Files:**
- Create: `components/MatchPredictionsModal.tsx`
- Test: `__tests__/MatchPredictionsModal.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/MatchPredictionsModal.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { MatchPredictionsModal } from "@/components/MatchPredictionsModal";

const boardResponse = {
  match: {
    id: 1,
    round: "R16",
    status: "FINISHED",
    homeTeam: { name: "Coreea", flagEmoji: "🇰🇷" },
    awayTeam: { name: "Cehia", flagEmoji: "🇨🇿" },
    final: true,
    homeScore: 2,
    awayScore: 1,
    wentToEt: false,
    wentToPens: false,
  },
  participants: [
    { displayName: "Ana", isMe: true, homeScore: 2, awayScore: 1, predictsEt: null, predictsPens: null, pointsAwarded: 8 },
    { displayName: "Bob", isMe: false, homeScore: 1, awayScore: 1, predictsEt: false, predictsPens: true, pointsAwarded: 0 },
    { displayName: "Cici", isMe: false, homeScore: 0, awayScore: 2, predictsEt: null, predictsPens: null, pointsAwarded: 0 },
  ],
};

describe("MatchPredictionsModal", () => {
  afterEach(() => jest.restoreAllMocks());

  it("renders the columns with result, a 'tu' marker and a KO draw badge", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => boardResponse });

    render(<MatchPredictionsModal matchId={1} round="R16" onClose={() => {}} />);

    await waitFor(() => expect(screen.getByText("Ana")).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith("/api/matches/1/predictions");
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Cici")).toBeInTheDocument();
    expect(screen.getByText(/2\s*–\s*1/)).toBeInTheDocument(); // result line
    expect(screen.getByText("tu")).toBeInTheDocument();
    expect(screen.getByText("pen")).toBeInTheDocument(); // Bob's KO draw badge
  });

  it("shows an error state when the fetch fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });

    render(<MatchPredictionsModal matchId={1} round="R16" onClose={() => {}} />);

    await waitFor(() =>
      expect(screen.getByText("Nu s-au putut încărca pronosticurile.")).toBeInTheDocument()
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- MatchPredictionsModal`
Expected: FAIL — `Cannot find module '@/components/MatchPredictionsModal'`.

- [ ] **Step 3: Write the component**

Create `components/MatchPredictionsModal.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
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

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/matches/${matchId}/predictions`);
      if (!res.ok) {
        setState({ kind: "error" });
        return;
      }
      const data = (await res.json()) as BoardResponse;
      setState({ kind: "ready", data });
    } catch {
      setState({ kind: "error" });
    }
  }, [matchId]);

  useEffect(() => {
    void load();
  }, [load]);

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
              onClick={() => void load()}
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- MatchPredictionsModal`
Expected: PASS (both tests green).

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add components/MatchPredictionsModal.tsx __tests__/MatchPredictionsModal.test.tsx
git commit -m "feat: MatchPredictionsModal cross-player board"
```

---

### Task 6: Wire the button into MatchCard's locked state

**Files:**
- Modify: `components/MatchCard.tsx` (add import + `showBoard` state + button + modal render inside the non-placeholder block)
- Test: `__tests__/MatchCard.test.tsx` (add one test)

- [ ] **Step 1: Write the failing test**

Add this test inside the existing `describe("MatchCard", ...)` block in `__tests__/MatchCard.test.tsx` (the file already imports `render, screen, fireEvent, waitFor` and defines `baseProps`, `italy`, `brazil`):

```tsx
it("shows the 'see others' button when locked and opens the board", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      match: {
        id: 42,
        round: "GROUP_1",
        status: "FINISHED",
        homeTeam: italy,
        awayTeam: brazil,
        final: false,
        homeScore: null,
        awayScore: null,
        wentToEt: null,
        wentToPens: null,
      },
      participants: [],
    }),
  });

  render(<MatchCard {...baseProps} homeTeam={italy} awayTeam={brazil} isLocked />);

  const btn = screen.getByRole("button", { name: /vezi ce-au pus ceilal/i });
  fireEvent.click(btn);

  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith("/api/matches/42/predictions")
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- MatchCard`
Expected: FAIL — no button matching `/vezi ce-au pus ceilal/i` is found.

- [ ] **Step 3: Add the import**

In `components/MatchCard.tsx`, add to the imports (after the `CountdownLock` import line):

```tsx
import { MatchPredictionsModal } from "./MatchPredictionsModal";
```

- [ ] **Step 4: Add modal state**

In the `MatchCard` function body, alongside the other `useState` calls (e.g. right after `const [status, setStatus] = useState<...>("idle");`), add:

```tsx
const [showBoard, setShowBoard] = useState(false);
```

- [ ] **Step 5: Render the button + modal in the locked branch**

In the non-placeholder block (the `) : (` branch that renders the score grid), immediately **after** the closing of the `{!props.isLocked && ( ... )}` save-row block and **before** the `{scoredTier && ( ... )}` block, insert:

```tsx
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
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- MatchCard`
Expected: PASS — existing MatchCard tests stay green and the new one passes.

- [ ] **Step 7: Full verification**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all tests pass, typecheck clean, lint clean.

- [ ] **Step 8: Commit**

```bash
git add components/MatchCard.tsx __tests__/MatchCard.test.tsx
git commit -m "feat: open cross-player board from locked MatchCard"
```

---

### Task 7: Manual smoke check

The DB scripts and local `.env` point at PROD (see CLAUDE.md) — do **not** spin up a writeable dev server casually. This is a read-only feature, but to be safe, verify with the preview tooling against a known-locked match rather than mutating data.

- [ ] **Step 1:** Start the dev server via the preview tooling (`preview_start`).
- [ ] **Step 2:** Navigate to `/pronosticuri` on a matchday with at least one locked match. Confirm the „Vezi ce-au pus ceilalți" button appears only on locked cards (not on still-editable ones).
- [ ] **Step 3:** Open the modal. Confirm: three columns labelled with the team names / „Egal"; participants bucketed correctly; your row marked „tu"; tiles neutral if the match isn't final, colour-graded if it is; KO draws show a „prel"/„pen" badge.
- [ ] **Step 4:** Confirm closing works (button + Esc + backdrop). Capture a screenshot for the user.

---

## Notes for the implementer

- **Romanian + typographic quotes:** all user-facing strings use `„ ”`. ESLint (`react/no-unescaped-entities`) will flag raw quotes in JSX.
- **`getSessionUser(await auth())`** — never `session.user.id` (typed `never`).
- **`npx prisma generate`** if tsc complains about Prisma model selects.
- The route returns `round` as a plain `string`; `matchPredictionTier` and `isKnockoutRound` both accept `string`, so no enum import is needed client-side.
- Tier colours are intentionally duplicated between `MatchCard` (chrome) and `tier-styles` (tiles) — keep them separate; only the tile map was shared.
