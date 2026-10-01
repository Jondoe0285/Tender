-- Device-bound mobile refresh tokens for optional biometric login. The hash is stored; the token is not.
CREATE TABLE "MobileDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "authVersion" INTEGER NOT NULL,
    "biometricEnabled" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MobileDevice_refreshTokenHash_key" ON "MobileDevice"("refreshTokenHash");
CREATE INDEX "MobileDevice_userId_revokedAt_idx" ON "MobileDevice"("userId", "revokedAt");

ALTER TABLE "MobileDevice" ADD CONSTRAINT "MobileDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
