import { MANUAL_MATCHUPS } from "../prisma/data/knockout-manual-matchups";

describe("manual knockout matchups", () => {
  it("includes the known quarterfinal fixtures", () => {
    expect(MANUAL_MATCHUPS).toEqual(
      expect.arrayContaining([
        { externalId: "537383", home: "FRA", away: "MAR" },
        { externalId: "537384", home: "ESP", away: "BEL" },
        { externalId: "537385", home: "NOR", away: "ENG" },
        { externalId: "537386", home: "ARG", away: "SUI" },
      ])
    );
  });

  it("includes the known semifinal fixtures", () => {
    expect(MANUAL_MATCHUPS).toEqual(
      expect.arrayContaining([
        { externalId: "537387", home: "FRA", away: "ESP" },
        { externalId: "537388", home: "ENG", away: "ARG" },
      ])
    );
  });
});
