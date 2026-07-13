# Cross-player match prediction board ("Vezi ce-au pus ceilalți")

**Date:** 2026-06-12
**Status:** Approved design, ready for planning

## Goal

Once a match is locked (predictions can no longer change), let any logged-in user
open a board showing **what everyone predicted for that match**, arranged into three
columns by predicted outcome: home win / draw / away win. When the match result is
final, each prediction is colour-coded by how well it did using the app's existing
5-tier palette. This builds tension and fun for watching a match together.

Romanian UI throughout (typographic quotes `„ ”`).

## Fairness rule (non-negotiable)

A match's cross-player board is served **only when that match is locked** — the same
rule already used on the Pronosticuri page and `/jucator`:

```
locked = match.status !== "SCHEDULED" || isMatchLocked(match.kickoffTime)
```

(`isMatchLocked` from `lib/locking.ts` = now ≥ kickoff − 1h.)

This is enforced **server-side** in the new API route, not merely hidden in the UI.
Before lock: the route returns 403 and the entry-point button does not render. This
prevents anyone from seeing others' picks early by hitting the API directly.

## User flow

1. On the Pronosticuri page (`/pronosticuri?md=…`), a `MatchCard` whose match is
   locked shows a button: **„Vezi ce-au pus ceilalți"**.
2. Tapping it opens a **full-screen modal/overlay** for that match.
3. The modal fetches everyone's predictions on open and renders the 3-column board.
4. While the match is not yet final → neutral tiles (no points yet).
   Once final → tiles coloured by the 5-tier palette.

## Components

### 1. API route — `app/api/matches/[matchId]/predictions/route.ts`

`GET`, auth required (`getSessionUser(await auth())`; 401 if absent).

- Load match (`id`, `kickoffTime`, `round`, `status`, `homeScore`, `awayScore`,
  `wentToEt`, `wentToPens`, `homeTeam`, `awayTeam`, `group`). 404 if missing.
- Compute `locked` per the fairness rule. If not locked → **403** (no body leak).
- Load all `matchPrediction` rows for this match, including
  `user: { username, firstName, lastName }`.
- Respond with:

```ts
{
  match: {
    id, round, status,
    homeTeam: { name, flagEmoji } | null,
    awayTeam: { name, flagEmoji } | null,
    final: boolean,                 // status === "FINISHED" && scores non-null
    homeScore: number | null,       // actual result
    awayScore: number | null,
    wentToEt: boolean | null,
    wentToPens: boolean | null,
  },
  participants: Array<{
    displayName: string,            // buildDisplayName from lib/leaderboard
    isMe: boolean,
    homeScore: number,
    awayScore: number,
    predictsEt: boolean | null,
    predictsPens: boolean | null,
    pointsAwarded: number | null,
  }>,
}
```

Note: `matchPrediction` carries no `displayName`; build it from the included `user`.

### 2. Bucketing helper — `lib/match-board.ts`

Pure, unit-tested:

```ts
type Bucket = "home" | "draw" | "away";
function predictionBucket(homeScore: number, awayScore: number): Bucket
//   homeScore > awayScore -> "home"
//   homeScore < awayScore -> "away"
//   else                  -> "draw"
```

Column labels: home team name / „Egal" / away team name. For a **knockout** match,
a predicted draw additionally shows a small badge — „pen" if `predictsPens`, else
„prel" if `predictsEt` — indicating they expect penalties / extra time. (Columns are
always by the 90-minute predicted scoreline, group and KO alike.)

### 3. Tier tile styles — `lib/tier-styles.ts` (small reuse extraction)

The tier → tile colour map is currently inlined in `/jucator` (`TIER_TILE`). Extract
**just that tile variant** into a shared module so the new modal and `/jucator` both
consume it. `MatchCard` keeps its own distinct chrome variant (intentional per its
in-file comment — do not touch). Tiers come from
`matchPredictionTier(pointsAwarded, round)` in `lib/match-tier.ts`.

### 4. Modal — `components/MatchPredictionsModal.tsx` (client)

- Full-screen overlay with a close button; closes on backdrop click / Esc.
- Fetches `GET /api/matches/[id]/predictions` on open.
- States: loading (spinner), error (retry), empty („Doar tu ai pronosticat" when the
  only participant is the current user, or none at all).
- Three columns side by side, each headed by its outcome label. Each participant is a
  score tile: `displayName`, predicted `home · away`, KO draw badge where relevant.
- Neutral tiles until the match is `final`; then coloured by tier via `tier-styles`.
- Current user's tile carries a „tu" marker.
- Sort within a column: by `pointsAwarded` desc when final, else alphabetical by name.

### 5. `MatchCard` change

In the locked branch (currently the card just disables inputs and hides the save
button), render the „Vezi ce-au pus ceilalți" button and own the modal open/close
state. `round` is already a prop and is passed to the modal for tier colouring.
`matchId` is already a prop.

## Testing

- **`lib/match-board.ts`**: unit tests for home / draw / away bucketing and the KO
  draw badge selection (pens vs prel vs none).
- **API route**: unlocked match → 403; locked match → returns participants;
  unauthenticated → 401; missing match → 404.
- Existing Jest setup (`__tests__/`) covers lib + component tests.

## Out of scope (YAGNI)

- No dedicated `/meci/[id]` route or shareable URL (entry is the card button + modal).
- No "highlight the winning column" treatment — plain 5-tier tiles only.
- No relabelling KO columns to "advances" — columns stay by 90-min scoreline.
- No realtime updates; the board reflects data at open time.
