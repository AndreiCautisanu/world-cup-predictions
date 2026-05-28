import type { NextAuthConfig } from "next-auth";
import { AUTH_SECRET } from "@/lib/env";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  secret: AUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth }) {
      // Used by middleware — just check if session exists.
      return !!auth;
    },
    jwt({ token, user }) {
      // Runs on sign-in; persists id + isAdmin into the JWT.
      if (user) {
        token.id = Number(user.id);
        token.isAdmin = user.isAdmin ?? false;
      }
      return token;
    },
    session({ session, token }) {
      // Runs whenever a server component or middleware reads the session.
      // NextAuth's Session.user.id is upstream-typed `string` so we cast through
      // a structural shape that matches our augmentation; lib/session.ts is the
      // canonical reader on the other side.
      if (token) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = session.user as any;
        u.id = token.id;
        u.isAdmin = token.isAdmin;
      }
      return session;
    },
  },
};
