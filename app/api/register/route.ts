import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema, registerUser } from "@/lib/registration";

// No rate limit here: this is a private, invite-only friend group, and
// IP-based throttling locked out friends sharing a network (home WiFi /
// carrier NAT). The invite code is the gate that matters.
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
