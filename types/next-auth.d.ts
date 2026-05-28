import "next-auth";
import "next-auth/jwt";

// We intentionally do NOT augment Session.user.id / .isAdmin here. NextAuth's
// upstream Session.user is `User` and User.id is `string`; declaration merging
// with `id: number` collapses to `never`. The session callback writes
// id/isAdmin onto session.user at runtime through a structural cast, and the
// canonical reader lib/session.ts#getSessionUser returns a properly typed
// object — every consumer should go through that helper.

declare module "next-auth" {
  interface User {
    isAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: number;
    isAdmin: boolean;
  }
}
