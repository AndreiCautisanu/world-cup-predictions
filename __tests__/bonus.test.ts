import { normalizeTopScorerName, validateBonusSelection } from "@/lib/bonus";

type Pot = 1 | 2 | 3 | 4;

const team = (id: number, pot: Pot) => ({ id, pot });

const allTeams = [
  team(1, 1),
  team(2, 1),
  team(3, 2),
  team(4, 2),
  team(5, 3),
  team(6, 3),
  team(7, 4),
  team(8, 4),
];

describe("normalizeTopScorerName", () => {
  it("canonicalizes spacing, accents, punctuation, and casing", () => {
    expect(normalizeTopScorerName("  kylian   mbappé  ")).toBe("Kylian Mbappe");
    expect(normalizeTopScorerName("OUSMANE–Dembélé")).toBe("Ousmane-Dembele");
    expect(normalizeTopScorerName("  lamine   yamal!!! ")).toBe("Lamine Yamal");
  });

  it("maps known top-scorer aliases to first-name last-name values", () => {
    expect(normalizeTopScorerName("Mbappe")).toBe("Kylian Mbappe");
    expect(normalizeTopScorerName("Mbaope")).toBe("Kylian Mbappe");
    expect(normalizeTopScorerName("Haaland")).toBe("Erling Haaland");
    expect(normalizeTopScorerName("Alvarez")).toBe("Julian Alvarez");
    expect(normalizeTopScorerName("Messi")).toBe("Lionel Messi");
    expect(normalizeTopScorerName("Viorel Messi")).toBe("Lionel Messi");
  });
});

describe("validateBonusSelection", () => {
  it("accepts a valid selection (different champion/runner-up, pot-3 dark horse)", () => {
    expect(
      validateBonusSelection(
        {
          championTeamId: 1,
          runnerUpTeamId: 3,
          topScorerName: "Lionel Messi",
          darkHorseTeamId: 5,
        },
        allTeams
      )
    ).toEqual({ ok: true });
  });

  it("accepts a pot-4 dark horse", () => {
    expect(
      validateBonusSelection(
        {
          championTeamId: 1,
          runnerUpTeamId: 3,
          topScorerName: "Lionel Messi",
          darkHorseTeamId: 8,
        },
        allTeams
      )
    ).toEqual({ ok: true });
  });

  it("rejects when champion equals runner-up", () => {
    const result = validateBonusSelection(
      {
        championTeamId: 1,
        runnerUpTeamId: 1,
        topScorerName: "Messi",
        darkHorseTeamId: 5,
      },
      allTeams
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a dark horse from pot 1", () => {
    const result = validateBonusSelection(
      {
        championTeamId: 1,
        runnerUpTeamId: 3,
        topScorerName: "Messi",
        darkHorseTeamId: 2, // pot 1
      },
      allTeams
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a dark horse from pot 2", () => {
    const result = validateBonusSelection(
      {
        championTeamId: 1,
        runnerUpTeamId: 3,
        topScorerName: "Messi",
        darkHorseTeamId: 4, // pot 2
      },
      allTeams
    );
    expect(result.ok).toBe(false);
  });

  it("rejects an unknown champion team id", () => {
    const result = validateBonusSelection(
      {
        championTeamId: 999,
        runnerUpTeamId: 3,
        topScorerName: "Messi",
        darkHorseTeamId: 5,
      },
      allTeams
    );
    expect(result.ok).toBe(false);
  });

  it("rejects an empty / whitespace top scorer name", () => {
    const result = validateBonusSelection(
      {
        championTeamId: 1,
        runnerUpTeamId: 3,
        topScorerName: "   ",
        darkHorseTeamId: 5,
      },
      allTeams
    );
    expect(result.ok).toBe(false);
  });
});
