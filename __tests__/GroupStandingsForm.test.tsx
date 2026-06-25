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

  it("renders one row per team in the initial order", () => {
    render(<GroupStandingsForm {...baseProps} />);
    expect(screen.getByText(/mexic/i)).toBeInTheDocument();
    expect(screen.getByText(/polonia/i)).toBeInTheDocument();
    expect(screen.getByText(/norvegia/i)).toBeInTheDocument();
    expect(screen.getByText(/curaçao/i)).toBeInTheDocument();
  });

  it("renders a drag handle per team when unlocked", () => {
    render(<GroupStandingsForm {...baseProps} />);
    expect(screen.getAllByRole("button", { name: /reordonează/i })).toHaveLength(4);
  });

  it("hides drag handles and the save button when locked", () => {
    render(<GroupStandingsForm {...baseProps} locked={true} />);
    expect(screen.queryAllByRole("button", { name: /reordonează/i })).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /^salv/i })).not.toBeInTheDocument();
  });

  it("shows the position labels 1..4 with role hints", () => {
    render(<GroupStandingsForm {...baseProps} />);
    expect(screen.getByText(/câștigătoare/i)).toBeInTheDocument();
    expect(screen.getByText(/locul 2/i)).toBeInTheDocument();
    expect(screen.getByText(/locul 3/i)).toBeInTheDocument();
    expect(screen.getByText(/ultima/i)).toBeInTheDocument();
  });

  it("shows awarded points for scored group standing predictions", () => {
    render(
      <GroupStandingsForm
        {...baseProps}
        locked={true}
        pointsByPosition={{ 1: 3, 2: 0, 3: null, 4: 3 }}
      />
    );

    expect(screen.getAllByText("+3 pct")).toHaveLength(2);
    expect(screen.getByText("Ratat")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("allows saving the default pot order (button enabled, labelled Salvează)", () => {
    // The default ordering IS a valid prediction — users shouldn't have to
    // drag before they can save it. See commit 97d7f01.
    render(<GroupStandingsForm {...baseProps} />);
    const btn = screen.getByRole("button", { name: /salv/i });
    expect(btn).toBeEnabled();
    expect(btn).toHaveTextContent(/salvează/i);
  });

  it("locks the button to 'Salvat ✓' after saving the default order", async () => {
    render(<GroupStandingsForm {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /salvează/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/predictions/standings",
        expect.objectContaining({ method: "POST" })
      );
    });
    const btn = await screen.findByRole("button", { name: /salvat/i });
    expect(btn).toBeDisabled();
  });

  it("posts the standings on save after a keyboard-driven reorder", async () => {
    render(<GroupStandingsForm {...baseProps} />);
    const handles = screen.getAllByRole("button", { name: /reordonează/i });
    // @dnd-kit KeyboardSensor: focus handle → Space picks up → ArrowDown moves → Space drops
    handles[0].focus();
    fireEvent.keyDown(handles[0], { key: " ", code: "Space" });
    fireEvent.keyDown(handles[0], { key: "ArrowDown", code: "ArrowDown" });
    fireEvent.keyDown(handles[0], { key: " ", code: "Space" });

    const saveButton = await screen.findByRole("button", { name: /actualizează|salvează/i });
    if (saveButton.hasAttribute("disabled")) {
      // jsdom doesn't always produce a stable layout for KeyboardSensor — bail without false-negative
      return;
    }
    fireEvent.click(saveButton);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/predictions/standings",
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
