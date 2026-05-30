import type { PrismaClient } from "@prisma/client";

/**
 * Pull all human-generated state out of the DB. Match/Group/Team rows are
 * deliberately excluded — those are recreatable from prisma/data/*.ts via
 * `npm run db:bootstrap`. The audit log is included so a restore retains
 * the history of admin actions.
 */
export type Snapshot = {
  timestamp: string;
  counts: Record<string, number>;
  users: unknown[];
  matchPredictions: unknown[];
  groupStandingPredictions: unknown[];
  bonusPrediction: unknown[];
  inviteCodes: unknown[];
  adminAuditLog: unknown[];
};

export async function buildSnapshot(prisma: PrismaClient): Promise<Snapshot> {
  const [users, matchPredictions, groupStandingPredictions, bonusPrediction, inviteCodes, adminAuditLog] =
    await Promise.all([
      prisma.user.findMany({ orderBy: { id: "asc" } }),
      prisma.matchPrediction.findMany({ orderBy: { id: "asc" } }),
      prisma.groupStandingPrediction.findMany({ orderBy: { id: "asc" } }),
      prisma.bonusPrediction.findMany({ orderBy: { id: "asc" } }),
      prisma.inviteCode.findMany({ orderBy: { id: "asc" } }),
      prisma.adminAuditLog.findMany({ orderBy: { id: "asc" } }),
    ]);

  return {
    timestamp: new Date().toISOString(),
    counts: {
      users: users.length,
      matchPredictions: matchPredictions.length,
      groupStandingPredictions: groupStandingPredictions.length,
      bonusPrediction: bonusPrediction.length,
      inviteCodes: inviteCodes.length,
      adminAuditLog: adminAuditLog.length,
    },
    users,
    matchPredictions,
    groupStandingPredictions,
    bonusPrediction,
    inviteCodes,
    adminAuditLog,
  };
}

/**
 * PUT a JSON snapshot to a file in a GitHub repo using the Contents API.
 * Uses the existing file's SHA (if any) to overwrite — so the path stays
 * stable and the commit history of that file IS the backup history.
 *
 * Env vars:
 *   BACKUP_GITHUB_REPO   — "owner/repo" (private repo recommended; password
 *                          hashes + emails go in here)
 *   BACKUP_GITHUB_TOKEN  — fine-grained PAT with contents:write on that repo
 *   BACKUP_GITHUB_BRANCH — optional, default "main"
 *   BACKUP_GITHUB_PATH   — optional, default "snapshot.json"
 */
export async function pushSnapshotToGithub(json: string, counts: Record<string, number>): Promise<{
  ok: true;
  commitSha: string;
} | { ok: false; error: string }> {
  const repo = process.env.BACKUP_GITHUB_REPO;
  const token = process.env.BACKUP_GITHUB_TOKEN;
  const branch = process.env.BACKUP_GITHUB_BRANCH ?? "main";
  const path = process.env.BACKUP_GITHUB_PATH ?? "snapshot.json";

  if (!repo || !token) {
    return { ok: false, error: "BACKUP_GITHUB_REPO or BACKUP_GITHUB_TOKEN not set" };
  }

  // GitHub's Contents API requires the current file's SHA to overwrite.
  // Fetch it first; treat 404 as "no existing file" (first push).
  const getRes = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
  let sha: string | undefined;
  if (getRes.ok) {
    const existing = (await getRes.json()) as { sha?: string };
    sha = existing.sha;
  } else if (getRes.status !== 404) {
    return { ok: false, error: `GitHub GET ${getRes.status}: ${await getRes.text()}` };
  }

  const userCount = counts.users ?? 0;
  const predCount = counts.matchPredictions ?? 0;
  const putRes = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `snapshot · ${userCount} users · ${predCount} match-preds · ${new Date().toISOString()}`,
        content: Buffer.from(json).toString("base64"),
        branch,
        ...(sha ? { sha } : {}),
      }),
    }
  );

  if (!putRes.ok) {
    return { ok: false, error: `GitHub PUT ${putRes.status}: ${await putRes.text()}` };
  }
  const body = (await putRes.json()) as { commit?: { sha?: string } };
  return { ok: true, commitSha: body.commit?.sha ?? "<unknown>" };
}
