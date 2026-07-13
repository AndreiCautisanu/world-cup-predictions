"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type User = {
  id: number;
  username: string;
  isAdmin: boolean;
  createdAt: string;
  predictionCount: number;
  firstName: string | null;
  lastName: string | null;
};

const JOINED_FORMATTER = new Intl.DateTimeFormat("ro-RO", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

type Status = "idle" | "saving" | "saved" | "error";

export function AdminUserRow({ user }: { user: User }) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);
  const [newPassword, setNewPassword] = useState("");
  const [pwStatus, setPwStatus] = useState<Status>("idle");
  const [adminStatus, setAdminStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [nameStatus, setNameStatus] = useState<Status>("idle");

  async function saveName() {
    setNameStatus("saving");
    setError(null);
    try {
      await call({ firstName: firstName.trim(), lastName: lastName.trim() });
      setNameStatus("saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare");
      setNameStatus("error");
    }
  }

  async function call(payload: {
    isAdmin?: boolean;
    resetPassword?: string;
    firstName?: string;
    lastName?: string;
  }) {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: user.id, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Eroare");
  }

  async function toggleAdmin(next: boolean) {
    setAdminStatus("saving");
    setError(null);
    try {
      await call({ isAdmin: next });
      setIsAdmin(next);
      setAdminStatus("saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare");
      setAdminStatus("error");
      setIsAdmin(!next);
    }
  }

  async function resetPassword() {
    if (newPassword.length < 8) {
      setError("Minim 8 caractere");
      setPwStatus("error");
      return;
    }
    setPwStatus("saving");
    setError(null);
    try {
      await call({ resetPassword: newPassword });
      setNewPassword("");
      setPwStatus("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare");
      setPwStatus("error");
    }
  }

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-lg font-extrabold uppercase tracking-tight text-slate-50">
            {user.username}
          </span>
          {isAdmin && (
            <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-200">
              Admin
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
            {JOINED_FORMATTER.format(new Date(user.createdAt))} · {user.predictionCount} pronosticuri
          </span>
          <Link
            href={`/admin/utilizatori/${user.id}`}
            className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300 transition hover:border-rose-500/40 hover:text-rose-100"
          >
            Vezi pronosticuri
          </Link>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-200 transition hover:border-rose-500/40">
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(e) => toggleAdmin(e.target.checked)}
            disabled={adminStatus === "saving"}
            className="accent-rose-400"
          />
          <span className="font-semibold uppercase tracking-[0.18em]">Admin</span>
          {adminStatus === "saving" && <span className="text-slate-500">…</span>}
        </label>

        <div className="flex flex-1 items-center gap-2">
          <input
            type="password"
            placeholder="Parolă nouă (min. 8)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-rose-400/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={resetPassword}
            disabled={pwStatus === "saving"}
            className="rounded-full bg-rose-500 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-rose-50 transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pwStatus === "saving"
              ? "…"
              : pwStatus === "saved"
                ? "Resetată ✓"
                : "Resetează"}
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Prenume"
          value={firstName}
          maxLength={50}
          onChange={(e) => setFirstName(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-rose-400/60 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Nume"
          value={lastName}
          maxLength={50}
          onChange={(e) => setLastName(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-rose-400/60 focus:outline-none"
        />
        <button
          type="button"
          onClick={saveName}
          disabled={nameStatus === "saving"}
          className="rounded-full bg-rose-500 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-rose-50 transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {nameStatus === "saving" ? "…" : nameStatus === "saved" ? "Salvat ✓" : "Salvează"}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-300">
          {error}
        </p>
      )}
    </article>
  );
}
