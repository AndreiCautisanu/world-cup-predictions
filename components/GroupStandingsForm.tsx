"use client";

import { useCallback, useMemo, useState } from "react";

type Team = { id: number; name: string; flagEmoji: string };

type Selection = Record<1 | 2 | 3 | 4, number>;

type Props = {
  groupId: number;
  groupName: string;
  teams: Team[];
  initial: Selection;
  locked: boolean;
};

const POSITION_LABELS: Record<1 | 2 | 3 | 4, { ord: string; tag: string }> = {
  1: { ord: "1", tag: "Câștigătoare" },
  2: { ord: "2", tag: "Locul 2" },
  3: { ord: "3", tag: "Locul 3" },
  4: { ord: "4", tag: "Ultima" },
};

function selectionsEqual(a: Selection, b: Selection): boolean {
  return a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4];
}

function hasDuplicates(sel: Selection): boolean {
  return new Set([sel[1], sel[2], sel[3], sel[4]]).size !== 4;
}

export function GroupStandingsForm({
  groupId,
  groupName,
  teams,
  initial,
  locked,
}: Props) {
  const [selection, setSelection] = useState<Selection>(initial);
  const [lastSaved, setLastSaved] = useState<Selection>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const teamById = useMemo(() => {
    const m = new Map<number, Team>();
    for (const t of teams) m.set(t.id, t);
    return m;
  }, [teams]);

  const duplicate = useMemo(() => hasDuplicates(selection), [selection]);
  const isDirty = useMemo(
    () => !selectionsEqual(selection, lastSaved),
    [selection, lastSaved]
  );

  const update = useCallback(
    (position: 1 | 2 | 3 | 4, teamId: number) => {
      setSelection((prev) => ({ ...prev, [position]: teamId }));
      setStatus("idle");
    },
    []
  );

  const save = useCallback(async () => {
    if (saving || duplicate || !isDirty) return;
    setSaving(true);
    setError(null);
    setStatus("idle");
    try {
      const res = await fetch("/api/predictions/standings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          groupId,
          standings: ([1, 2, 3, 4] as const).map((p) => ({
            position: p,
            teamId: selection[p],
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "A apărut o eroare");
        setStatus("error");
        return;
      }
      setLastSaved(selection);
      setStatus("saved");
    } catch {
      setError("Conexiune întreruptă");
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }, [saving, duplicate, isDirty, groupId, selection]);

  const hasSavedEver = !selectionsEqual(lastSaved, initial) || status === "saved";

  const chrome = (() => {
    if (locked) return "border-slate-800/80 opacity-80";
    if (duplicate) return "border-rose-500/50 ring-1 ring-rose-500/20";
    if (isDirty && hasSavedEver)
      return "border-amber-400/50 bg-amber-500/[0.04] ring-1 ring-amber-400/15";
    if (isDirty) return "border-amber-400/35 bg-amber-500/[0.025]";
    if (hasSavedEver)
      return "border-emerald-500/45 bg-emerald-500/[0.04] ring-1 ring-emerald-500/20";
    return "border-slate-800 hover:border-slate-700";
  })();

  const stripe = (() => {
    if (locked) return "bg-slate-700";
    if (duplicate) return "bg-gradient-to-b from-rose-400 via-rose-500 to-rose-600";
    if (isDirty)
      return "bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500";
    if (hasSavedEver)
      return "bg-gradient-to-b from-emerald-400 to-emerald-600";
    return "bg-gradient-to-b from-slate-600 to-slate-800";
  })();

  const buttonLabel = (() => {
    if (saving) return "Se salvează…";
    if (status === "error") return "Reîncearcă";
    if (hasSavedEver && !isDirty) return "Salvat ✓";
    if (hasSavedEver && isDirty) return "Actualizează";
    return "Salvează";
  })();

  return (
    <article
      data-group-id={groupId}
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-slate-950 shadow-lg shadow-black/20 backdrop-blur transition ${chrome}`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-[3px] ${stripe}`}
      />

      <header className="flex items-center justify-between gap-3 border-b border-slate-800/70 px-4 py-2.5">
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/80">
            Grupa {groupName}
          </span>
          <span className="text-xs text-slate-400">
            Ordinea finală · 3 puncte / poziție
          </span>
        </div>
        {!locked && hasSavedEver && !isDirty && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200 ring-1 ring-emerald-500/30"
            aria-label="salvat"
          >
            Salvat
          </span>
        )}
        {!locked && isDirty && !duplicate && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200 ring-1 ring-amber-400/30">
            Nesalvat
          </span>
        )}
      </header>

      <ol className="divide-y divide-slate-800/60">
        {([1, 2, 3, 4] as const).map((pos) => {
          const meta = POSITION_LABELS[pos];
          const team = teamById.get(selection[pos]);
          return (
            <li
              key={pos}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <div className="flex w-10 flex-col items-center">
                <span className="font-display text-2xl font-extrabold text-slate-50 tabular-nums leading-none">
                  {meta.ord}
                </span>
                <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {meta.tag}
                </span>
              </div>

              <span
                aria-hidden
                className="text-2xl leading-none drop-shadow"
              >
                {team?.flagEmoji ?? "🏳️"}
              </span>

              <select
                aria-label={`Poziția ${pos} — Grupa ${groupName}`}
                value={selection[pos]}
                onChange={(e) => update(pos, Number(e.target.value))}
                disabled={locked}
                className="font-display flex-1 truncate rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm font-semibold uppercase tracking-[0.06em] text-slate-100 shadow-inner outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.flagEmoji} {t.name}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ol>

      {!locked && (
        <div className="flex items-center justify-between gap-3 border-t border-slate-800/70 px-4 py-2.5">
          <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            {duplicate
              ? "Echipă duplicată"
              : isDirty
                ? hasSavedEver
                  ? "Modificări nesalvate"
                  : "Apasă „Salvează"
                : hasSavedEver
                  ? "Pronostic salvat"
                  : "Niciun pronostic încă"}
          </span>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || duplicate || !isDirty}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              duplicate
                ? "bg-rose-500/20 text-rose-200 shadow-[0_0_0_1px_rgba(244,63,94,0.4)]"
                : isDirty
                  ? "bg-amber-400 text-amber-950 shadow-[0_0_0_1px_rgba(251,191,36,0.5)] hover:bg-amber-300"
                  : hasSavedEver
                    ? "bg-emerald-500/20 text-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]"
                    : "bg-emerald-500 text-emerald-950 shadow-[0_0_0_1px_rgba(16,185,129,0.4)] hover:bg-emerald-400"
            }`}
          >
            {buttonLabel}
          </button>
        </div>
      )}

      {error && (
        <p className="border-t border-rose-500/30 bg-rose-500/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-300">
          {error}
        </p>
      )}
    </article>
  );
}
