import { BottomNav } from "@/components/BottomNav";
import { auth } from "@/auth";
import Link from "next/link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen pb-20">
      <header className="px-4 py-3 border-b border-slate-800 flex justify-between items-center">
        <h1 className="font-bold text-green-400">Cupa Mondiala</h1>
        {session?.user?.isAdmin && (
          <Link href="/admin/rezultate" className="text-xs text-slate-400">Admin</Link>
        )}
      </header>
      <main className="px-4 py-4 max-w-3xl mx-auto">{children}</main>
      <BottomNav />
    </div>
  );
}
