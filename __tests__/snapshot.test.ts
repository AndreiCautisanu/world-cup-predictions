import { buildSnapshot } from "@/lib/snapshot";

function makePrisma(adminAuditLog: unknown[]) {
  return {
    user: { findMany: jest.fn().mockResolvedValue([{ id: 1, email: "a@example.com" }]) },
    matchPrediction: { findMany: jest.fn().mockResolvedValue([{ id: 10, userId: 1 }]) },
    groupStandingPrediction: { findMany: jest.fn().mockResolvedValue([]) },
    bonusPrediction: { findMany: jest.fn().mockResolvedValue([]) },
    inviteCode: { findMany: jest.fn().mockResolvedValue([]) },
    adminAuditLog: { findMany: jest.fn().mockResolvedValue(adminAuditLog) },
  } as never;
}

describe("buildSnapshot", () => {
  it("does not change dataHash when only snapshot.push audit rows are added", async () => {
    const baseAuditLog = [
      { id: 1, actor: "andrei", action: "score.update", payload: { matchId: 1 } },
    ];
    const snapshotPushAuditLog = [
      ...baseAuditLog,
      { id: 2, actor: "<cron>", action: "snapshot.push", payload: { commitSha: "abc123" } },
    ];

    const beforePush = await buildSnapshot(makePrisma(baseAuditLog));
    const afterPush = await buildSnapshot(makePrisma(snapshotPushAuditLog));

    expect(afterPush.adminAuditLog).toHaveLength(2);
    expect(afterPush.counts.adminAuditLog).toBe(2);
    expect(afterPush.dataHash).toBe(beforePush.dataHash);
  });
});
