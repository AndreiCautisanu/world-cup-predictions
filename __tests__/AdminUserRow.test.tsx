import { render, screen } from "@testing-library/react";
import { AdminUserRow } from "@/app/admin/utilizatori/AdminUserRow";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

const baseUser = {
  id: 7,
  username: "andrei_p",
  isAdmin: false,
  createdAt: new Date("2026-01-01").toISOString(),
  predictionCount: 12,
  firstName: "Andrei",
  lastName: "Popescu",
};

describe("AdminUserRow", () => {
  it("pre-fills the first and last name inputs", () => {
    render(<AdminUserRow user={baseUser} />);
    expect(screen.getByDisplayValue("Andrei")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Popescu")).toBeInTheDocument();
  });

  it("renders empty name inputs when names are null", () => {
    render(
      <AdminUserRow user={{ ...baseUser, firstName: null, lastName: null }} />
    );
    expect(screen.getByPlaceholderText("Prenume")).toHaveValue("");
    expect(screen.getByPlaceholderText("Nume")).toHaveValue("");
  });

  it("links to the user's predictions detail page", () => {
    render(<AdminUserRow user={baseUser} />);
    const link = screen.getByRole("link", { name: /pronosticuri/i });
    expect(link).toHaveAttribute("href", "/admin/utilizatori/7");
  });
});
