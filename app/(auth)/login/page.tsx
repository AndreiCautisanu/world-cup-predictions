"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      username: fd.get("username"),
      password: fd.get("password"),
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Nume utilizator sau parolă incorecte");
      return;
    }
    router.push("/clasament");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 bg-slate-900 p-6 rounded-xl border border-slate-800">
      <h2 className="text-xl font-semibold">Autentificare</h2>
      <input
        name="username"
        placeholder="Nume utilizator"
        required
        className="w-full px-3 py-2 bg-slate-800 rounded border border-slate-700 focus:outline-none focus:border-green-500"
      />
      <input
        name="password"
        type="password"
        placeholder="Parolă"
        required
        className="w-full px-3 py-2 bg-slate-800 rounded border border-slate-700 focus:outline-none focus:border-green-500"
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-green-600 hover:bg-green-500 rounded font-semibold disabled:opacity-50"
      >
        {loading ? "Se autentifică..." : "Intră"}
      </button>
      <p className="text-sm text-center text-slate-400">
        Nu ai cont? <Link href="/register" className="text-green-400">Înregistrează-te</Link>
      </p>
    </form>
  );
}
