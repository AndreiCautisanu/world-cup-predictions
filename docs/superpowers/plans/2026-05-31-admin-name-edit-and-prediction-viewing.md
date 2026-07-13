# Admin Name Editing + Prediction Viewing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins edit any user's first/last name inline on the users list, and view any user's full predictions (match scorelines, group standings, bonus) on a read-only per-user detail page.

**Architecture:** Extend the existing `/api/admin/users` POST endpoint with optional name fields (no schema migration — `User.firstName`/`lastName` already exist). Add name inputs + a detail-page link to the `AdminUserRow` client component. Add a new server-rendered page at `/admin/utilizatori/[id]` that fetches the three prediction sets and renders them read-only, reusing existing visual helpers.

**Tech Stack:** Next.js (App Router, server components), Prisma 7, Zod, NextAuth v5, Tailwind v4, Jest + @testing-library/react.

---

## Codebase conventions (read before starting)

- **Tests:** Jest, config in `jest.config.cjs` (jsdom, `next/jest`, `@/` → repo root). Run a single file with `npx jest <path>`. Existing tests are either pure-unit (`__tests__/*.test.ts`) or component (`__tests__/*.test.tsx` using `@testing-library/react`). **No existing test imports `prisma` or an API route handler** — do not introduce DB-backed tests. Server components are verified manually via browser preview.
- **Admin auth:** every page under `app/admin/` is gated by `app/admin/layout.tsx`, which calls `getSessionUser(await auth())` and `redirect("/clasament")` for non-admins. API routes re-check `getSessionUser(await auth())?.isAdmin` themselves.
- **Session helper:** `getSessionUser(session)` from `@/lib/session` returns `{ id: number, isAdmin: boolean, name?: string | null } | null`.
- **Audit:** `logAdminAction(prisma, actorUsername, action, payload)` from `@/lib/audit`. Best-effort, never throws. Don't log secrets (names are fine).
- **Match points → visual tier:** `matchPredictionTier(pointsAwarded, round)` + `MATCH_TIER_LABEL` from `@/lib/match-tier`. Returns `"none"` when `pointsAwarded` is null (not yet scored).
- **Romanian UI strings** throughout (e.g. "Salvează", "Niciun pronostic").
- **Commit message footer:** end every commit body with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

## File structure

- **Modify** `app/api/admin/users/route.ts` — add `firstName`/`lastName` to schema, update data, audit payload.
- **Modify** `app/admin/utilizatori/page.tsx` — select + pass `firstName`/`lastName`.
- **Modify** `app/admin/utilizatori/AdminUserRow.tsx` — name inputs + "Vezi pronosticuri" link; `User` type gains name fields.
- **Create** `app/admin/utilizatori/[id]/page.tsx` — read-only predictions detail page.
- **Create** `__tests__/admin-users-schema.test.ts` — unit test for the extended Zod schema.
- **Modify (extend)** the schema export in `route.ts` so the schema is importable by the test (see Task 1).

---

## Task 1: Extend the admin-users API schema with name fields

**Files:**
- Modify: `app/api/admin/users/route.ts`
- Test: `__tests__/admin-users-schema.test.ts` (create)

The current route defines `const schema = z.object({...})` locally and is not exported, so it can't be unit-tested. First export it, then extend it, test-first.

- [ ] **Step 1: Export the existing schema (refactor, no behavior change)**

In `app/api/admin/users/route.ts`, change the schema declaration from `const schema =` to `export const updateUserSchema =` and update its one usage in the handler (`schema.safeParse` → `updateUserSchema.safeParse`).

The current schema block to replace:

```ts
const schema = z
  .object({
    userId: z.number().int(),
    isAdmin: z.boolean().optional(),
    resetPassword: z.string().min(8).max(200).optional(),
  })
  .refine((d) => d.isAdmin !== undefined || d.resetPassword !== undefined, {
    message: "Nimic de modificat",
  });
```

- [ ] **Step 2: Write the failing test**

Create `__tests__/admin-users-schema.test.ts`:

```ts
import { updateUserSchema } from "@/app/api/admin/users/route";

describe("updateUserSchema", () => {
  it("accepts a first/last name update", () => {
    const r = updateUserSchema.safeParse({
      userId: 1,
      firstName: "Andrei",
      lastName: "Popescu",
    });
    expect(r.success).toBe(true);
  });

  it("accepts clearing a name with an empty string", () => {
    const r = updateUserSchema.safeParse({ userId: 1, firstName: "" });
    expect(r.success).toBe(true);
  });

  it("trims surrounding whitespace on names", () => {
    const r = updateUserSchema.safeParse({ userId: 1, firstName: "  Ana  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.firstName).toBe("Ana");
  });

  it("rejects names longer than 50 chars", () => {
    const r = updateUserSchema.safeParse({ userId: 1, lastName: "x".repeat(51) });
    expect(r.success).toBe(false);
  });

  it("rejects a payload with nothing to change", () => {
    const r = updateUserSchema.safeParse({ userId: 1 });
    expect(r.success).toBe(false);
  });

  it("still accepts an isAdmin-only update", () => {
    const r = updateUserSchema.safeParse({ userId: 1, isAdmin: true });
    expect(r.success).toBe(true);
  });
});
```

- [ ] **Step 3: Run the test, verify it fails**

Run: `npx jest __tests__/admin-users-schema.test.ts`
Expected: FAIL — the "first/last name update" and trim cases fail because the schema has no `firstName`/`lastName` yet; the "nothing to change" case may currently pass for the wrong reason.

- [ ] **Step 4: Extend the schema**

Replace the schema (now `export const updateUserSchema`) with:

```ts
export const updateUserSchema = z
  .object({
    userId: z.number().int(),
    isAdmin: z.boolean().optional(),
    resetPassword: z.string().min(8).max(200).optional(),
    firstName: z.string().trim().max(50, "Maxim 50 de caractere").optional(),
    lastName: z.string().trim().max(50, "Maxim 50 de caractere").optional(),
  })
  .refine(
    (d) =>
      d.isAdmin !== undefined ||
      d.resetPassword !== undefined ||
      d.firstName !== undefined ||
      d.lastName !== undefined,
    { message: "Nimic de modificat" }
  );
```

- [ ] **Step 5: Run the test, verify it passes**

Run: `npx jest __tests__/admin-users-schema.test.ts`
Expected: PASS (all 6).

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/users/route.ts __tests__/admin-users-schema.test.ts
git commit -m "$(cat <<'EOF'
admin-users API: add first/last name to update schema

Export the schema so it's unit-testable; add optional firstName/lastName
(trimmed, max 50). The "nothing to change" guard now also accepts a
name-only update.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Apply name updates in the API handler + audit them

**Files:**
- Modify: `app/api/admin/users/route.ts`

No new automated test — this handler imports `prisma`/`auth`/`bcrypt`, which the codebase does not unit-test. Verified manually in Task 5.

- [ ] **Step 1: Write the name fields into the update data**

In the handler, find this block:

```ts
  const data: { isAdmin?: boolean; passwordHash?: string } = {};
  if (parsed.data.isAdmin !== undefined) data.isAdmin = parsed.data.isAdmin;
  if (parsed.data.resetPassword) {
    data.passwordHash = await bcrypt.hash(parsed.data.resetPassword, 10);
  }
```

Replace it with (empty string → `null` so a cleared field actually clears):

```ts
  const data: {
    isAdmin?: boolean;
    passwordHash?: string;
    firstName?: string | null;
    lastName?: string | null;
  } = {};
  if (parsed.data.isAdmin !== undefined) data.isAdmin = parsed.data.isAdmin;
  if (parsed.data.resetPassword) {
    data.passwordHash = await bcrypt.hash(parsed.data.resetPassword, 10);
  }
  if (parsed.data.firstName !== undefined) {
    data.firstName = parsed.data.firstName === "" ? null : parsed.data.firstName;
  }
  if (parsed.data.lastName !== undefined) {
    data.lastName = parsed.data.lastName === "" ? null : parsed.data.lastName;
  }
```

- [ ] **Step 2: Add the names to the audit payload**

Find the existing audit call:

```ts
  await logAdminAction(prisma, user.name ?? "<unknown>", "user.update", {
    targetUserId: target.id,
    targetUsername: target.username,
    setIsAdmin: parsed.data.isAdmin,
    passwordReset: parsed.data.resetPassword !== undefined,
  });
```

Replace with (names are not secret, log the values):

```ts
  await logAdminAction(prisma, user.name ?? "<unknown>", "user.update", {
    targetUserId: target.id,
    targetUsername: target.username,
    setIsAdmin: parsed.data.isAdmin,
    passwordReset: parsed.data.resetPassword !== undefined,
    setFirstName: parsed.data.firstName,
    setLastName: parsed.data.lastName,
  });
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/users/route.ts
git commit -m "$(cat <<'EOF'
admin-users API: persist + audit name changes

Map cleared (empty-string) names to null on update; log the new name
values in the audit payload.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Add name inputs + detail link to AdminUserRow

**Files:**
- Modify: `app/admin/utilizatori/AdminUserRow.tsx`
- Test: `__tests__/AdminUserRow.test.tsx` (create)

`AdminUserRow` is a client component (`"use client"`) and is component-testable. Note: it imports `next/navigation`'s `useRouter`; the test mocks it (matches how client components are tested here).

- [ ] **Step 1: Write the failing component test**

Create `__tests__/AdminUserRow.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { AdminUserRow } from "@/app/admin/utilizatori/AdminUserRow";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

const baseUser = {
  id: 7,
  username: "andrei_p",
  isAdmin: false,
  createdAt: new Date("2026-01-01").toISOString(),
  predictionCount: 12,
  firstName: "Andrei",
  lastName: "Popescu",
};

describe("AdminUserRow", () => {
  it("pre-fills the first and last name inputs", () => {
    render(<AdminUserRow user={baseUser} />);
    expect(screen.getByDisplayValue("Andrei")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Popescu")).toBeInTheDocument();
  });

  it("renders empty name inputs when names are null", () => {
    render(
      <AdminUserRow user={{ ...baseUser, firstName: null, lastName: null }} />
    );
    expect(screen.getByPlaceholderText("Prenume")).toHaveValue("");
    expect(screen.getByPlaceholderText("Nume")).toHaveValue("");
  });

  it("links to the user's predictions detail page", () => {
    render(<AdminUserRow user={baseUser} />);
    const link = screen.getByRole("link", { name: /pronosticuri/i });
    expect(link).toHaveAttribute("href", "/admin/utilizatori/7");
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx jest __tests__/AdminUserRow.test.tsx`
Expected: FAIL — `firstName`/`lastName` not on the `User` type, no name inputs, no link.

- [ ] **Step 3: Extend the `User` type**

In `AdminUserRow.tsx`, change the type:

```tsx
type User = {
  id: number;
  username: string;
  isAdmin: boolean;
  createdAt: string;
  predictionCount: number;
  firstName: string | null;
  lastName: string | null;
};
```

- [ ] **Step 4: Add name state + a save handler**

Add `Link` to the imports at the top:

```tsx
import Link from "next/link";
```

Inside the component, after the existing `const [error, setError] = useState<string | null>(null);` line, add:

```tsx
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [nameStatus, setNameStatus] = useState<Status>("idle");

  async function saveName() {
    setNameStatus("saving");
    setError(null);
    try {
      await call({ firstName: firstName.trim(), lastName: lastName.trim() });
      setNameStatus("saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare");
      setNameStatus("error");
    }
  }
```

Then widen the `call` helper's payload type so it accepts names. Change:

```tsx
  async function call(payload: { isAdmin?: boolean; resetPassword?: string }) {
```

to:

```tsx
  async function call(payload: {
    isAdmin?: boolean;
    resetPassword?: string;
    firstName?: string;
    lastName?: string;
  }) {
```

- [ ] **Step 5: Render the name inputs + detail link**

In the JSX, the header row currently shows username + a joined/count span:

```tsx
        <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
          {JOINED_FORMATTER.format(new Date(user.createdAt))} · {user.predictionCount} pronosticuri
        </span>
```

Replace that `<span>` with the span plus a link:

```tsx
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
            {JOINED_FORMATTER.format(new Date(user.createdAt))} · {user.predictionCount} pronosticuri
          </span>
          <Link
            href={`/admin/utilizatori/${user.id}`}
            className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300 transition hover:border-rose-500/40 hover:text-rose-100"
          >
            Vezi pronosticuri
          </Link>
        </div>
```

Then, immediately after the closing `</div>` of the controls row (the `<div className="mt-3 flex flex-wrap items-center gap-3">…</div>` that holds the admin checkbox + password reset), add a name-editing row:

```tsx
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Prenume"
          value={firstName}
          maxLength={50}
          onChange={(e) => setFirstName(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-rose-400/60 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Nume"
          value={lastName}
          maxLength={50}
          onChange={(e) => setLastName(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-rose-400/60 focus:outline-none"
        />
        <button
          type="button"
          onClick={saveName}
          disabled={nameStatus === "saving"}
          className="rounded-full bg-rose-500 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-rose-50 transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {nameStatus === "saving" ? "…" : nameStatus === "saved" ? "Salvat ✓" : "Salvează"}
        </button>
      </div>
```

- [ ] **Step 6: Run the test, verify it passes**

Run: `npx jest __tests__/AdminUserRow.test.tsx`
Expected: PASS (all 3).

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0. (Will still error on `page.tsx` not passing the new required `firstName`/`lastName` props — that's fixed in Task 4. If so, proceed to Task 4 before relying on a clean tsc.)

- [ ] **Step 8: Commit**

```bash
git add app/admin/utilizatori/AdminUserRow.tsx __tests__/AdminUserRow.test.tsx
git commit -m "$(cat <<'EOF'
admin user row: inline name editing + predictions link

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Pass name fields from the users list page

**Files:**
- Modify: `app/admin/utilizatori/page.tsx`

- [ ] **Step 1: Select the name fields**

In the `prisma.user.findMany` `select`, add `firstName` and `lastName`. The current select:

```tsx
    select: {
      id: true,
      username: true,
      isAdmin: true,
      createdAt: true,
      _count: {
        select: {
          matchPredictions: true,
        },
      },
    },
```

becomes:

```tsx
    select: {
      id: true,
      username: true,
      isAdmin: true,
      createdAt: true,
      firstName: true,
      lastName: true,
      _count: {
        select: {
          matchPredictions: true,
        },
      },
    },
```

- [ ] **Step 2: Pass them into AdminUserRow**

The current `user` prop object:

```tsx
            user={{
              id: u.id,
              username: u.username,
              isAdmin: u.isAdmin,
              createdAt: u.createdAt.toISOString(),
              predictionCount: u._count.matchPredictions,
            }}
```

becomes:

```tsx
            user={{
              id: u.id,
              username: u.username,
              isAdmin: u.isAdmin,
              createdAt: u.createdAt.toISOString(),
              predictionCount: u._count.matchPredictions,
              firstName: u.firstName,
              lastName: u.lastName,
            }}
```

- [ ] **Step 3: Type-check + run the full suite**

Run: `npx tsc --noEmit`
Expected: exit 0, no output.

Run: `npx jest __tests__/admin-users-schema.test.ts __tests__/AdminUserRow.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/admin/utilizatori/page.tsx
git commit -m "$(cat <<'EOF'
admin users list: select + pass first/last name

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Build the read-only predictions detail page

**Files:**
- Create: `app/admin/utilizatori/[id]/page.tsx`

Server component, no automated test (consistent with other server pages here) — verified via browser preview in Step 4. The admin layout already blocks non-admins, so no per-page auth check is required, but parse the id defensively.

- [ ] **Step 1: Create the page**

Create `app/admin/utilizatori/[id]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { matchPredictionTier, MATCH_TIER_LABEL } from "@/lib/match-tier";

export const dynamic = "force-dynamic";

// Group-stage rounds first, then knockout, matching the public Meciuri order.
const ROUND_ORDER = [
  "GROUP_1", "GROUP_2", "GROUP_3", "R32", "R16", "QF", "SF", "THIRD_PLACE", "FINAL",
] as const;

const ROUND_LABEL: Record<string, string> = {
  GROUP_1: "Etapa 1", GROUP_2: "Etapa 2", GROUP_3: "Etapa 3",
  R32: "Șaisprezecimi", R16: "Optimi", QF: "Sferturi",
  SF: "Semifinale", THIRD_PLACE: "Locul 3", FINAL: "Finala",
};

export default async function AdminUserDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) notFound();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      matchPredictions: {
        include: {
          match: { include: { homeTeam: true, awayTeam: true, group: true } },
        },
      },
      groupStandingPredictions: {
        include: { group: true, team: true },
        orderBy: [{ groupId: "asc" }, { position: "asc" }],
      },
      bonusPrediction: {
        include: { champion: true, runnerUp: true, darkHorse: true },
      },
    },
  });
  if (!user) notFound();

  // Sort match predictions by round order, then kickoff time.
  const matchPreds = [...user.matchPredictions].sort((a, b) => {
    const ra = ROUND_ORDER.indexOf(a.match.round as (typeof ROUND_ORDER)[number]);
    const rb = ROUND_ORDER.indexOf(b.match.round as (typeof ROUND_ORDER)[number]);
    if (ra !== rb) return ra - rb;
    return a.match.kickoffTime.getTime() - b.match.kickoffTime.getTime();
  });

  // Group standings bucketed by group name.
  const standingsByGroup = new Map<string, typeof user.groupStandingPredictions>();
  for (const p of user.groupStandingPredictions) {
    const key = p.group.name;
    const arr = standingsByGroup.get(key) ?? [];
    arr.push(p);
    standingsByGroup.set(key, arr);
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const bonus = user.bonusPrediction;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <Link
          href="/admin/utilizatori"
          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 transition hover:text-slate-200"
        >
          ← Înapoi
        </Link>
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-rose-300/80">
          Admin · Pronosticuri
        </p>
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-slate-50 sm:text-4xl">
          {user.username}
        </h1>
        {fullName && <p className="text-sm text-slate-400">{fullName}</p>}
      </section>

      {/* Match predictions */}
      <section className="space-y-3">
        <h2 className="font-display text-xs font-bold uppercase tracking-[0.32em] text-slate-300">
          Meciuri
        </h2>
        {matchPreds.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-4 text-sm text-slate-500">
            Niciun pronostic
          </p>
        ) : (
          <ul className="space-y-2">
            {matchPreds.map((p) => {
              const tier = matchPredictionTier(p.pointsAwarded, p.match.round);
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/40 px-4 py-2"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {ROUND_LABEL[p.match.round] ?? p.match.round}
                  </span>
                  <span className="flex-1 text-center text-sm text-slate-100">
                    {p.match.homeTeam?.flagEmoji ?? "🏳️"} {p.match.homeTeam?.name ?? "—"}{" "}
                    <strong className="tabular-nums">{p.homeScore}–{p.awayScore}</strong>{" "}
                    {p.match.awayTeam?.name ?? "—"} {p.match.awayTeam?.flagEmoji ?? "🏳️"}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {p.pointsAwarded == null
                      ? MATCH_TIER_LABEL[tier]
                      : `${p.pointsAwarded} pct · ${MATCH_TIER_LABEL[tier]}`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Group standings */}
      <section className="space-y-3">
        <h2 className="font-display text-xs font-bold uppercase tracking-[0.32em] text-slate-300">
          Clasament grupe
        </h2>
        {standingsByGroup.size === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-4 text-sm text-slate-500">
            Niciun pronostic
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {[...standingsByGroup.entries()].map(([groupName, rows]) => (
              <div
                key={groupName}
                className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3"
              >
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Grupa {groupName}
                </p>
                <ol className="space-y-1">
                  {rows
                    .sort((a, b) => a.position - b.position)
                    .map((r) => (
                      <li key={r.id} className="flex items-center gap-2 text-sm text-slate-100">
                        <span className="w-4 text-slate-500">{r.position}.</span>
                        <span>{r.team.flagEmoji} {r.team.name}</span>
                        {r.pointsAwarded != null && (
                          <span className="ml-auto text-[10px] uppercase tracking-[0.18em] text-slate-500">
                            {r.pointsAwarded} pct
                          </span>
                        )}
                      </li>
                    ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bonus */}
      <section className="space-y-3">
        <h2 className="font-display text-xs font-bold uppercase tracking-[0.32em] text-slate-300">
          Bonus
        </h2>
        {!bonus ? (
          <p className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-4 text-sm text-slate-500">
            Niciun pronostic
          </p>
        ) : (
          <ul className="space-y-2">
            {[
              { label: "Campioană", value: `${bonus.champion.flagEmoji} ${bonus.champion.name}`, pts: bonus.championPts },
              { label: "Finalistă", value: `${bonus.runnerUp.flagEmoji} ${bonus.runnerUp.name}`, pts: bonus.runnerUpPts },
              { label: "Golgheter", value: bonus.topScorerName, pts: bonus.topScorerPts },
              { label: "Surpriză", value: `${bonus.darkHorse.flagEmoji} ${bonus.darkHorse.name}`, pts: bonus.darkHorsePts },
            ].map((b) => (
              <li
                key={b.label}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/40 px-4 py-2"
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {b.label}
                </span>
                <span className="flex-1 text-center text-sm text-slate-100">{b.value}</span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {b.pts == null ? "—" : `${b.pts} pct`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0, no output. (If `p.match.round` indexing errors, confirm the `as (typeof ROUND_ORDER)[number]` cast is present.)

- [ ] **Step 3: Lint**

Run: `npx eslint app/admin/utilizatori/[id]/page.tsx`
Expected: no errors.

- [ ] **Step 4: Manual browser verification**

Start the preview (or `npm run dev`), log in as an admin, then:
1. Go to `/admin/utilizatori`. Confirm each row shows Prenume/Nume inputs pre-filled, a "Salvează" button, and a "Vezi pronosticuri" link.
2. Edit a name, click Salvează → button shows "Salvat ✓"; reload the page → the new name persists.
3. Clear a name field, Salvează, reload → the field is empty (stored null), not the old value.
4. Click "Vezi pronosticuri" → detail page loads with three sections (Meciuri, Clasament grupe, Bonus). For a user with predictions, rows render with teams, scores, and points; for a user without, each empty section shows "Niciun pronostic".
5. Visit `/admin/utilizatori/999999` (nonexistent) → 404 page.
6. Visit `/admin/utilizatori/abc` (non-numeric) → 404 page.

- [ ] **Step 5: Commit**

```bash
git add "app/admin/utilizatori/[id]/page.tsx"
git commit -m "$(cat <<'EOF'
admin: read-only per-user predictions detail page

New /admin/utilizatori/[id] showing a user's match, group-standing, and
bonus predictions with awarded points; empty sections show a placeholder.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Full verification + push

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx jest`
Expected: all suites pass (including the two new ones).

- [ ] **Step 2: Type-check + lint the whole project**

Run: `npx tsc --noEmit && npx eslint .`
Expected: exit 0.

- [ ] **Step 3: Push and let Railway deploy**

```bash
git push origin master
```

Then watch the Railway deploy reach SUCCESS for the latest commit (the `main-node` service auto-deploys on push to `master`), and spot-check the live admin users page + a detail page.

---

## Self-review notes

- **Spec coverage:** name editing (Tasks 1–4) ✓; per-user read-only predictions across all three types (Task 5) ✓; inline name UX + separate detail page (Tasks 3, 5) ✓; no migration (uses existing fields) ✓; audit for name change, no audit for viewing (Tasks 2, 5) ✓.
- **Type consistency:** `updateUserSchema` exported in Task 1, imported in Task 1's test; `User` type name fields added in Task 3, supplied in Task 4; `matchPredictionTier`/`MATCH_TIER_LABEL` used per their real signatures.
- **Test realism:** only schema + client-component tests (the codebase's actual patterns); the prisma-backed handler and server page are verified manually, matching the existing zero-DB-test convention.
