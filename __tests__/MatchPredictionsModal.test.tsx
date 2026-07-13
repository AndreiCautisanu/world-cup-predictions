import { render, screen, waitFor } from "@testing-library/react";
import { MatchPredictionsModal } from "@/components/MatchPredictionsModal";

const boardResponse = {
  match: {
    id: 1,
    round: "R16",
    status: "FINISHED",
    homeTeam: { name: "Coreea", flagEmoji: "🇰🇷" },
    awayTeam: { name: "Cehia", flagEmoji: "🇨🇿" },
    final: true,
    homeScore: 2,
    awayScore: 1,
    wentToPens: false,
    homeAdvanced: null,
  },
  participants: [
    { displayName: "Ana", isMe: true, homeScore: 2, awayScore: 1, homeAdvances: null, pointsAwarded: 10 },
    { displayName: "Bob", isMe: false, homeScore: 1, awayScore: 1, homeAdvances: false, pointsAwarded: 0 },
    { displayName: "Cici", isMe: false, homeScore: 0, awayScore: 2, homeAdvances: null, pointsAwarded: 0 },
  ],
};

describe("MatchPredictionsModal", () => {
  afterEach(() => jest.restoreAllMocks());

  it("renders the columns with result, a 'tu' marker and a KO draw badge", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => boardResponse });

    render(<MatchPredictionsModal matchId={1} round="R16" onClose={() => {}} />);

    await waitFor(() => expect(screen.getByText("Ana")).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith("/api/matches/1/predictions");
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Cici")).toBeInTheDocument();
    expect(screen.getByText(/2\s*–\s*1/)).toBeInTheDocument();
    expect(screen.getByText("tu")).toBeInTheDocument();
    expect(screen.getByText("pen")).toBeInTheDocument();
  });

  it("shows an error state when the fetch fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });

    render(<MatchPredictionsModal matchId={1} round="R16" onClose={() => {}} />);

    await waitFor(() =>
      expect(screen.getByText("Nu s-au putut încărca pronosticurile.")).toBeInTheDocument()
    );
  });
});
