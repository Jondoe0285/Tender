-- Super User-issued temporary passwords require a change at next sign-in.
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
