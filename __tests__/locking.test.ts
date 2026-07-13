import { isMatchLocked, lockTimeFor } from "@/lib/locking";

describe("isMatchLocked", () => {
  const kickoff = new Date("2026-06-12T18:00:00Z");

  it("is not locked when now is more than 1 hour before kickoff", () => {
    const now = new Date("2026-06-12T16:30:00Z");
    expect(isMatchLocked(kickoff, now)).toBe(false);
  });

  it("is locked exactly at 1 hour before kickoff", () => {
    const now = new Date("2026-06-12T17:00:00Z");
    expect(isMatchLocked(kickoff, now)).toBe(true);
  });

  it("is locked after kickoff", () => {
    const now = new Date("2026-06-12T20:00:00Z");
    expect(isMatchLocked(kickoff, now)).toBe(true);
  });
});

describe("lockTimeFor", () => {
  it("returns kickoff minus 1 hour", () => {
    const kickoff = new Date("2026-06-12T18:00:00Z");
    expect(lockTimeFor(kickoff).toISOString()).toBe("2026-06-12T17:00:00.000Z");
  });
});
