import { render, screen } from "@testing-library/react";
import { CountdownLock } from "@/components/CountdownLock";

describe("CountdownLock", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders a locked indicator after the lock time has passed", () => {
    jest.setSystemTime(new Date("2026-06-12T17:30:00Z"));
    render(<CountdownLock kickoff={new Date("2026-06-12T18:00:00Z")} />);
    expect(screen.getByText(/blocat/i)).toBeInTheDocument();
  });

  it("renders the time remaining until lock", () => {
    jest.setSystemTime(new Date("2026-06-12T14:15:00Z"));
    render(<CountdownLock kickoff={new Date("2026-06-12T18:00:00Z")} />);
    // 18:00 - 14:15 = 3h 45m. Lock is 1h before kickoff = 17:00, so 17:00 - 14:15 = 2h 45m
    expect(screen.getByText(/2h\s*45m/i)).toBeInTheDocument();
  });
});
