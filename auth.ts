import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

// 7 days instead of 30. Admin password resets cannot invalidate active JWTs
// (that would require DB sessions), so a shorter expiry caps the window where
// a leaked or compromised session is still usable.
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
        });
        if (!user) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;
        return {
          id: user.id.toString(),
          name: user.username,
          isAdmin: user.isAdmin,
        };
      },
    }),
  ],
});
