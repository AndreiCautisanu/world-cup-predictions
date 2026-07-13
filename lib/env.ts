/**
 * Boot-time environment assertion.
 *
 * NextAuth v5 (beta) reads the session secret from `AUTH_SECRET`. The legacy
 * `NEXTAUTH_SECRET` name from v4 is silently ignored — middleware then no-ops
 * and every request passes through unauthenticated, which is the worst kind of
 * silent failure for an auth system.
 *
 * Importing this module from auth.config.ts (used by middleware) and auth.ts
 * (used by every server component) guarantees the boot crashes loudly with a
 * useful message instead of leaving auth quietly broken.
 *
 * Accepts NEXTAUTH_SECRET as a fallback so existing Railway envs keep working
 * after rename — but the next deploy that reads this module will copy it into
 * AUTH_SECRET in-process so NextAuth itself sees the right name.
 */
function resolveAuthSecret(): string {
  const explicit = process.env.AUTH_SECRET;
  if (explicit && explicit.length >= 16) return explicit;

  const legacy = process.env.NEXTAUTH_SECRET;
  if (legacy && legacy.length >= 16) {
    // Forward the legacy value into the canonical name so NextAuth picks it up.
    process.env.AUTH_SECRET = legacy;
    return legacy;
  }

  throw new Error(
    "AUTH_SECRET is not set (or shorter than 16 chars). NextAuth v5 reads this " +
      "variable to sign session JWTs; without it, middleware passes every " +
      "request through unauthenticated. Generate one with `openssl rand -base64 32` " +
      "and set AUTH_SECRET in the deploy environment."
  );
}

export const AUTH_SECRET = resolveAuthSecret();
