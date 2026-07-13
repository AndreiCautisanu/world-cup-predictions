import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Append-only audit log of admin actions. Best-effort: a logging failure
 * never blocks the underlying action — losing an audit row is acceptable
 * when the alternative is losing a result entry.
 *
 * `payload` is serialized to JSONB. Don't include passwords or other
 * unredacted secrets — pass a redacted shape (e.g. {userId, action:
 * "password-reset"} instead of {newPassword: "..."}).
 */
export async function logAdminAction(
  prisma: PrismaClient,
  actorUsername: string,
  action: string,
  payload: Prisma.InputJsonValue
): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: { actorUsername, action, payload },
    });
  } catch (e) {
    console.error("[audit] failed to write log row:", e);
  }
}
