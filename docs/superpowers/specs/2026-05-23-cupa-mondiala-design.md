# Cupa Mondiala — Design Spec
*World Cup 2026 predictions web app for a private friend group*

---

## Overview

A private, invite-only web app where a group of friends submit predictions for World Cup 2026 matches and compete on a live leaderboard. Built in Romanian. Hosted on Railway at `cupamondiala.andrei42.com`, auto-deployed from the `main` branch of `AndreiCautisanu/world-cup-predictions`.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) |
| ORM | Prisma |
| Database | PostgreSQL (Railway) |
| Auth | NextAuth v5 (Auth.js) — Credentials provider |
| Styling | Tailwind CSS |
| Results API | football-data.org (free tier) |
| Cron | Railway Cron → POST `/api/admin/sync-results` |
| Language | Romanian (UI text written directly, no i18n library) |

---

## Authentication

### Registration
- Single shared invite code (stored in `invite_codes` table, `is_active` flag)
- Friend visits `/register`, enters invite code + chooses username + password (min 8 chars)
- Server validates invite code is active, bcrypt-hashes password, creates `users` row, starts session
- Admin can disable/rotate the code at `/admin/invite-code` after everyone has joined

### Login
- Username + password via NextAuth Credentials provider
- DB-backed sessions (not JWT) — easier to invalidate if needed
- Secure, httpOnly, SameSite=Lax session cookie

### Middleware
- All routes except `/login` and `/register` require an active session → redirect to `/login`
- `/admin/*` routes additionally require `is_admin = true` → 403 otherwise

---

## WC2026 Format

- 48 teams across 12 groups of 4 teams
- Group stage: 6 matches per group (4 teams × 3 matchdays) = 72 matches total
- Top 2 from each group advance (24 teams) + 8 best 3rd-place teams = 32 teams
- Knockout stage: R32 (16) → R16 (8) → QF (4) → SF (2) → 3rd place playoff (1) + Final (1) = 32 matches

---

## Prediction Types

### 1. Group Stage Match Scores
- Predict exact score (home goals, away goals) for each of the 72 group matches
- Submitted and editable per match, locks 1 hour before each match's `kickoff_time`
- Organized by matchday (Matchday 1 / 2 / 3) in the UI

### 2. Group Standings
- For each of the 12 groups: predict the 1st, 2nd, 3rd, and 4th place finisher
- Locks at tournament kickoff (first `kickoff_time` in the DB)
- Submitted via dropdown selectors per position (no duplicate teams within a group)

### 3. Knockout Match Predictions
- For each knockout match: predict winner (implicit from score) + 90-min scoreline + whether it goes to ET/penalties
- Unlocks automatically when both `home_team_id` and `away_team_id` are set on the match row (filled by admin or auto-sync after group stage resolves)
- Locks 1 hour before kickoff per match

### 4. Pre-Tournament Bonus
- **Champion** — pick the tournament winner (any team)
- **Runner-up** — pick the finalist who doesn't win (any team, different from champion)
- **Top scorer (Golden Boot)** — free text player name
- **Dark horse** — pick a team from Pot 3 or Pot 4 only; points scale with how far they go
- All bonus predictions lock at tournament kickoff

---

## Scoring System

### Group Stage Matches (per match, max 7 pts)
| Outcome | Points |
|---|---|
| Wrong result (W/D/L) | 0 |
| Correct result only | 2 |
| Correct result + one team's goals right | 5 |
| Exact score | 7 |

**Formula:**
```
predicted_result = sign(predicted_home - predicted_away)
actual_result    = sign(actual_home - actual_away)
if predicted_result ≠ actual_result → 0
if exact score → 7
if one team's goals correct → 5
else → 2
```

### Group Standings (per group, max 12 pts)
- 3 pts per correctly placed team (positions 1–4)
- No bonus for exact full order — equal weight across all positions
- Max per group: 12 pts · Grand max: 144 pts

### Knockout Matches (per match, max 10 pts)
| Outcome | Points |
|---|---|
| Wrong winner | 0 |
| Correct winner | 4 |
| Correct winner + exact 90-min score | 8 |
| Correct winner + exact 90-min score + correctly called ET/pens | 10 |

*Score stored is the 90-min score (before extra time). ET/pens is a boolean flag on both the match and the prediction.*

### Pre-Tournament Bonus
| Prediction | Points if correct |
|---|---|
| Champion | 20 |
| Runner-up | 10 |
| Golden Boot | 15 |
| Dark horse (Pot 3/4 only) | 0–30 (progressive) |

**Dark horse progression (cumulative):**
| Furthest round | Points |
|---|---|
| Knocked out in group stage | 0 |
| Qualifies → R32 | 3 |
| Wins R32 → R16 | 6 |
| Reaches QF | 10 |
| Reaches SF | 15 |
| Reaches Final | 22 |
| Wins tournament | 30 |

### Grand Totals
| Category | Max pts |
|---|---|
| Group matches (72 × 7) | 504 |
| Group standings (12 × 12) | 144 |
| Knockout matches (32 × 10) | 320 |
| Bonus | 75 |
| **Total** | **1043** |

*Realistic expected range: 200–450 pts.*

---

## Database Schema

### `users`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| username | varchar unique | |
| password_hash | varchar | bcrypt |
| is_admin | bool | default false |
| created_at | timestamptz | |

### `invite_codes`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| code | varchar unique | |
| is_active | bool | |
| created_at | timestamptz | |

### `groups`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| name | char(1) | 'A'–'L' |

### `teams`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| name | varchar | |
| fifa_code | char(3) | e.g. "BRA" |
| pot | int | 1–4 (for dark horse restriction) |
| flag_emoji | varchar | |
| group_id | FK → groups | |

### `matches`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| home_team_id | FK → teams, **nullable** | null for unresolved KO slots |
| away_team_id | FK → teams, **nullable** | null for unresolved KO slots |
| group_id | FK → groups, nullable | null for knockout matches |
| round | enum | GROUP_1, GROUP_2, GROUP_3, R32, R16, QF, SF, THIRD_PLACE, FINAL |
| kickoff_time | timestamptz | |
| home_score | int, nullable | null until result entered |
| away_score | int, nullable | null until result entered |
| went_to_et | bool, nullable | |
| went_to_pens | bool, nullable | |
| status | enum | SCHEDULED, LIVE, FINISHED |
| slot_description | varchar, nullable | e.g. "Winner Group A vs Runner-up Group B" |
| external_id | varchar, nullable | football-data.org match ID |

*All 72 group stage matches and all 32 knockout slots are seeded upfront. Knockout slots have null team IDs and a `slot_description` until the bracket is set.*

### `match_predictions`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| user_id | FK → users | |
| match_id | FK → matches | |
| home_score | int | |
| away_score | int | |
| predicts_et | bool, nullable | knockout matches only |
| predicts_pens | bool, nullable | knockout matches only |
| points_awarded | int, nullable | set when result is entered |
| updated_at | timestamptz | |
| | UNIQUE(user_id, match_id) | safe upserts |

### `group_standing_predictions`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| user_id | FK → users | |
| group_id | FK → groups | |
| position | int | 1–4 |
| team_id | FK → teams | |
| points_awarded | int, nullable | set after group stage ends |
| updated_at | timestamptz | |
| | UNIQUE(user_id, group_id, position) | |

### `bonus_predictions`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| user_id | FK → users, unique | one row per user |
| champion_team_id | FK → teams | |
| runner_up_team_id | FK → teams | |
| top_scorer_name | varchar | free text |
| dark_horse_team_id | FK → teams | validated pot 3/4 server-side |
| champion_pts | int, nullable | awarded after Final |
| runner_up_pts | int, nullable | awarded after Final |
| top_scorer_pts | int, nullable | awarded manually by admin |
| dark_horse_pts | int, nullable | updated after each KO round |
| updated_at | timestamptz | |

*Leaderboard computed via SUM of `points_awarded` across all prediction tables — no cache table needed for a ~30-person group.*

---

## Result Sync

### Auto (primary)
- Railway Cron calls `POST /api/admin/sync-results` every 15 minutes on active match days
- Endpoint fetches finished matches from football-data.org, updates scores + status
- Triggers `calculateAndStorePoints(matchId)` for each newly finished match
- After a group's last GROUP_3 match finishes: triggers `calculateGroupStandingPoints(groupId)`
- After each KO round completes: updates `dark_horse_pts` for all bonus predictions

### Manual (fallback)
- Admin enters/overrides score at `/admin/results`
- Calls the same `calculateAndStorePoints(matchId)` — identical code path to auto-sync

---

## Pages

### User-facing (session required)
| Route | Description |
|---|---|
| `/leaderboard` | Ranked table: player, group pts, KO pts, bonus pts, total. Highlights current user. |
| `/predictions` | Group stage match predictions, tabbed by matchday. Score inputs per match, lock countdown, points display after result. |
| `/predictions/clasament-grupe` | Group standings predictions — dropdown selectors for 1st–4th per group. |
| `/predictions/bonus` | Bonus predictions form: champion, runner-up, top scorer, dark horse (Pot 3/4 dropdown). |
| `/meciuri` | All matches with results, organized by round. |

### Admin only
| Route | Description |
|---|---|
| `/admin/rezultate` | List of matches; enter/override home score, away score, ET/pens flags. Triggers point recalculation. |
| `/admin/utilizatori` | User list with is_admin toggle; manual password reset. |
| `/admin/cod-invitatie` | View current invite code, generate new, toggle active. |

### Unauthenticated
| Route | Description |
|---|---|
| `/login` | Username + password form. |
| `/register` | Invite code + username + password. |

---

## UI/UX

- **Language**: Romanian throughout
- **Navigation**: Bottom tab bar (mobile-first) with 4 tabs: Clasament · Pronosticuri · Meciuri · Profil
- **Theme**: Dark mode, deep navy/slate background with green accent (football pitch feel)
- **Match cards**: Show teams with flag emoji, score input fields, lock countdown, points awarded post-result
- **Group standings**: Dropdown selectors per position per group (12 groups, paginated or scrollable)
- **Leaderboard**: Sortable table, current user highlighted, point breakdown visible

---

## Deployment

- GitHub repo: `AndreiCautisanu/world-cup-predictions`
- Auto-deploy on push to `main` via Railway
- Railway project: `appealing-creativity` — services: `main-node` (Next.js) + `Postgres`
- Custom domain: `cupamondiala.andrei42.com`
- Env vars required: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `FOOTBALL_DATA_API_KEY`, `CRON_SECRET` (Railway cron sends `Authorization: Bearer ${CRON_SECRET}`; the sync endpoint validates this header before executing)
- App must listen on `process.env.PORT || 3000`
