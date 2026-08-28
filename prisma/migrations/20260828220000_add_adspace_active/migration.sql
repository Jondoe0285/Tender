-- AddAdspaceActiveSetting
-- Adds the ADSPACE_ACTIVE platform setting to enable/disable advertising space feature

INSERT INTO "PlatformSetting" (id, key, value, "updatedAt")
VALUES (
  lower(hex(randomblob(12))),
  'ADSPACE_ACTIVE',
  'false',
  CURRENT_TIMESTAMP
)
ON CONFLICT(key) DO NOTHING;
