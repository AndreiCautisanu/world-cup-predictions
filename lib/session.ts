import type { Session } from "next-auth";

/**
 * Single point of truth for reading our extra session fields. NextAuth's
 * upstream `Session.user.id` is typed `string`, which collides with our
 * `id: number` augmentation under declaration merging — TS narrows the
 * collision to `never`. Keeping the cast inside this helper lets the rest of
 * the codebase consume `getSessionUser(session)` with proper types.
 *
 * At runtime the JWT callback writes `token.id = Number(user.id)` and the
 * session callback copies it back, so the cast is safe.
 */
export type SessionUser = {
  id: number;
  isAdmin: boolean;
  name?: string | null;
};

export function getSessionUser(session: Session | null): SessionUser | null {
  if (!session?.user) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = session.user as any;
  if (typeof u.id !== "number") return null;
  return {
    id: u.id,
    isAdmin: Boolean(u.isAdmin),
    name: u.name ?? null,
  };
}
