import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

// Lazy singleton — only initialised on first import that executes in a live runtime.
// This is important: do NOT call createPrismaClient() here at module level.
// We use a getter so Next.js build (which lacks DATABASE_URL) never triggers it.
function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    // The Proxy forwards arbitrary PrismaClient property access, so `any` is
    // unavoidable here without re-declaring every delegate. Limited to this
    // one indirection — every callsite still sees the proper PrismaClient
    // type.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getPrisma() as any)[prop];
  },
});
