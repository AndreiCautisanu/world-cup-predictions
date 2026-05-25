"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      inviteCode: fd.get("inviteCode"),
      username: fd.get("username"),
      password: fd.get("password"),
    };

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Eroare necunoscută");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      username: payload.username,
      password: payload.password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Cont creat, dar autentificarea a eșuat. Încearcă să te loghezi manual.");
      return;
    }
    router.push("/clasament");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 bg-slate-900 p-6 rounded-xl border border-slate-800">
      <h2 className="text-xl font-semibold">Înregistrare</h2>
      <input
        name="inviteCode"
        placeholder="Cod de invitație"
        required
        className="w-full px-3 py-2 bg-slate-800 rounded border border-slate-700 focus:outline-none focus:border-green-500"
      />
      <input
        name="username"
        placeholder="Nume utilizator"
        required
        className="w-full px-3 py-2 bg-slate-800 rounded border border-slate-700 focus:outline-none focus:border-green-500"
      />
      <input
        name="password"
        type="password"
        placeholder="Parolă (min 8 caractere)"
        required
        className="w-full px-3 py-2 bg-slate-800 rounded border border-slate-700 focus:outline-none focus:border-green-500"
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-green-600 hover:bg-green-500 rounded font-semibold disabled:opacity-50"
      >
        {loading ? "Se creează..." : "Creează cont"}
      </button>
      <p className="text-sm text-center text-slate-400">
        Ai deja cont? <Link href="/login" className="text-green-400">Loghează-te</Link>
      </p>
    </form>
  );
}
