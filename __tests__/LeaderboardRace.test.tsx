import { act, fireEvent, render, screen } from "@testing-library/react";
import { LeaderboardRace } from "@/components/LeaderboardRace";
import type { RaceTimeline } from "@/lib/leaderboard-race";

const timeline: RaceTimeline = {
  finalMax: 18,
  snapshots: [
    {
      key: "start",
      kind: "start",
      occurredAt: "2026-06-11T18:00:00.000Z",
      round: null,
      label: "Startul turneului",
      detail: null,
      leaderChanged: false,
      players: [
        { userId: 1, username: "ana", displayName: "Ana", total: 0, delta: 0, rank: 1 },
        { userId: 2, username: "mihai", displayName: "Mihai", total: 0, delta: 0, rank: 1 },
      ],
    },
    {
      key: "match-1",
      kind: "match",
      occurredAt: "2026-06-12T18:00:00.000Z",
      round: "GROUP_1",
      label: "Grupe · Etapa 1",
      detail: "Argentina 2–1 Franța",
      leaderChanged: false,
      players: [
        { userId: 1, username: "ana", displayName: "Ana", total: 7, delta: 7, rank: 1 },
        { userId: 2, username: "mihai", displayName: "Mihai", total: 4, delta: 4, rank: 2 },
      ],
    },
    {
      key: "match-2",
      kind: "match",
      occurredAt: "2026-07-19T18:00:00.000Z",
      round: "FINAL",
      label: "Finala",
      detail: "Argentina 1–0 Spania",
      leaderChanged: true,
      players: [
        { userId: 2, username: "mihai", displayName: "Mihai", total: 18, delta: 14, rank: 1 },
      ],
    },
  ],
};

function setReducedMotion(matches: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

describe("LeaderboardRace", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setReducedMotion(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("starts ready, plays, pauses, scrubs, and restarts", () => {
    render(<LeaderboardRace timeline={timeline} />);

    expect(screen.getByText("Startul turneului")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /pornește cursa/i }));
    expect(screen.getByRole("button", { name: /pauză/i })).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(900));
    expect(screen.getByText("Argentina 2–1 Franța")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /pauză/i }));
    act(() => jest.advanceTimersByTime(5000));
    expect(screen.getByText("Argentina 2–1 Franța")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("slider", { name: /cronologia turneului/i }), {
      target: { value: "2" },
    });
    expect(screen.getByText("Argentina 1–0 Spania")).toBeInTheDocument();
    expect(screen.getByText(/câștigător/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /reia de la început/i }));
    expect(screen.getByText("Startul turneului")).toBeInTheDocument();
  });

  it("renders current ranks, totals, and positive point deltas", () => {
    render(<LeaderboardRace timeline={timeline} />);

    fireEvent.change(screen.getByRole("slider", { name: /cronologia turneului/i }), {
      target: { value: "1" },
    });

    expect(screen.getByTestId("race-row-1")).toHaveAttribute("data-rank", "1");
    expect(screen.getByTestId("race-row-2")).toHaveAttribute("data-rank", "2");
    expect(screen.getByText("7", { selector: "[data-total]" })).toBeInTheDocument();
    expect(screen.getByText("+7")).toBeInTheDocument();
    expect(screen.getByText("+4")).toBeInTheDocument();
  });

  it("keeps a departing player for one transition as an exiting row", () => {
    render(<LeaderboardRace timeline={timeline} />);

    fireEvent.change(screen.getByRole("slider", { name: /cronologia turneului/i }), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByRole("slider", { name: /cronologia turneului/i }), {
      target: { value: "2" },
    });

    expect(screen.getByTestId("race-row-1")).toHaveAttribute("data-state", "exiting");
    expect(screen.getByTestId("race-row-2")).toHaveAttribute("data-state", "active");
  });

  it("disables interpolated transitions when reduced motion is requested", () => {
    setReducedMotion(true);
    render(<LeaderboardRace timeline={timeline} />);

    expect(screen.getByTestId("race-stage")).toHaveAttribute("data-reduced-motion", "true");
    expect(screen.getByRole("button", { name: /pornește cursa/i })).toBeEnabled();
  });
});
