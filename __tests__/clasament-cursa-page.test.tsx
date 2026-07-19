import { render, screen } from "@testing-library/react";
import { getLeaderboardRaceTimeline } from "@/lib/leaderboard-race";
import type { RaceTimeline } from "@/lib/leaderboard-race";
import CursaPage from "@/app/(app)/clasament/cursa/page";

jest.mock("@/lib/leaderboard-race", () => {
  const actual = jest.requireActual("@/lib/leaderboard-race");
  return {
    ...actual,
    getLeaderboardRaceTimeline: jest.fn(),
  };
});

jest.mock("@/lib/prisma", () => ({ prisma: {} }));

const populatedTimeline: RaceTimeline = {
  finalMax: 7,
  snapshots: [
    {
      key: "start",
      kind: "start",
      occurredAt: "2026-06-11T18:00:00.000Z",
      round: null,
      label: "Startul turneului",
      detail: null,
      players: [{ userId: 1, username: "ana", displayName: "Ana", total: 0, delta: 0, rank: 1 }],
      leaderChanged: false,
    },
    {
      key: "match-1",
      kind: "match",
      occurredAt: "2026-06-12T18:00:00.000Z",
      round: "GROUP_1",
      label: "Grupe · Etapa 1",
      detail: "Argentina 2–1 Franța",
      players: [{ userId: 1, username: "ana", displayName: "Ana", total: 7, delta: 7, rank: 1 }],
      leaderChanged: false,
    },
  ],
};

describe("CursaPage", () => {
  const mockedLoader = jest.mocked(getLeaderboardRaceTimeline);

  beforeEach(() => {
    mockedLoader.mockReset();
  });

  it("renders the race and a route back to the leaderboard", async () => {
    mockedLoader.mockResolvedValue(populatedTimeline);

    render(await CursaPage());

    expect(screen.getByRole("heading", { name: "Cursa turneului" })).toBeInTheDocument();
    expect(screen.queryByText("Argentina 2–1 Franța")).not.toBeInTheDocument();
    expect(screen.getByText("Startul turneului")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /înapoi la clasament/i })).toHaveAttribute("href", "/clasament");
    expect(screen.getByRole("button", { name: /pornește cursa/i })).toBeInTheDocument();
  });

  it("renders a useful empty state when no scoring history exists", async () => {
    mockedLoader.mockResolvedValue({
      snapshots: populatedTimeline.snapshots.slice(0, 1),
      finalMax: 0,
    });

    render(await CursaPage());

    expect(screen.getByText("Cursa nu e disponibilă")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /vezi clasamentul/i })).toHaveAttribute("href", "/clasament");
  });
});
