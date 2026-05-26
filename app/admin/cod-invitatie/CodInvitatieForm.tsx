"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "saving" | "saved" | "error";

export function CodInvitatieForm({ active }: { active: boolean }) {
  const router = useRouter();
  const [newCode, setNewCode] = useState("");
  const [toggleStatus, setToggleStatus] = useState<Status>("idle");
  const [rotateStatus, setRotateStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function call(body: Record<string, unknown>): Promise<void> {
    const res = await fetch("/api/admin/invite-code", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Eroare");
  }

  async function toggle() {
    setToggleStatus("saving");
    setError(null);
    try {
      await call({ action: "toggle" });
      setToggleStatus("saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare");
      setToggleStatus("error");
    }
  }

  async function rotate() {
    if (newCode.length < 4) {
      setError("Minim 4 caractere");
      setRotateStatus("error");
      return;
    }
    setRotateStatus("saving");
    setError(null);
    try {
      await call({ action: "rotate", newCode });
      setNewCode("");
      setRotateStatus("saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare");
      setRotateStatus("error");
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={toggle}
          disabled={toggleStatus === "saving"}
          className="rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100 transition hover:bg-amber-500/20 disabled:opacity-50"
        >
          {toggleStatus === "saving"
            ? "…"
            : active
              ? "Dezactivează codul"
              : "Reactivează codul"}
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
          Rotește codul
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="Ex. cupa2026-final"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1.5 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:border-rose-400/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={rotate}
            disabled={rotateStatus === "saving"}
            className="rounded-full bg-rose-500 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-rose-50 transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {rotateStatus === "saving"
              ? "…"
              : rotateStatus === "saved"
                ? "Rotit ✓"
                : "Generează"}
          </button>
        </div>
        <p className="text-[11px] text-slate-500">
          Codul curent va fi dezactivat automat. Litere, cifre, &laquo;-&raquo; și &laquo;_&raquo;.
        </p>
      </div>

      {error && (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-300">{error}</p>
      )}
    </div>
  );
}
