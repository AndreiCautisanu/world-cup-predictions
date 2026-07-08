import { loadFootballDataMatchesForKoFill } from "../scripts/ko-fill-source";

describe("loadFootballDataMatchesForKoFill", () => {
  it("skips football-data when no API key is configured", async () => {
    const fetcher = jest.fn();

    await expect(loadFootballDataMatchesForKoFill(fetcher, undefined)).resolves.toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
