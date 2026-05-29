"use client";

import { useCallback, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Team = { id: number; name: string; flagEmoji: string };

type Props = {
  groupId: number;
  groupName: string;
  teams: Team[];
  initial: Record<1 | 2 | 3 | 4, number>;
  locked: boolean;
};

const POSITION_META: Record<
  1 | 2 | 3 | 4,
  { tag: string; tone: string }
> = {
  1: { tag: "Câștigătoare", tone: "text-emerald-300" },
  2: { tag: "Locul 2", tone: "text-sky-300" },
  3: { tag: "Locul 3", tone: "text-amber-300" },
  4: { tag: "Ultima", tone: "text-rose-300" },
};

function ordersEqual(a: number[], b: number[]): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

export function GroupStandingsForm({
  groupId,
  groupName,
  teams,
  initial,
  locked,
}: Props) {
  const initialOrder: number[] = [initial[1], initial[2], initial[3], initial[4]];

  const [order, setOrder] = useState<number[]>(initialOrder);
  const [lastSaved, setLastSaved] = useState<number[]>(initialOrder);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const teamById = new Map<number, Team>();
  for (const t of teams) teamById.set(t.id, t);

  const isDirty = !ordersEqual(order, lastSaved);
  const hasSavedEver = status === "saved" || !ordersEqual(lastSaved, initialOrder);

  const sensors = useSensors(
    // distance: 2 — start dragging on a 2px move (was 4). Below ~2 you get
    // accidental drags on click; above feels laggy.
    useSensor(PointerSensor, { activationConstraint: { distance: 2 } }),
    // delay: 120 — shorter hold before mobile drag engages (was 180); still
    // long enough to not steal vertical scroll gestures.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.indexOf(Number(active.id));
      const newIndex = prev.indexOf(Number(over.id));
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
    setStatus("idle");
  }, []);

  const save = useCallback(async () => {
    if (saving || !isDirty) return;
    setSaving(true);
    setError(null);
    setStatus("idle");
    try {
      const res = await fetch("/api/predictions/standings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          groupId,
          standings: order.map((teamId, idx) => ({
            position: idx + 1,
            teamId,
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "A apărut o eroare");
        setStatus("error");
        return;
      }
      setLastSaved(order);
      setStatus("saved");
    } catch {
      setError("Conexiune întreruptă");
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }, [saving, isDirty, groupId, order]);

  const chrome = (() => {
    if (locked) return "border-slate-800/80 opacity-80";
    if (isDirty && hasSavedEver)
      return "border-amber-400/50 bg-amber-500/[0.04] ring-1 ring-amber-400/15";
    if (isDirty) return "border-amber-400/35 bg-amber-500/[0.025]";
    if (hasSavedEver)
      return "border-emerald-500/45 bg-emerald-500/[0.04] ring-1 ring-emerald-500/20";
    return "border-slate-800 hover:border-slate-700";
  })();

  const stripe = (() => {
    if (locked) return "bg-slate-700";
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
      <span aria-hidden className={`absolute inset-y-0 left-0 w-[3px] ${stripe}`} />

      <header className="flex items-center justify-between gap-3 border-b border-slate-800/70 px-4 py-2.5">
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/80">
            Grupa {groupName}
          </span>
          <span className="text-xs text-slate-400">
            Trage pentru reordonare · 3 pts / loc
          </span>
        </div>
        {!locked && hasSavedEver && !isDirty && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200 ring-1 ring-emerald-500/30">
            Salvat
          </span>
        )}
        {!locked && isDirty && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200 ring-1 ring-amber-400/30">
            Nesalvat
          </span>
        )}
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ol className="divide-y divide-slate-800/60">
            {order.map((teamId, idx) => {
              const position = (idx + 1) as 1 | 2 | 3 | 4;
              const team = teamById.get(teamId);
              if (!team) return null;
              return (
                <SortableRow
                  key={teamId}
                  id={teamId}
                  position={position}
                  team={team}
                  locked={locked}
                />
              );
            })}
          </ol>
        </SortableContext>
      </DndContext>

      {!locked && (
        <div className="flex items-center justify-between gap-3 border-t border-slate-800/70 px-4 py-2.5">
          <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            {isDirty
              ? hasSavedEver
                ? "Modificări nesalvate"
                : "Apasă „Salvează"
              : hasSavedEver
                ? "Pronostic salvat"
                : "Trage pentru reordonare"}
          </span>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !isDirty}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isDirty
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

function SortableRow({
  id,
  position,
  team,
  locked,
}: {
  id: number;
  position: 1 | 2 | 3 | 4;
  team: Team;
  locked: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: locked });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    // While actively dragging, kill the transition so the row sits exactly
    // under the cursor instead of easing toward it. dnd-kit's `transition`
    // is only useful for the reorder animation of *other* items, not the
    // one being dragged.
    transition: isDragging ? "none" : transition,
  };

  const meta = POSITION_META[position];

  return (
    <li
      ref={setNodeRef}
      style={style}
      // Tailwind's bare `transition` animates `transform` too, which fights
      // the live drag — scope to background/shadow/ring only so the dropped
      // chrome still fades in/out smoothly.
      className={`flex items-center gap-3 bg-slate-950/0 px-4 py-3 transition-[background-color,box-shadow,outline-color] duration-150 ${
        isDragging
          ? "z-10 rounded-lg bg-slate-900/90 shadow-2xl shadow-black/60 ring-1 ring-emerald-400/40"
          : ""
      }`}
    >
      <div className="flex w-10 flex-col items-center">
        <span className="font-display text-2xl font-extrabold tabular-nums leading-none text-slate-50">
          {position}
        </span>
        <span
          className={`mt-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] ${meta.tone}`}
        >
          {meta.tag}
        </span>
      </div>

      <span className="text-3xl leading-none drop-shadow" aria-hidden>
        {team.flagEmoji}
      </span>

      <span className="flex-1 truncate text-base font-bold tracking-tight text-slate-50 sm:text-lg">
        {team.name}
      </span>

      {!locked && (
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          type="button"
          aria-label={`Reordonează ${team.name}`}
          className="flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 transition hover:border-slate-700 hover:text-slate-200 active:cursor-grabbing"
        >
          <DragHandleIcon />
        </button>
      )}
    </li>
  );
}

function DragHandleIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className="h-4 w-4 fill-current"
    >
      <circle cx="5" cy="4" r="1.3" />
      <circle cx="11" cy="4" r="1.3" />
      <circle cx="5" cy="8" r="1.3" />
      <circle cx="11" cy="8" r="1.3" />
      <circle cx="5" cy="12" r="1.3" />
      <circle cx="11" cy="12" r="1.3" />
    </svg>
  );
}
