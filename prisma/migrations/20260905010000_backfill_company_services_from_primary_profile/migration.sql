UPDATE "ClientCompany" company
SET "services" = profile."categories"
FROM "RetailerProfile" profile
WHERE profile."userId" = company."primaryUserId"
  AND company."services" = ''
  AND profile."categories" <> '';