import { moveInOrder, validateStandingsSelection } from "@/lib/standings";

const groupTeamIds = [10, 11, 12, 13];

describe("validateStandingsSelection", () => {
  it("accepts a selection of all 4 group teams, one per position", () => {
    const result = validateStandingsSelection(
      [
        { position: 1, teamId: 10 },
        { position: 2, teamId: 11 },
        { position: 3, teamId: 12 },
        { position: 4, teamId: 13 },
      ],
      groupTeamIds
    );
    expect(result.ok).toBe(true);
  });

  it("rejects a duplicate team across positions", () => {
    const result = validateStandingsSelection(
      [
        { position: 1, teamId: 10 },
        { position: 2, teamId: 10 },
        { position: 3, teamId: 12 },
        { position: 4, teamId: 13 },
      ],
      groupTeamIds
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a team not in the group", () => {
    const result = validateStandingsSelection(
      [
        { position: 1, teamId: 10 },
        { position: 2, teamId: 11 },
        { position: 3, teamId: 12 },
        { position: 4, teamId: 99 }, // not in group
      ],
      groupTeamIds
    );
    expect(result.ok).toBe(false);
  });

  it("rejects when fewer than 4 positions are submitted", () => {
    const result = validateStandingsSelection(
      [
        { position: 1, teamId: 10 },
        { position: 2, teamId: 11 },
        { position: 3, teamId: 12 },
      ],
      groupTeamIds
    );
    expect(result.ok).toBe(false);
  });

  it("rejects when positions are not the full 1..4 set", () => {
    const result = validateStandingsSelection(
      [
        { position: 1, teamId: 10 },
        { position: 1, teamId: 11 },
        { position: 3, teamId: 12 },
        { position: 4, teamId: 13 },
      ],
      groupTeamIds
    );
    expect(result.ok).toBe(false);
  });
});

describe("moveInOrder", () => {
  it("moves an item forward", () => {
    expect(moveInOrder([10, 11, 12, 13], 0, 2)).toEqual([11, 12, 10, 13]);
  });

  it("moves an item backward", () => {
    expect(moveInOrder([10, 11, 12, 13], 3, 1)).toEqual([10, 13, 11, 12]);
  });

  it("returns the same array when from === to", () => {
    expect(moveInOrder([10, 11, 12, 13], 2, 2)).toEqual([10, 11, 12, 13]);
  });

  it("returns the same array on out-of-bounds indices", () => {
    expect(moveInOrder([10, 11, 12, 13], -1, 2)).toEqual([10, 11, 12, 13]);
    expect(moveInOrder([10, 11, 12, 13], 1, 9)).toEqual([10, 11, 12, 13]);
  });
});
