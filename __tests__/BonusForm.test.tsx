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
    expect(screen.getByLabelText(/campion/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/finalist/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/golgheter/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/surpriza/i)).toBeInTheDocument();
  });

  it("filters dark horse options to pots 3 and 4 only", () => {
    render(<BonusForm {...baseProps} />);
    const darkHorseSelect = screen.getByLabelText(/surpriza/i) as HTMLSelectElement;
    const optionValues = Array.from(darkHorseSelect.options)
      .filter((o) => o.value !== "")
      .map((o) => Number(o.value));
    expect(optionValues.sort()).toEqual([5, 6, 7, 8]);
  });

  it("disables inputs and hides save when locked", () => {
    render(<BonusForm {...baseProps} locked={true} />);
    expect(screen.getByLabelText(/campion/i)).toBeDisabled();
    expect(screen.getByLabelText(/finalist/i)).toBeDisabled();
    expect(screen.getByLabelText(/golgheter/i)).toBeDisabled();
    expect(screen.getByLabelText(/surpriza/i)).toBeDisabled();
    expect(screen.queryByRole("button", { name: /salv/i })).not.toBeInTheDocument();
  });

  it("warns when champion equals runner-up and disables save", () => {
    render(<BonusForm {...baseProps} />);
    const champion = screen.getByLabelText(/campion/i) as HTMLSelectElement;
    const runnerUp = screen.getByLabelText(/finalist/i) as HTMLSelectElement;
    fireEvent.change(champion, { target: { value: "1" } });
    fireEvent.change(runnerUp, { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/golgheter/i), {
      target: { value: "Messi" },
    });
    expect(screen.getByText(/diferite/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /salv/i })).toBeDisabled();
  });

  it("posts the bonus prediction on save", async () => {
    render(<BonusForm {...baseProps} />);
    fireEvent.change(screen.getByLabelText(/campion/i), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText(/finalist/i), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText(/golgheter/i), {
      target: { value: "Lionel Messi" },
    });
    fireEvent.change(screen.getByLabelText(/surpriza/i), {
      target: { value: "5" },
    });
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

  it("pre-fills inputs from the initial prop", () => {
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
    expect(
      (screen.getByLabelText(/campion/i) as HTMLSelectElement).value
    ).toBe("2");
    expect(
      (screen.getByLabelText(/finalist/i) as HTMLSelectElement).value
    ).toBe("4");
    expect(
      (screen.getByLabelText(/golgheter/i) as HTMLInputElement).value
    ).toBe("Mbappé");
    expect(
      (screen.getByLabelText(/surpriza/i) as HTMLSelectElement).value
    ).toBe("6");
  });

  it("requires a non-empty top scorer (save disabled if blank)", () => {
    render(<BonusForm {...baseProps} />);
    fireEvent.change(screen.getByLabelText(/campion/i), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText(/finalist/i), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText(/surpriza/i), {
      target: { value: "5" },
    });
    expect(screen.getByRole("button", { name: /salv/i })).toBeDisabled();
  });

  it("shows API error message on failed save", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Calul negru trebuie să fie din urna 3 sau urna 4" }),
    });
    render(<BonusForm {...baseProps} />);
    fireEvent.change(screen.getByLabelText(/campion/i), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText(/finalist/i), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText(/golgheter/i), {
      target: { value: "Messi" },
    });
    fireEvent.change(screen.getByLabelText(/surpriza/i), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salv/i }));
    await waitFor(() =>
      expect(screen.getByText(/cal/i)).toBeInTheDocument()
    );
  });
});
