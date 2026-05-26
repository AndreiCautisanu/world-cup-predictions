import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth }) {
      // Used by middleware — just check if session exists
      return !!auth;
    },
    jwt({ token, user }) {
      // Runs on sign-in; persists id + isAdmin into the JWT
      if (user) {
        token.id = Number(user.id);
        token.isAdmin = (user as any).isAdmin ?? false;
      }
      return token;
    },
    session({ session, token }) {
      // Runs when middleware reads req.auth — copy token fields onto session.user
      if (token) {
        (session.user as any).id = token.id;
        (session.user as any).isAdmin = token.isAdmin;
      }
      return session;
    },
  },
};
