/**
 * Promote a user to admin by username. Used after the post-reset cold start
 * where no admin exists in the DB yet.
 *
 * Run: railway run --service Postgres npx tsx scripts/_promote-admin.ts <username>
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("no db url");
const adapter = new PrismaPg({ connectionString: url });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

(async () => {
  const username = process.argv[2];
  if (!username) {
    console.error("usage: tsx scripts/_promote-admin.ts <username>");
    process.exit(2);
  }
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    console.error(`no such user: ${username}`);
    process.exit(1);
  }
  if (user.isAdmin) {
    console.log(`${username} is already admin. Nothing to do.`);
  } else {
    await prisma.user.update({ where: { id: user.id }, data: { isAdmin: true } });
    console.log(`✓ promoted ${username} (id=${user.id}) to admin.`);
  }
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
