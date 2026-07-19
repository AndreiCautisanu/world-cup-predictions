# Tournament Leaderboard Race — Design Spec

## Goal

Add a clear, attractive motion recap of how the prediction leaderboard evolved across the completed tournament. The recap should show cumulative points after each scoring event, make lead changes easy to understand, include every player who participated, and let players who stopped predicting naturally leave the race.

The feature is a retrospective visualization, not a replacement for the existing leaderboard.

## User Experience

The existing `/clasament` page links to a dedicated `/clasament/cursa` page titled **Cursa turneului**.

The page contains a horizontal animated bar race:

- Every player who submitted at least one match prediction appears.
- Each bar represents the player's cumulative awarded points at the current moment.
- Bars grow and reorder after each chronological scoring event.
- A player remains visible through the last match they predicted. Their bar exits when the animation advances beyond that match and there are no later match predictions from that player.
- A player who skipped one or more matches but later returned remains visible during the skipped interval.
- The race ends on the final leaderboard and holds there until replayed or scrubbed.

The playback controls are limited to play/pause, restart, and a draggable tournament timeline. The page begins in a ready state rather than playing before the user can orient themselves.

## Timeline and Scoring Reconstruction

The timeline is derived from existing tournament data at request time. No database migration or persisted snapshot table is required.

A server-side timeline builder loads users, finished matches, match predictions, group-standing predictions, and bonus predictions. It emits compact snapshots ordered by tournament time.

### Scoring events

1. **Match predictions:** awarded points enter the cumulative total at the corresponding finished match.
2. **Group-standing predictions:** each group's awarded points enter when that group's final group-stage match finishes.
3. **Dark-horse bonus:** point increases are reconstructed at the knockout milestone where the selected team reached the next scoring tier.
4. **Champion and runner-up bonuses:** awarded points enter at the Final.
5. **Top-scorer bonus:** awarded points enter at the Final because the schema does not preserve a separate historical award timestamp.

Within the same kickoff time, events use stable match ID order so repeated reconstruction is deterministic. A snapshot contains the current tournament label, cumulative player totals, per-player point deltas, active status, and the information needed to render the current match or milestone.

### Player participation and exits

For each user, the builder finds the latest kickoff among matches for which that user submitted a prediction. This is the user's final participation point.

The player is present in snapshots up to and including that match. In the next snapshot, the player is absent. No explanatory label or special dropout state is shown; the bar simply exits through the standard animation.

Bonus and group-standing submissions alone do not keep a player active after their last match prediction. This intentionally models continued match participation, as agreed.

## Ranking

Each snapshot sorts visible players by:

1. cumulative points, descending;
2. display name using the existing Romanian, case-insensitive ordering.

This matches the current leaderboard's deterministic tie behavior. Rank changes are visual only; no additional tiebreaking rules are introduced.

## Visual Direction

The graphic uses a restrained football-broadcast scoreboard aesthetic that fits the current dark InRing interface.

- The background stays in the existing slate palette with subtle field or stadium-screen depth.
- Player names remain attached to their bars during reordering.
- Each player receives a stable color derived deterministically from their identity so the color does not change across frames.
- The current round, teams, and result appear above match-based frames, for example `Sferturi · Argentina 2–1 Franța`.
- A short point delta such as `+7` appears beside players who score on the current event.
- Ordinary frames move briskly; lead changes receive a slightly longer hold.
- The winner receives a gold treatment only on the final frame.
- Decoration remains secondary to names, totals, and movement.

The layout is mobile-first. Row density adapts to the number of active players, and playback controls remain reachable without covering the bars. Names and totals remain the primary identity mechanism, so repeated palette colors cannot make the race ambiguous.

## Motion and Controls

Playback is implemented in a client component that receives precomputed snapshots from the server page.

- Score growth and vertical reordering animate together between snapshots.
- Departing players slide a short distance and fade out without explanatory copy.
- A scrubber can move directly to any point in the timeline.
- Restart returns to the first snapshot in the ready state.
- The final frame remains static and exposes a replay action.
- `prefers-reduced-motion` replaces interpolated transitions with immediate snapshot changes while preserving the timeline and controls.

Motion timings are centralized in the component rather than embedded in the data model. This keeps scoring reconstruction independent from presentation.

## Components and Boundaries

### Timeline builder

A focused server-side module owns database input normalization, milestone reconstruction, cumulative totals, participation cutoffs, and deterministic ordering. It exposes a pure transformation function for unit testing plus a thin Prisma-loading function.

### Race page

The server page authenticates through the existing app layout, loads the timeline, and renders the page header, link back to the leaderboard, and race component. It remains dynamically rendered because the data comes from PostgreSQL.

### Race player

The client component owns the active frame, playback state, timing, scrubbing, reduced-motion behavior, and rendering. It does not recalculate scores.

### Leaderboard entry point

The current leaderboard receives one visible link or card to **Vezi cursa turneului**. No bottom-navigation item is added for this retrospective feature.

## Empty and Incomplete Data

- If there are no finished scoring events, the page explains that the recap is not available and links back to the leaderboard.
- A match without a finished result or awarded prediction points contributes no scoring event.
- A malformed or incomplete bonus milestone is omitted rather than estimated.
- A player with no match predictions is not included because there is no participation period to visualize.
- An empty delta frame is excluded unless it marks a meaningful milestone required for bonus or group-standing points.

These rules favor authoritative totals over fabricated historical detail.

## Accessibility

- Playback controls use native buttons and a labeled range input.
- Current match, playback state, and final winner are available as text, not only color or motion.
- Player identity never depends on bar color alone.
- Keyboard users can play, pause, restart, and scrub.
- Reduced-motion preferences are honored without removing access to any score snapshot.
- Focus states follow the existing emerald-accented interface.

## Verification

### Timeline unit tests

- cumulative match points across multiple matches;
- group-standing awards at each group's completion;
- dark-horse incremental milestones;
- champion, runner-up, and top-scorer bonuses at the Final;
- deterministic ordering for tied scores and simultaneous kickoffs;
- skipped matches followed by later participation;
- exit immediately after a player's final predicted match;
- omission of incomplete events.

### Component tests

- initial ready state;
- play, pause, restart, and replay;
- scrubber navigation;
- departing player removal;
- final frozen state;
- reduced-motion behavior.

### Integration and visual verification

- confirm the final snapshot totals and ordering match `/clasament`;
- run the focused tests, full test suite, lint, and production build;
- inspect playback in the browser at mobile and desktop widths;
- verify long names, ties, many active rows, keyboard focus, and reduced motion.

## Scope

This feature does not add shareable video export, audio, live result streaming, a line or bump chart, manual annotations, or a new database history table. It is a single interactive retrospective bar race built from the tournament data already stored by the app.
