-- Add display-name columns to User. Nullable for backward-compat with
-- accounts created before Section 6 (the existing admin row will fall back
-- to username in UI; can be filled in later via SQL or a profile edit).
ALTER TABLE "User" ADD COLUMN "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN "lastName" TEXT;
