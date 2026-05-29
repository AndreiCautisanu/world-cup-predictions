import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { registerSchema, registerUser } from "@/lib/registration";

// 5 attempts per IP per 10 minutes — invite-only flow doesn't need higher.
const REGISTER_LIMIT = 5;
const REGISTER_WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = rateLimit(`register:${ip}`, REGISTER_LIMIT, REGISTER_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Prea multe încercări. Revino mai târziu." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Date invalide" },
      { status: 400 }
    );
  }

  const result = await registerUser(prisma, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
