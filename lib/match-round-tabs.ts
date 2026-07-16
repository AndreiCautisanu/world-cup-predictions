import type { Round } from "@prisma/client";

export type MatchRoundTabKey = Exclude<Round, "THIRD_PLACE" | "FINAL"> | "FINALS";

export type MatchRoundTab = {
  key: MatchRoundTabKey;
  label: string;
  sub: string;
  rounds: Round[];
};

export const MATCH_ROUND_TABS: MatchRoundTab[] = [
  { key: "GROUP_1", label: "Etapa 1", sub: "Grupe", rounds: ["GROUP_1"] },
  { key: "GROUP_2", label: "Etapa 2", sub: "Grupe", rounds: ["GROUP_2"] },
  { key: "GROUP_3", label: "Etapa 3", sub: "Grupe", rounds: ["GROUP_3"] },
  { key: "R32", label: "Șaisprezecimi", sub: "32 echipe", rounds: ["R32"] },
  { key: "R16", label: "Optimi", sub: "16 echipe", rounds: ["R16"] },
  { key: "QF", label: "Sferturi", sub: "8 echipe", rounds: ["QF"] },
  { key: "SF", label: "Semifinale", sub: "4 echipe", rounds: ["SF"] },
  { key: "FINALS", label: "Finale", sub: "2 meciuri", rounds: ["THIRD_PLACE", "FINAL"] },
];

export function matchRoundTabFromParam(value: string | undefined): MatchRoundTabKey {
  if (value === "THIRD_PLACE" || value === "FINAL" || value === "FINALS") {
    return "FINALS";
  }

  const tab = MATCH_ROUND_TABS.find((t) => t.key === value);
  return tab?.key ?? "FINALS";
}

export function roundsForMatchRoundTab(key: MatchRoundTabKey): Round[] {
  return [...MATCH_ROUND_TABS.find((t) => t.key === key)!.rounds];
}
