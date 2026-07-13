-- Knockout scoring rework: results are now recorded as the official 120-minute
-- scoreline (a draw stays a draw, even when decided on penalties), and the side
-- that progressed is stored separately.
--
-- Match: add "homeAdvanced" (true = home progressed, false = away). For decisive
-- games this is derivable from the score, but a draw→penalties game needs it.
--
-- MatchPrediction: the old "predictsEt"/"predictsPens" flags are replaced by
-- "homeAdvances" — who the user backs to win a shootout, meaningful only when
-- their predicted scoreline is a draw. No knockout match had resolved teams yet,
-- so no real prediction data is lost by dropping the old flags.

ALTER TABLE "Match" ADD COLUMN "homeAdvanced" BOOLEAN;

ALTER TABLE "MatchPrediction" DROP COLUMN "predictsEt";
ALTER TABLE "MatchPrediction" DROP COLUMN "predictsPens";
ALTER TABLE "MatchPrediction" ADD COLUMN "homeAdvances" BOOLEAN;
