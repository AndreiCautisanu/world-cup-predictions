"use server";

import { headers } from "next/headers";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { registerSchema, registerUser } from "@/lib/registration";

const REGISTER_LIMIT = 5;
const REGISTER_WINDOW_MS = 10 * 60 * 1000;

export type RegisterFormState = {
  error?: string;
  // Echo back the values so the form doesn't blank on error.
  values?: {
    inviteCode?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
  };
};

function ipFromHeaders(h: Headers): string {
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

// NextAuth v5 throws a redirect via Next's internals (`digest` starts with
// `NEXT_REDIRECT`). Must be re-thrown so the framework can act on it; any
// other thrown thing is a real error and gets surfaced to the form.
function isNextRedirect(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    typeof (e as { digest: unknown }).digest === "string" &&
    (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export async function registerAction(
  _prev: RegisterFormState,
  formData: FormData
): Promise<RegisterFormState> {
  const values = {
    inviteCode: String(formData.get("inviteCode") ?? ""),
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    username: String(formData.get("username") ?? ""),
  };

  const h = await headers();
  const ip = ipFromHeaders(h);
  const limit = rateLimit(`register:${ip}`, REGISTER_LIMIT, REGISTER_WINDOW_MS);
  if (!limit.ok) {
    return { error: "Prea multe încercări. Revino mai târziu.", values };
  }

  const parsed = registerSchema.safeParse({
    ...values,
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Date invalide",
      values,
    };
  }

  const result = await registerUser(prisma, parsed.data);
  if (!result.ok) {
    return { error: result.error, values };
  }

  // signIn sets the session cookie on the response AND throws a NEXT_REDIRECT
  // to /clasament — atomic, server-side, no client-side handshake to race.
  try {
    await signIn("credentials", {
      username: parsed.data.username,
      password: parsed.data.password,
      redirectTo: "/clasament",
    });
  } catch (e: unknown) {
    if (isNextRedirect(e)) throw e;
    // Account is already created — tell the user they can log in manually.
    return {
      error:
        "Cont creat, dar autentificarea automată a eșuat. Loghează-te manual.",
      values,
    };
  }

  // Unreachable — signIn throws the redirect above. TS needs the return.
  return {};
}
