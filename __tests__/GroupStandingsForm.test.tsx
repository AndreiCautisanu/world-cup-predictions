import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GroupStandingsForm } from "@/components/GroupStandingsForm";

const teams = [
  { id: 1, name: "Mexic", flagEmoji: "🇲🇽" },
  { id: 2, name: "Polonia", flagEmoji: "🇵🇱" },
  { id: 3, name: "Norvegia", flagEmoji: "🇳🇴" },
  { id: 4, name: "Curaçao", flagEmoji: "🇨🇼" },
];

const baseProps = {
  groupId: 7,
  groupName: "A",
  teams,
  initial: { 1: 1, 2: 2, 3: 3, 4: 4 } as Record<1 | 2 | 3 | 4, number>,
  locked: false,
};

describe("GroupStandingsForm", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders one position row per place 1..4", () => {
    render(<GroupStandingsForm {...baseProps} />);
    expect(screen.getAllByRole("combobox")).toHaveLength(4);
  });

  it("disables inputs and hides the save button when locked", () => {
    render(<GroupStandingsForm {...baseProps} locked={true} />);
    screen
      .getAllByRole("combobox")
      .forEach((el) => expect(el).toBeDisabled());
    expect(screen.queryByRole("button", { name: /salv/i })).not.toBeInTheDocument();
  });

  it("shows a uniqueness warning when the same team is picked twice", () => {
    render(<GroupStandingsForm {...baseProps} />);
    const selects = screen.getAllByRole("combobox") as HTMLSelectElement[];
    // Force position 2 to also be team #1
    fireEvent.change(selects[1], { target: { value: "1" } });
    expect(screen.getByText(/echipă/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /salv/i })).toBeDisabled();
  });

  it("posts the standings to /api/predictions/standings on save", async () => {
    render(<GroupStandingsForm {...baseProps} />);
    // dirty by swapping pos 1 and pos 2
    const selects = screen.getAllByRole("combobox") as HTMLSelectElement[];
    fireEvent.change(selects[0], { target: { value: "2" } });
    fireEvent.change(selects[1], { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: /salv/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/predictions/standings",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            groupId: 7,
            standings: [
              { position: 1, teamId: 2 },
              { position: 2, teamId: 1 },
              { position: 3, teamId: 3 },
              { position: 4, teamId: 4 },
            ],
          }),
        })
      );
    });
  });

  it("shows a success state after saving", async () => {
    render(<GroupStandingsForm {...baseProps} />);
    const selects = screen.getAllByRole("combobox") as HTMLSelectElement[];
    fireEvent.change(selects[0], { target: { value: "2" } });
    fireEvent.change(selects[1], { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: /salv/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /salvat/i })).toBeInTheDocument()
    );
  });

  it("shows error message when the API returns a 400", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Selecție invalidă" }),
    });
    render(<GroupStandingsForm {...baseProps} />);
    const selects = screen.getAllByRole("combobox") as HTMLSelectElement[];
    fireEvent.change(selects[0], { target: { value: "2" } });
    fireEvent.change(selects[1], { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: /salv/i }));
    await waitFor(() =>
      expect(screen.getByText(/selecție invalidă/i)).toBeInTheDocument()
    );
  });
});
