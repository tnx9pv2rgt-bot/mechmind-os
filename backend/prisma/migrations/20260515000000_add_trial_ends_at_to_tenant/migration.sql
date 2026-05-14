-- AddColumn: trial_ends_at to Tenant (H13 — Trial 14gg formalizzato)
-- Safe: nullable column, no default, backward-compatible zero-downtime add.
ALTER TABLE "Tenant" ADD COLUMN "trial_ends_at" TIMESTAMP(3);
