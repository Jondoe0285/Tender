-- AuditLog records must be append-only (SEC-094), except the actorId-to-NULL update
-- issued by the AuditLog_actorId_fkey ON DELETE SET NULL action when an actor account is removed.
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'AuditLog records are append-only';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW."actorId" IS NULL AND OLD."actorId" IS NOT NULL
      AND NEW."id" = OLD."id"
      AND NEW."action" = OLD."action"
      AND NEW."targetType" = OLD."targetType"
      AND NEW."targetId" = OLD."targetId"
      AND NEW."metadata" IS NOT DISTINCT FROM OLD."metadata"
      AND NEW."createdAt" = OLD."createdAt"
    THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'AuditLog records are append-only';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutable
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
