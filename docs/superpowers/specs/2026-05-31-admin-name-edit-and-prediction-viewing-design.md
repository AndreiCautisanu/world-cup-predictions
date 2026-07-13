# Admin: edit user names + view user predictions

**Date:** 2026-05-31
**Status:** Approved (design), pending spec review

## Goal

Give admins two new powers in the existing admin area:

1. **Edit a user's first and last name** — inline on the existing user row.
2. **View a user's predictions** (read-only) — on a dedicated per-user detail page,
   covering all three prediction types: match scorelines, group standings, and bonus picks.

No schema migration is required: `User.firstName` and `User.lastName` already exist
(nullable) and are collected at registration; they are simply not yet shown or
editable in admin.

## Scope

- **In scope:** name editing (inline), per-user read-only predictions detail page.
- **Out of scope:** editing predictions, per-match comparison views, bulk operations,
  deleting users.

## Approach

Extend the existing `/api/admin/users` POST endpoint with optional name fields, and add
a new server-rendered detail page. Reuses established admin patterns; no new API surface
for the (read-only) predictions view.

---

## Part 1 — Name editing

### API: `app/api/admin/users/route.ts`

Extend the existing Zod schema and handler. Current body accepts `{ userId, isAdmin?,
resetPassword? }`; add:

- `firstName?: string` — trimmed, max 50. Empty string → store `null`.
- `lastName?: string` — trimmed, max 50. Empty string → store `null`.

Changes:
- Add the two optional fields to the schema.
- Relax the existing `.refine` ("Nimic de modificat") so it passes when *any* of
  `isAdmin`, `resetPassword`, `firstName`, `lastName` is present.
- Add to the update `data` object: `firstName` / `lastName` when provided
  (mapping empty string to `null`).
- Extend the `logAdminAction` payload with `setFirstName` / `setLastName` when
  provided. Names are not secret, so log the actual values (unlike the password,
  which stays redacted).
- All existing guards (admin-only, target-exists, last-admin protection) are unchanged.

### Client: `app/admin/utilizatori/AdminUserRow.tsx`

- The `User` type gains `firstName: string | null` and `lastName: string | null`.
- Add two controlled text inputs (Prenume / Nume), pre-filled from current values,
  with a "Salvează" button. Place them alongside the existing admin toggle and
  password-reset controls, following the same layout/spacing conventions.
- Reuse the existing `call()` helper and the `Status` ("idle"|"saving"|"saved"|"error")
  pattern already in the component. On success, `router.refresh()` so the list reflects
  the new names.
- Validation: trim before sending; names are optional (a user may have neither). Max 50
  enforced via `maxLength` on the input and on the server.

### Page: `app/admin/utilizatori/page.tsx`

- Add `firstName` and `lastName` to the `select` and pass them into `AdminUserRow`.

---

## Part 2 — Predictions detail page

### Route: `app/admin/utilizatori/[id]/page.tsx`

A server component (matches every other admin page, which fetch via `prisma` and render
server-side). Protected by the existing `app/admin/layout.tsx`, which redirects
non-admins to `/clasament`. Set `export const dynamic = "force-dynamic"`.

`params.id` is parsed to an integer; if invalid or no such user, call `notFound()`.

### Data

One `prisma.user.findUnique` for the target, plus their three prediction sets:

- **`matchPredictions`** — `include: { match: { include: { homeTeam, awayTeam, group } } }`,
  ordered to group by round (use the same `Round` ordering as the public Meciuri page).
  Show "🇧🇷 Brazil 2–1 Serbia 🇷🇸" style rows; show `pointsAwarded` via the existing
  `matchPredictionTier(pointsAwarded, round)` + `MATCH_TIER_LABEL` helpers in
  `lib/match-tier.ts` ("none" tier where `pointsAwarded` is null = not yet scored).
- **`groupStandingPredictions`** — `include: { group, team }`, rendered as a 1st–4th
  ordered list per group (up to 12 groups), with `pointsAwarded` where present.
- **`bonusPrediction`** — `include: { champion, runnerUp, darkHorse }` plus
  `topScorerName`, with the per-pick points (`championPts`, `runnerUpPts`,
  `topScorerPts`, `darkHorsePts`).

### Rendering

Three sections — **Meciuri**, **Clasament grupe**, **Bonus** — each read-only, reusing
existing visual styling (cards, flag emoji, point tiers). Header shows username + full
name + a "← Înapoi" link back to `/admin/utilizatori`. Any empty section (user never
filled it in) shows a muted "Niciun pronostic" placeholder.

No mutation, no new API, no audit row — viewing is not a state change, and existing
admin pages do not audit reads.

### Entry point

Each `AdminUserRow` gets a "Vezi pronosticuri" link to `/admin/utilizatori/${id}`. The
existing prediction count on the row stays.

---

## Testing / verification

- `npx tsc --noEmit` clean.
- Manual (browser preview, logged in as admin):
  - Edit a user's first/last name inline → save → list refreshes with new name; reload
    confirms persistence.
  - Clearing a name field saves `null` (shows empty, not the literal old value).
  - "Vezi pronosticuri" opens the detail page; all three sections render with correct
    data and points; empty sections show the placeholder.
  - Invalid/nonexistent `[id]` → 404.
  - Non-admin hitting the detail URL directly → redirected by the admin layout.

## Files touched

- `app/api/admin/users/route.ts` (extend schema/handler/audit)
- `app/admin/utilizatori/AdminUserRow.tsx` (name inputs + link)
- `app/admin/utilizatori/page.tsx` (select + pass name fields)
- `app/admin/utilizatori/[id]/page.tsx` (new detail page)
- possibly a small read-only presentational helper/component for prediction rows if the
  page grows large (keep files focused).
