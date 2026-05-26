export type StandingsEntry = { position: number; teamId: number };

export type ValidateResult = { ok: true } | { ok: false; error: string };

export function validateStandingsSelection(
  entries: StandingsEntry[],
  groupTeamIds: number[]
): ValidateResult {
  if (entries.length !== 4) {
    return { ok: false, error: "Trebuie să alegi exact 4 echipe" };
  }

  const positions = entries.map((e) => e.position).sort((a, b) => a - b);
  for (let i = 0; i < 4; i++) {
    if (positions[i] !== i + 1) {
      return { ok: false, error: "Pozițiile trebuie să fie 1, 2, 3, 4" };
    }
  }

  const validIds = new Set(groupTeamIds);
  const seen = new Set<number>();
  for (const entry of entries) {
    if (!validIds.has(entry.teamId)) {
      return { ok: false, error: "Selecție invalidă — echipa nu e din grupă" };
    }
    if (seen.has(entry.teamId)) {
      return { ok: false, error: "Alege fiecare echipă o singură dată" };
    }
    seen.add(entry.teamId);
  }

  return { ok: true };
}
