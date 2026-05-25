import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MatchCard } from "@/components/MatchCard";

const kickoff = new Date("2026-06-12T18:00:00Z");

const baseProps = {
  matchId: 42,
  kickoffTime: kickoff,
  slotDescription: null as string | null,
  groupName: "A" as string | null,
  round: "GROUP_1",
  initialHome: null as number | null,
  initialAway: null as number | null,
  initialPredictsEt: null as boolean | null,
  initialPredictsPens: null as boolean | null,
  pointsAwarded: null as number | null,
  isLocked: false,
};

const italy = { name: "Italia", flagEmoji: "🇮🇹" };
const brazil = { name: "Brazilia", flagEmoji: "🇧🇷" };

describe("MatchCard", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-12T14:00:00Z"));
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("renders the placeholder when either team is null", () => {
    render(
      <MatchCard
        {...baseProps}
        homeTeam={null}
        awayTeam={null}
        round="R32"
        groupName={null}
        slotDescription="Câștigător Grupa A"
      />
    );
    expect(screen.getByText(/echipe necunoscute/i)).toBeInTheDocument();
  });

  it("renders team names and score inputs for a group match", () => {
    render(<MatchCard {...baseProps} homeTeam={italy} awayTeam={brazil} />);
    expect(screen.getByText(/italia/i)).toBeInTheDocument();
    expect(screen.getByText(/brazilia/i)).toBeInTheDocument();
    expect(screen.getAllByRole("spinbutton")).toHaveLength(2);
  });

  it("does not show ET/pens toggles for a group match", () => {
    render(<MatchCard {...baseProps} homeTeam={italy} awayTeam={brazil} />);
    expect(screen.queryByLabelText(/prelungiri/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/penalty/i)).not.toBeInTheDocument();
  });

  it("shows ET/pens toggles for a knockout match when unlocked", () => {
    render(
      <MatchCard
        {...baseProps}
        round="QF"
        groupName={null}
        homeTeam={italy}
        awayTeam={brazil}
      />
    );
    expect(screen.getByLabelText(/prelungiri/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/penalty/i)).toBeInTheDocument();
  });

  it("disables score inputs and hides the save button when locked", () => {
    render(
      <MatchCard
        {...baseProps}
        homeTeam={italy}
        awayTeam={brazil}
        isLocked={true}
      />
    );
    const inputs = screen.getAllByRole("spinbutton");
    inputs.forEach((i) => expect(i).toBeDisabled());
    expect(screen.queryByRole("button", { name: /salv/i })).not.toBeInTheDocument();
  });

  it("posts the prediction to /api/predictions/match on save", async () => {
    render(
      <MatchCard
        {...baseProps}
        homeTeam={italy}
        awayTeam={brazil}
        initialHome={2}
        initialAway={1}
      />
    );
    const saveButton = screen.getByRole("button", { name: /salv/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/predictions/match",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            matchId: 42,
            homeScore: 2,
            awayScore: 1,
          }),
        })
      );
    });
  });

  it("includes ET/pens flags in the save body for knockout matches", async () => {
    render(
      <MatchCard
        {...baseProps}
        round="FINAL"
        groupName={null}
        homeTeam={italy}
        awayTeam={brazil}
        initialHome={0}
        initialAway={0}
        initialPredictsEt={true}
        initialPredictsPens={false}
      />
    );
    const saveButton = screen.getByRole("button", { name: /salv/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/predictions/match",
        expect.objectContaining({
          body: JSON.stringify({
            matchId: 42,
            homeScore: 0,
            awayScore: 0,
            predictsEt: true,
            predictsPens: false,
          }),
        })
      );
    });
  });
});
