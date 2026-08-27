INSERT INTO "UserRole" ("id", "userId", "role", "createdAt")
SELECT lower(hex(randomblob(16))), "id", "role", CURRENT_TIMESTAMP
FROM "User";
