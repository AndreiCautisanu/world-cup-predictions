/**
 * Disaster-recovery restore from a snapshot JSON dump produced by
 * /api/admin/snapshot.
 *
 *   railway run --service Postgres npx tsx scripts/_restore-snapshot.ts \
 *     ./snapshot.json
 *
 * What it does:
 *   1. DELETES all rows from the user-data tables (User cascades to all
 *      prediction tables, plus an explicit pass on the audit + invite-code
 *      tables for completeness).
 *   2. Re-inserts each row from JSON with the original `id` preserved so
 *      foreign keys still resolve.
 *   3. Bumps each Postgres sequence past the max restored id so future
 *      inserts don't collide.
 *
 * It does NOT touch Match/Team/Group/MatchStatus/Round — those come from
 * the bootstrap data files; run `npm run db:bootstrap` first if the DB is
 * empty.
 *
 * Pass --dry to print what would change without writing.
 */

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("no db url");
const adapter = new PrismaPg({ connectionString: url });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

const TABLES_WITH_SEQUENCES = [
  { table: "User", sequence: "User_id_seq" },
  { table: "InviteCode", sequence: "InviteCode_id_seq" },
  { table: "MatchPrediction", sequence: "MatchPrediction_id_seq" },
  { table: "GroupStandingPrediction", sequence: "GroupStandingPrediction_id_seq" },
  { table: "BonusPrediction", sequence: "BonusPrediction_id_seq" },
  { table: "AdminAuditLog", sequence: "AdminAuditLog_id_seq" },
];

(async () => {
  const file = process.argv[2];
  const dry = process.argv.includes("--dry");
  if (!file) {
    console.error("usage: tsx scripts/_restore-snapshot.ts <snapshot.json> [--dry]");
    process.exit(2);
  }
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) {
    console.error(`file not found: ${abs}`);
    process.exit(1);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const snap = JSON.parse(fs.readFileSync(abs, "utf8")) as Record<string, any>;
  console.log(`→ snapshot from ${snap.timestamp}`);
  console.log(`  counts: ${JSON.stringify(snap.counts)}`);

  if (dry) {
    console.log("\n[dry-run] would wipe and re-insert above. Pass without --dry to commit.");
    await prisma.$disconnect();
    return;
  }

  console.log("\n→ Wiping current user-data tables…");
  // User cascade-deletes most of it, but be explicit so the order is visible.
  await prisma.$transaction([
    prisma.adminAuditLog.deleteMany({}),
    prisma.bonusPrediction.deleteMany({}),
    prisma.groupStandingPrediction.deleteMany({}),
    prisma.matchPrediction.deleteMany({}),
    prisma.user.deleteMany({}),
    prisma.inviteCode.deleteMany({}),
  ]);
  console.log("  ✓ wiped.");

  console.log("\n→ Restoring rows (preserving ids)…");
  // Order matters: User before predictions (FK target), InviteCode anytime.
  // createMany preserves explicit ids when present.
  if (snap.users?.length) {
    await prisma.user.createMany({ data: snap.users });
    console.log(`  ✓ ${snap.users.length} users`);
  }
  if (snap.inviteCodes?.length) {
    await prisma.inviteCode.createMany({ data: snap.inviteCodes });
    console.log(`  ✓ ${snap.inviteCodes.length} invite codes`);
  }
  if (snap.matchPredictions?.length) {
    await prisma.matchPrediction.createMany({ data: snap.matchPredictions });
    console.log(`  ✓ ${snap.matchPredictions.length} match predictions`);
  }
  if (snap.groupStandingPredictions?.length) {
    await prisma.groupStandingPrediction.createMany({ data: snap.groupStandingPredictions });
    console.log(`  ✓ ${snap.groupStandingPredictions.length} group standings`);
  }
  if (snap.bonusPrediction?.length) {
    await prisma.bonusPrediction.createMany({ data: snap.bonusPrediction });
    console.log(`  ✓ ${snap.bonusPrediction.length} bonus predictions`);
  }
  if (snap.adminAuditLog?.length) {
    await prisma.adminAuditLog.createMany({ data: snap.adminAuditLog });
    console.log(`  ✓ ${snap.adminAuditLog.length} audit log entries`);
  }

  console.log("\n→ Bumping sequences past restored max ids…");
  for (const { table, sequence } of TABLES_WITH_SEQUENCES) {
    // Postgres-specific: align the SERIAL sequence so future autoinserts
    // don't collide with restored ids.
    await prisma.$executeRawUnsafe(
      `SELECT setval('"${sequence}"', GREATEST((SELECT COALESCE(MAX(id), 0) FROM "${table}"), 1))`
    );
    console.log(`  ✓ ${sequence}`);
  }

  console.log("\n✅ Restore complete.");
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
