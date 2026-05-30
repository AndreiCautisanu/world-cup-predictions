import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { buildSnapshot, pushSnapshotToGithub } from "@/lib/snapshot";
import { logAdminAction } from "@/lib/audit";

function constantTimeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  const ab = Buffer.alloc(len);
  const bb = Buffer.alloc(len);
  ab.write(a);
  bb.write(b);
  return timingSafeEqual(ab, bb) && a.length === b.length;
}

/**
 * GET — admin-session-protected JSON download (manual backup).
 * POST — cron-protected: rebuild snapshot AND push to GitHub.
 *
 * Both produce the same payload; POST also commits to BACKUP_GITHUB_REPO if
 * configured. Two methods so the same URL can be hit by Railway cron with
 * a Bearer secret (POST) or by you in a browser tab (GET).
 */

export async function GET() {
  const user = getSessionUser(await auth());
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const snapshot = await buildSnapshot(prisma);
  const json = JSON.stringify(snapshot, null, 2);

  await logAdminAction(prisma, user.name ?? "<unknown>", "snapshot.download", {
    counts: snapshot.counts,
  });

  const today = snapshot.timestamp.split("T")[0];
  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="cupamondiala-snapshot-${today}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (!constantTimeEqual(authHeader, `Bearer ${expected}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await buildSnapshot(prisma);
  const json = JSON.stringify(snapshot, null, 2);
  const push = await pushSnapshotToGithub(json, snapshot.counts);

  if (!push.ok) {
    // Don't fail the cron — log the error and return 200 so the cron doesn't
    // retry/spam. The snapshot was built; the off-Railway push didn't land.
    console.error("[snapshot] github push failed:", push.error);
    return NextResponse.json(
      { ok: false, counts: snapshot.counts, error: push.error },
      { status: 200 }
    );
  }

  await logAdminAction(prisma, "<cron>", "snapshot.push", {
    counts: snapshot.counts,
    commitSha: push.commitSha,
  });

  return NextResponse.json({
    ok: true,
    counts: snapshot.counts,
    commitSha: push.commitSha,
    timestamp: snapshot.timestamp,
  });
}
