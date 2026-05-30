import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema, registerUser } from "@/lib/registration";

// Open registration: no invite code, no rate limit. Private friend group;
// the owner manually prunes any unrecognized accounts.
export async function POST(req: Request) {
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
