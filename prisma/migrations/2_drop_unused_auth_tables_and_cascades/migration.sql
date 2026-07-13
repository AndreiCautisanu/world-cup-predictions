-- Drop the unused Account/Session/VerificationToken tables (legacy from the
-- earlier DB-session design — the app uses JWT sessions only) and add
-- ON DELETE CASCADE to all User-keyed prediction FKs so user deletion no
-- longer fails on referential integrity.

-- DropForeignKey: Account and Session were FK'd to User.
ALTER TABLE "Account" DROP CONSTRAINT IF EXISTS "Account_userId_fkey";
ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_userId_fkey";

-- DropTable
DROP TABLE IF EXISTS "Account";
DROP TABLE IF EXISTS "Session";
DROP TABLE IF EXISTS "VerificationToken";

-- Swap the User-keyed prediction FKs from RESTRICT to CASCADE.
-- (Match-keyed FK on MatchPrediction also swaps to CASCADE so admin can clean
-- a stray test match without manually wiping predictions first.)

ALTER TABLE "MatchPrediction" DROP CONSTRAINT "MatchPrediction_userId_fkey";
ALTER TABLE "MatchPrediction" ADD CONSTRAINT "MatchPrediction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchPrediction" DROP CONSTRAINT "MatchPrediction_matchId_fkey";
ALTER TABLE "MatchPrediction" ADD CONSTRAINT "MatchPrediction_matchId_fkey"
    FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GroupStandingPrediction" DROP CONSTRAINT "GroupStandingPrediction_userId_fkey";
ALTER TABLE "GroupStandingPrediction" ADD CONSTRAINT "GroupStandingPrediction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BonusPrediction" DROP CONSTRAINT "BonusPrediction_userId_fkey";
ALTER TABLE "BonusPrediction" ADD CONSTRAINT "BonusPrediction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
