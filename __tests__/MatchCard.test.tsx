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

  it("labels the button 'Salvează' when never saved", () => {
    render(<MatchCard {...baseProps} homeTeam={italy} awayTeam={brazil} />);
    expect(screen.getByRole("button", { name: /^salvează$/i })).toBeInTheDocument();
  });

  it("labels the button 'Actualizează' when initial value exists and user edits", () => {
    render(
      <MatchCard
        {...baseProps}
        homeTeam={italy}
        awayTeam={brazil}
        initialHome={2}
        initialAway={1}
      />
    );
    // Has initial → before user edits, no diff to save → button should be "Salvat" indicator (disabled or muted)
    const [homeInput] = screen.getAllByRole("spinbutton");
    fireEvent.change(homeInput, { target: { value: "3" } });
    expect(screen.getByRole("button", { name: /actualizează/i })).toBeInTheDocument();
  });

  it("selects the input text on focus so typing replaces it", () => {
    render(
      <MatchCard
        {...baseProps}
        homeTeam={italy}
        awayTeam={brazil}
        initialHome={2}
        initialAway={1}
      />
    );
    const [homeInput] = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    const selectSpy = jest.spyOn(homeInput, "select");
    fireEvent.focus(homeInput);
    expect(selectSpy).toHaveBeenCalled();
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
    // Need to dirty the card first since clean-saved cards have no diff to save
    const [homeInput] = screen.getAllByRole("spinbutton");
    fireEvent.change(homeInput, { target: { value: "3" } });
    const saveButton = screen.getByRole("button", { name: /actualizează/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/predictions/match",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            matchId: 42,
            homeScore: 3,
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
    // Dirty the card by bumping the home score; predictsEt/Pens remain at their initial values
    const [homeInput] = screen.getAllByRole("spinbutton");
    fireEvent.change(homeInput, { target: { value: "1" } });
    const saveButton = screen.getByRole("button", { name: /actualizează/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/predictions/match",
        expect.objectContaining({
          body: JSON.stringify({
            matchId: 42,
            homeScore: 1,
            awayScore: 0,
            predictsEt: true,
            predictsPens: false,
          }),
        })
      );
    });
  });
});
