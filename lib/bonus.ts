export type BonusInput = {
  championTeamId: number;
  runnerUpTeamId: number;
  topScorerName: string;
  darkHorseTeamId: number;
};

export type BonusTeamShape = { id: number; pot: number };

export type ValidateResult = { ok: true } | { ok: false; error: string };

export function validateBonusSelection(
  input: BonusInput,
  teams: BonusTeamShape[]
): ValidateResult {
  if (input.topScorerName.trim().length < 2) {
    return { ok: false, error: "Numele golgheterului e obligatoriu" };
  }

  if (input.championTeamId === input.runnerUpTeamId) {
    return {
      ok: false,
      error: "Campionul și finalista trebuie să fie diferite",
    };
  }

  const byId = new Map<number, BonusTeamShape>();
  for (const t of teams) byId.set(t.id, t);

  const champion = byId.get(input.championTeamId);
  const runnerUp = byId.get(input.runnerUpTeamId);
  const darkHorse = byId.get(input.darkHorseTeamId);

  if (!champion) return { ok: false, error: "Campion invalid" };
  if (!runnerUp) return { ok: false, error: "Finalist invalid" };
  if (!darkHorse) return { ok: false, error: "Cal negru invalid" };

  if (darkHorse.pot !== 3 && darkHorse.pot !== 4) {
    return {
      ok: false,
      error: "Calul negru trebuie să fie din urna 3 sau urna 4",
    };
  }

  return { ok: true };
}
