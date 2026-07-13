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
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-6 ring-1 ring-slate-800/60 backdrop-blur"
    >
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-emerald-300/70">
          Autentificare
        </p>
        <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight text-slate-50">
          Bine ai revenit
        </h2>
      </div>

      <Field label="Nume utilizator">
        <input
          name="username"
          autoComplete="username"
          required
          className={inputClass}
        />
      </Field>

      <Field label="Parolă">
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </Field>

      {error && (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-display text-sm font-bold uppercase tracking-[0.18em] text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
      >
        {loading ? "Se autentifică…" : "Intră"}
      </button>

      <p className="text-center text-sm text-slate-400">
        Nu ai cont?{" "}
        <Link href="/register" className="font-medium text-emerald-300 hover:text-emerald-200">
          Înregistrează-te
        </Link>
      </p>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}
