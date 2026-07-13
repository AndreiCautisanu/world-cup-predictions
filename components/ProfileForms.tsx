"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Initial = {
  firstName: string;
  lastName: string;
};

export function ProfileForms({ initial }: { initial: Initial }) {
  return (
    <div className="space-y-4">
      <NameForm initial={initial} />
      <PasswordForm />
    </div>
  );
}

function NameForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const isDirty =
    firstName.trim() !== initial.firstName ||
    lastName.trim() !== initial.lastName;

  async function save() {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "name",
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Eroare la salvare");
        setStatus("error");
        return;
      }
      setStatus("saved");
      router.refresh();
    } catch {
      setError("Conexiune întreruptă");
      setStatus("error");
    }
  }

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 ring-1 ring-slate-800/60">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
        Nume afișat
      </p>
      <h3 className="font-display mt-1 text-lg font-extrabold uppercase tracking-tight text-slate-50">
        Cum apari în clasament
      </h3>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Prenume
          </span>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            maxLength={50}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Nume
          </span>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            maxLength={50}
            className={inputClass}
          />
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
          {status === "saved" && !isDirty
            ? "Salvat ✓"
            : isDirty
              ? "Modificări nesalvate"
              : "Nimic de schimbat"}
        </span>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!isDirty || status === "saving"}
          className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "saving" ? "Se salvează…" : "Salvează"}
        </button>
      </div>

      {error && (
        <p className="mt-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      )}
    </article>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const tooShort = next.length > 0 && next.length < 8;
  const mismatch = confirm.length > 0 && confirm !== next;
  const canSubmit =
    current.length > 0 &&
    next.length >= 8 &&
    confirm === next &&
    status !== "saving";

  async function save() {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "password",
          currentPassword: current,
          newPassword: next,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Eroare la salvare");
        setStatus("error");
        return;
      }
      setStatus("saved");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch {
      setError("Conexiune întreruptă");
      setStatus("error");
    }
  }

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 ring-1 ring-slate-800/60">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-300/80">
        Parolă
      </p>
      <h3 className="font-display mt-1 text-lg font-extrabold uppercase tracking-tight text-slate-50">
        Schimbă parola
      </h3>

      <div className="mt-4 space-y-3">
        <label className="block space-y-1.5">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Parola actuală
          </span>
          <input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Parolă nouă
          </span>
          <input
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            minLength={8}
            className={inputClass}
          />
          {tooShort && (
            <span className="block text-[11px] text-amber-300/80">
              Minim 8 caractere.
            </span>
          )}
        </label>
        <label className="block space-y-1.5">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Confirmă parola nouă
          </span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
          />
          {mismatch && (
            <span className="block text-[11px] text-rose-300/80">
              Parolele nu se potrivesc.
            </span>
          )}
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
          {status === "saved" ? "Parolă schimbată ✓" : "Vei rămâne autentificat."}
        </span>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!canSubmit}
          className="rounded-full bg-amber-400 px-4 py-1.5 text-sm font-semibold text-amber-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "saving" ? "Se salvează…" : "Schimbă parola"}
        </button>
      </div>

      {error && (
        <p className="mt-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      )}
    </article>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20";
