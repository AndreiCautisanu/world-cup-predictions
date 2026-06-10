import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BonusForm } from "@/components/BonusForm";

const teams = [
  { id: 1, name: "Argentina", flagEmoji: "🇦🇷", pot: 1 },
  { id: 2, name: "Franța", flagEmoji: "🇫🇷", pot: 1 },
  { id: 3, name: "Maroc", flagEmoji: "🇲🇦", pot: 2 },
  { id: 4, name: "Senegal", flagEmoji: "🇸🇳", pot: 2 },
  { id: 5, name: "Ecuador", flagEmoji: "🇪🇨", pot: 3 },
  { id: 6, name: "Norvegia", flagEmoji: "🇳🇴", pot: 3 },
  { id: 7, name: "Curaçao", flagEmoji: "🇨🇼", pot: 4 },
  { id: 8, name: "Uzbekistan", flagEmoji: "🇺🇿", pot: 4 },
];

const baseProps = {
  allTeams: teams,
  initial: {
    championTeamId: null as number | null,
    runnerUpTeamId: null as number | null,
    topScorerName: "",
    darkHorseTeamId: null as number | null,
  },
  locked: false,
};

// The team pickers are now buttons (aria-label = category) that open a portal
// dialog with a searchable role="listbox" of role="option" items. Pick = open
// the category, click the option by team name.
function pickTeam(category: RegExp, team: RegExp) {
  fireEvent.click(screen.getByRole("button", { name: category }));
  fireEvent.click(screen.getByRole("option", { name: team }));
}

describe("BonusForm", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders all 4 bonus categories", () => {
    render(<BonusForm {...baseProps} />);
    expect(screen.getByRole("button", { name: /campion/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /finalist/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/golgheter/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /surpriza/i })).toBeInTheDocument();
  });

  it("filters dark horse options to pots 3 and 4 only", () => {
    render(<BonusForm {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /surpriza/i }));
    const names = screen.getAllByRole("option").map((o) => o.textContent ?? "");
    expect(names).toHaveLength(4);
    expect(names.some((n) => /Ecuador/.test(n))).toBe(true);
    expect(names.some((n) => /Norvegia/.test(n))).toBe(true);
    expect(names.some((n) => /Curaçao/.test(n))).toBe(true);
    expect(names.some((n) => /Uzbekistan/.test(n))).toBe(true);
    // A pot-1 team must NOT be offered as a dark horse.
    expect(names.some((n) => /Argentina/.test(n))).toBe(false);
  });

  it("disables pickers and hides save when locked", () => {
    render(<BonusForm {...baseProps} locked={true} />);
    expect(screen.getByRole("button", { name: /campion/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /finalist/i })).toBeDisabled();
    expect(screen.getByLabelText(/golgheter/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /surpriza/i })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /salv/i })).not.toBeInTheDocument();
  });

  it("warns when champion equals runner-up and disables save", () => {
    render(<BonusForm {...baseProps} />);
    pickTeam(/campion/i, /Argentina/);
    pickTeam(/finalist/i, /Argentina/);
    fireEvent.change(screen.getByLabelText(/golgheter/i), {
      target: { value: "Messi" },
    });
    expect(screen.getByText(/diferite/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /salv/i })).toBeDisabled();
  });

  it("posts the bonus prediction on save", async () => {
    render(<BonusForm {...baseProps} />);
    pickTeam(/campion/i, /Argentina/);
    pickTeam(/finalist/i, /Maroc/);
    fireEvent.change(screen.getByLabelText(/golgheter/i), {
      target: { value: "Lionel Messi" },
    });
    pickTeam(/surpriza/i, /Ecuador/);
    fireEvent.click(screen.getByRole("button", { name: /salv/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/predictions/bonus",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            championTeamId: 1,
            runnerUpTeamId: 3,
            topScorerName: "Lionel Messi",
            darkHorseTeamId: 5,
          }),
        })
      );
    });
  });

  it("pre-fills the pickers from the initial prop", () => {
    render(
      <BonusForm
        {...baseProps}
        initial={{
          championTeamId: 2,
          runnerUpTeamId: 4,
          topScorerName: "Mbappé",
          darkHorseTeamId: 6,
        }}
      />
    );
    expect(screen.getByRole("button", { name: /campion/i })).toHaveTextContent(/Franța/);
    expect(screen.getByRole("button", { name: /finalist/i })).toHaveTextContent(/Senegal/);
    expect(
      (screen.getByLabelText(/golgheter/i) as HTMLInputElement).value
    ).toBe("Mbappé");
    expect(screen.getByRole("button", { name: /surpriza/i })).toHaveTextContent(/Norvegia/);
  });

  it("keeps save disabled while the top scorer is blank", () => {
    render(<BonusForm {...baseProps} />);
    pickTeam(/campion/i, /Argentina/);
    pickTeam(/finalist/i, /Maroc/);
    pickTeam(/surpriza/i, /Ecuador/);
    expect(screen.getByRole("button", { name: /salv/i })).toBeDisabled();
  });

  it("shows API error message on failed save", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Calul negru trebuie să fie din urna 3 sau urna 4" }),
    });
    render(<BonusForm {...baseProps} />);
    pickTeam(/campion/i, /Argentina/);
    pickTeam(/finalist/i, /Maroc/);
    fireEvent.change(screen.getByLabelText(/golgheter/i), {
      target: { value: "Messi" },
    });
    pickTeam(/surpriza/i, /Ecuador/);
    fireEvent.click(screen.getByRole("button", { name: /salv/i }));
    await waitFor(() => expect(screen.getByText(/cal/i)).toBeInTheDocument());
  });
});
