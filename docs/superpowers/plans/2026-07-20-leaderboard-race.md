# Tournament Leaderboard Race Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished, mobile-first animated bar race that reconstructs every participating player's cumulative tournament points and removes each player after their last predicted match.

**Architecture:** A pure timeline transformer reconstructs deterministic score snapshots from existing Prisma records, while a thin loader supplies production data. A client-only race player consumes those snapshots and owns playback, interpolation, controls, accessibility, and responsive rendering; the server page and existing leaderboard only compose these pieces.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, Prisma 7, Tailwind CSS 4, Jest 30, Testing Library.

## Global Constraints

- Read relevant guides under `node_modules/next/dist/docs/` before changing Next.js code.
- Do not add a database migration, animation package, audio, video export, line chart, bump chart, or bottom-navigation item.
- Preserve the current Romanian UI and the existing slate/emerald InRing visual system.
- Include every user with at least one match prediction; keep them visible through their final predicted match, then remove them on the next snapshot.
- Reconstruct all scores from authoritative stored results and awarded points; never invent missing points.
- Preserve the user's unrelated uncommitted files and stage only files created or changed for this feature.
- Respect `prefers-reduced-motion`, keyboard operation, and mobile layouts.

---

### Task 1: Pure leaderboard timeline reconstruction

**Files:**
- Create: `lib/leaderboard-race.ts`
- Create: `__tests__/leaderboard-race.test.ts`

**Interfaces:**
- Consumes: normalized users, finished matches, match predictions, group-standing predictions, and bonus predictions.
- Produces: `buildLeaderboardRaceTimeline(input: LeaderboardRaceInput): RaceTimeline`, `RaceSnapshot`, `RacePlayerSnapshot`, and `RaceTimeline`.

- [ ] **Step 1: Write failing tests for chronological cumulative points and stable ranking**

Create fixtures with two users and two finished matches. Assert that the initial frame has zero totals, later frames accumulate `pointsAwarded`, ties use `displayName.localeCompare(..., "ro", { sensitivity: "base" })`, and the final total matches the stored award sum.

```ts
const timeline = buildLeaderboardRaceTimeline(fixture());
expect(timeline.snapshots[0].players.map((p) => p.total)).toEqual([0, 0]);
expect(timeline.snapshots.at(-1)?.players.map((p) => [p.displayName, p.total]))
  .toEqual([["Ana", 11], ["Mihai", 6]]);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --runInBand __tests__/leaderboard-race.test.ts`

Expected: FAIL because `@/lib/leaderboard-race` does not exist.

- [ ] **Step 3: Implement timeline types, chronological match frames, deltas, and deterministic ranks**

Define normalized serializable input types. Create an initial ready snapshot followed by finished-match snapshots in `kickoffTime`, then `id`, order. Sum only non-null awarded match points, populate a per-player `delta`, and use the existing `buildDisplayName` helper.

```ts
export type RacePlayerSnapshot = {
  userId: number;
  username: string;
  displayName: string;
  total: number;
  delta: number;
  rank: number;
};

export type RaceSnapshot = {
  key: string;
  kind: "start" | "match";
  occurredAt: string;
  round: RaceRound | null;
  label: string;
  detail: string | null;
  players: RacePlayerSnapshot[];
  leaderChanged: boolean;
};

export type RaceTimeline = {
  snapshots: RaceSnapshot[];
  finalMax: number;
};
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- --runInBand __tests__/leaderboard-race.test.ts`

Expected: PASS for chronological accumulation and ordering.

- [ ] **Step 5: Add failing tests for participation exits and skipped matches**

Assert that a player is visible on the snapshot for their last predicted match, absent on the next snapshot, and remains visible through an unpredicted gap if they have a later prediction.

```ts
expect(playersAt(timeline, "match-2")).toContain("early_exit");
expect(playersAt(timeline, "match-3")).not.toContain("early_exit");
expect(playersAt(timeline, "match-3")).toContain("returned_later");
```

- [ ] **Step 6: Run the exit tests and verify RED**

Run: `npm test -- --runInBand __tests__/leaderboard-race.test.ts -t "participation"`

Expected: FAIL because every player still appears in every snapshot.

- [ ] **Step 7: Implement last-predicted-match participation cutoffs**

Compute each user's maximum predicted match tuple `(kickoffTime, matchId)`. Include them while the current event tuple is less than or equal to that tuple. Keep all participating users in the initial snapshot.

- [ ] **Step 8: Add failing milestone tests**

Cover group standings at a group's final match, dark-horse totals at R32 participation and each advancement, and champion/runner-up/top-scorer awards at the Final. Also assert incomplete or null awards contribute zero.

```ts
expect(snapshot("group-final").players[0]).toMatchObject({ total: 10, delta: 3 });
expect(snapshot("r32-win").players[0]).toMatchObject({ total: 13, delta: 3 });
expect(snapshot("final").players[0]).toMatchObject({ total: 58, delta: 45 });
```

- [ ] **Step 9: Run milestone tests and verify RED**

Run: `npm test -- --runInBand __tests__/leaderboard-race.test.ts -t "milestone|bonus|standing"`

Expected: FAIL because milestone awards have not been merged into match frames.

- [ ] **Step 10: Implement group and bonus milestones**

Merge each group's standing-prediction total into its last finished group match. Reconstruct dark-horse tiers (`3, 6, 10, 15, 22, 30`) from participation and knockout winners, capped by the stored `darkHorsePts`; add the incremental difference at the corresponding match. Add stored champion, runner-up, and top-scorer points to the Final frame.

- [ ] **Step 11: Verify Task 1 and commit**

Run: `npm test -- --runInBand __tests__/leaderboard-race.test.ts`

Expected: all timeline tests PASS with no warnings.

Commit only Task 1 files:

```bash
git add lib/leaderboard-race.ts __tests__/leaderboard-race.test.ts
git commit -m "Build leaderboard race timeline"
```

---

### Task 2: Prisma loader and final-total integration check

**Files:**
- Modify: `lib/leaderboard-race.ts`
- Modify: `__tests__/leaderboard-race.test.ts`

**Interfaces:**
- Consumes: `PrismaClient` and the pure `buildLeaderboardRaceTimeline` interface from Task 1.
- Produces: `getLeaderboardRaceTimeline(prisma: PrismaClient): Promise<RaceTimeline>`.

- [ ] **Step 1: Add a failing loader-shape test**

Use a narrow fake Prisma object to verify the loader requests users, finished matches with teams and predictions, group-standing predictions, and bonus fields, then forwards normalized data to the pure builder.

- [ ] **Step 2: Run the loader test and verify RED**

Run: `npm test -- --runInBand __tests__/leaderboard-race.test.ts -t "loader"`

Expected: FAIL because `getLeaderboardRaceTimeline` is not exported.

- [ ] **Step 3: Implement the thin Prisma loader**

Use explicit `select` clauses. Serialize dates to ISO strings before returning props across the server/client boundary. Keep all scoring logic in the pure builder.

```ts
export async function getLeaderboardRaceTimeline(
  prisma: PrismaClient
): Promise<RaceTimeline> {
  const [users, matches, standings, bonuses] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, username: true, firstName: true, lastName: true },
    }),
    prisma.match.findMany({
      where: { status: "FINISHED" },
      select: {
        id: true, round: true, kickoffTime: true, groupId: true,
        homeScore: true, awayScore: true, homeAdvanced: true,
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
        predictions: { select: { userId: true, pointsAwarded: true } },
      },
      orderBy: [{ kickoffTime: "asc" }, { id: "asc" }],
    }),
    prisma.groupStandingPrediction.findMany({
      select: { userId: true, groupId: true, pointsAwarded: true },
    }),
    prisma.bonusPrediction.findMany({
      select: {
        userId: true, darkHorseTeamId: true, darkHorsePts: true,
        championPts: true, runnerUpPts: true, topScorerPts: true,
      },
    }),
  ]);
  return buildLeaderboardRaceTimeline(normalizeRaceInput(users, matches, standings, bonuses));
}
```

- [ ] **Step 4: Add and pass a final-total consistency test**

Build a complete fixture and assert that each player still visible in the last race snapshot has the same total as `summarizeLeaderboardRows` for the same award records.

- [ ] **Step 5: Verify Task 2 and commit**

Run: `npm test -- --runInBand __tests__/leaderboard-race.test.ts __tests__/leaderboard.test.ts`

Expected: both suites PASS.

```bash
git add lib/leaderboard-race.ts __tests__/leaderboard-race.test.ts
git commit -m "Load leaderboard race data"
```

---

### Task 3: Accessible animated race player

**Files:**
- Create: `components/LeaderboardRace.tsx`
- Create: `__tests__/LeaderboardRace.test.tsx`

**Interfaces:**
- Consumes: `timeline: RaceTimeline` from `lib/leaderboard-race.ts`.
- Produces: `<LeaderboardRace timeline={timeline} />` with play/pause, restart/replay, range scrubbing, and responsive animated rows.

- [ ] **Step 1: Write failing tests for initial state and controls**

Render a three-frame timeline. Assert the ready state shows `Start`, the Play button advances under fake timers, Pause stops advancement, the range input scrubs, and Restart returns to frame zero.

```tsx
render(<LeaderboardRace timeline={timeline} />);
fireEvent.click(screen.getByRole("button", { name: /pornește/i }));
act(() => jest.advanceTimersByTime(1200));
expect(screen.getByText("Meciul 1")).toBeInTheDocument();
```

- [ ] **Step 2: Run the component tests and verify RED**

Run: `npm test -- --runInBand __tests__/LeaderboardRace.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement playback state and semantic controls**

Use `useState`, a single timeout effect, native buttons, and a labeled range input. Ordinary frames use a short hold; `leaderChanged` frames use a longer hold. End playback on the last snapshot and expose Replay.

- [ ] **Step 4: Run the control tests and verify GREEN**

Run: `npm test -- --runInBand __tests__/LeaderboardRace.test.tsx`

Expected: initial playback tests PASS.

- [ ] **Step 5: Add failing tests for row ordering, deltas, exits, and reduced motion**

Assert that rows expose current rank and total, positive deltas render as `+N`, previous-only players receive an exiting state for one transition, and `matchMedia("(prefers-reduced-motion: reduce)")` disables transition classes without removing controls.

- [ ] **Step 6: Run the motion tests and verify RED**

Run: `npm test -- --runInBand __tests__/LeaderboardRace.test.tsx -t "rows|exit|reduced"`

Expected: FAIL because visual row interpolation is not implemented.

- [ ] **Step 7: Implement the broadcast-style race stage**

Render current and previous player unions as absolutely positioned rows so `transform: translateY(...)` animates reordering. Animate bar width, score totals, deltas, opacity, and exit translation with CSS utilities. Use a deterministic eight-color palette, but retain names and totals as the authoritative identity. Scale bars against the current frame leader with a non-zero minimum for readability.

- [ ] **Step 8: Implement polished event header and responsive controls**

Show round, match teams/result or milestone detail, frame count, a subtle progress track, and a final gold winner state. Keep controls sticky within the card on small screens and ensure long names truncate without hiding totals.

- [ ] **Step 9: Verify Task 3 and commit**

Run: `npm test -- --runInBand __tests__/LeaderboardRace.test.tsx`

Expected: all component tests PASS without act warnings.

```bash
git add components/LeaderboardRace.tsx __tests__/LeaderboardRace.test.tsx
git commit -m "Animate leaderboard race playback"
```

---

### Task 4: Race page and leaderboard entry point

**Files:**
- Create: `app/(app)/clasament/cursa/page.tsx`
- Modify: `app/(app)/clasament/page.tsx`
- Create: `__tests__/clasament-cursa-page.test.tsx`

**Interfaces:**
- Consumes: `getLeaderboardRaceTimeline(prisma)` and `<LeaderboardRace timeline={timeline} />`.
- Produces: authenticated `/clasament/cursa` route and visible `/clasament` entry link.

- [ ] **Step 1: Write a failing page test**

Mock the loader and assert the page renders the Romanian title, back link, race component content, and the empty state when fewer than two snapshots exist.

- [ ] **Step 2: Run the page test and verify RED**

Run: `npm test -- --runInBand __tests__/clasament-cursa-page.test.tsx`

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement the dynamic server page**

Export `dynamic = "force-dynamic"`, load the timeline with the Prisma singleton, render a compact editorial header, and handle the empty state with a link back to `/clasament`.

- [ ] **Step 4: Add the leaderboard entry point**

Add a prominent but subordinate card between the leaderboard header and standings. Use Romanian copy `Cursa turneului` and `Vezi cum s-a schimbat clasamentul, meci cu meci.` with a link to `/clasament/cursa`.

- [ ] **Step 5: Verify Task 4 and commit**

Run: `npm test -- --runInBand __tests__/clasament-cursa-page.test.tsx __tests__/leaderboard.test.ts`

Expected: both suites PASS.

```bash
git add 'app/(app)/clasament/cursa/page.tsx' 'app/(app)/clasament/page.tsx' __tests__/clasament-cursa-page.test.tsx
git commit -m "Add tournament race page"
```

---

### Task 5: Full verification and visual refinement

**Files:**
- Modify only feature files from Tasks 1–4 when verification exposes a defect.

**Interfaces:**
- Consumes: the complete race feature.
- Produces: verified responsive, accessible, production-buildable behavior.

- [ ] **Step 1: Run automated verification**

Run:

```bash
npm test -- --runInBand
npm run lint
npm run build
```

Expected: all tests PASS, ESLint exits 0, and Next.js production build exits 0.

- [ ] **Step 2: Start the application and inspect in the in-app browser**

Run `npm run dev`, authenticate with available local credentials or use a focused local harness if the development database is unavailable, and open `/clasament/cursa`.

- [ ] **Step 3: Verify desktop and mobile behavior**

At approximately 390px and 768px widths, verify names, totals, deltas, event header, play/pause, restart, scrubber, row exits, final winner, keyboard focus, and no horizontal overflow. Capture screenshots for comparison.

- [ ] **Step 4: Verify reduced motion and final-total consistency**

Emulate `prefers-reduced-motion: reduce`, replay and scrub through the race, and compare the final visible players' totals with `/clasament`.

- [ ] **Step 5: Review the diff and report completion**

Run:

```bash
git diff --check
git status --short
git log --oneline -6
```

Confirm only feature files plus the pre-existing user changes are present. Do not stage or modify the pre-existing `jucator` page, its test, or private utility scripts.
