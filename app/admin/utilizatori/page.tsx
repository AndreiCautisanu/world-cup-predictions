import { prisma } from "@/lib/prisma";
import { AdminUserRow } from "./AdminUserRow";

export default async function AdminUtilizatori() {
  const users = await prisma.user.findMany({
    orderBy: [{ isAdmin: "desc" }, { username: "asc" }],
    select: {
      id: true,
      username: true,
      isAdmin: true,
      createdAt: true,
      firstName: true,
      lastName: true,
      _count: {
        select: {
          matchPredictions: true,
        },
      },
    },
  });

  const adminCount = users.filter((u) => u.isAdmin).length;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-rose-300/80">
          Admin · Utilizatori
        </p>
        <div className="flex items-end justify-between gap-3">
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-slate-50 sm:text-4xl">
            {users.length} jucători
          </h1>
          <span className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
            {adminCount} admin{adminCount === 1 ? "" : "i"}
          </span>
        </div>
        <p className="text-sm text-slate-400">
          Promovează un coleg la admin sau resetează-i parola. Modificările se aplică imediat.
        </p>
      </section>

      <div className="space-y-2">
        {users.map((u) => (
          <AdminUserRow
            key={u.id}
            user={{
              id: u.id,
              username: u.username,
              isAdmin: u.isAdmin,
              createdAt: u.createdAt.toISOString(),
              predictionCount: u._count.matchPredictions,
              firstName: u.firstName,
              lastName: u.lastName,
            }}
          />
        ))}
      </div>
    </div>
  );
}
