-- Extra time no longer affects knockout scoring or display: a result is just
-- the official 120-minute scoreline, and the only manner distinction that
-- matters is decisive vs. drawn → penalties (wentToPens). Drop the now-unused
-- extra-time flag.

ALTER TABLE "Match" DROP COLUMN "wentToEt";
