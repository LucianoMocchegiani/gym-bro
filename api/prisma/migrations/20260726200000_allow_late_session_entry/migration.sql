-- RN-RES-006 / CU-RES-006: ingreso tardío a sesión iniciada (opt-in del gym).
ALTER TABLE "tenant_settings"
  ADD COLUMN "allow_late_session_entry" BOOLEAN NOT NULL DEFAULT false;
