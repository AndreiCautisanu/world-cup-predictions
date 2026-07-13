"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type RegisterFormState } from "./actions";
import { PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS } from "@/lib/password-requirements";

const initial: RegisterFormState = {};

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, initial);

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-6 ring-1 ring-slate-800/60 backdrop-blur"
    >
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-emerald-300/70">
          Înregistrare
        </p>
        <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight text-slate-50">
          Intră în comunitate
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Prenume">
          <input
            name="firstName"
            placeholder="Andrei"
            required
            maxLength={50}
            autoComplete="given-name"
            defaultValue={state.values?.firstName ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Nume">
          <input
            name="lastName"
            placeholder="Popescu"
            required
            maxLength={50}
            autoComplete="family-name"
            defaultValue={state.values?.lastName ?? ""}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Nume utilizator" hint="Litere, cifre, _ și -. Apare ca @nume în app.">
        <input
          name="username"
          placeholder="andrei_p"
          required
          autoComplete="username"
          defaultValue={state.values?.username ?? ""}
          className={inputClass}
        />
      </Field>

      <Field label="Parolă" hint={PASSWORD_REQUIREMENTS}>
        <input
          name="password"
          type="password"
          placeholder="••••••••"
          required
          minLength={PASSWORD_MIN_LENGTH}
          autoComplete="new-password"
          className={inputClass}
        />
      </Field>

      {state.error && (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-display text-sm font-bold uppercase tracking-[0.18em] text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
      >
        {pending ? "Se creează…" : "Creează cont"}
      </button>

      <p className="text-center text-sm text-slate-400">
        Ai deja cont?{" "}
        <Link href="/login" className="font-medium text-emerald-300 hover:text-emerald-200">
          Loghează-te
        </Link>
      </p>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}
