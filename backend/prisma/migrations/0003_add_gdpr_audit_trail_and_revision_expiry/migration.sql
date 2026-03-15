-- AlterTable: add GDPR audit trail fields to customers
ALTER TABLE "customers" ADD COLUMN "gdpr_privacy_version" TEXT DEFAULT '2.0';
ALTER TABLE "customers" ADD COLUMN "gdpr_consent_method" TEXT DEFAULT 'form-checkbox';
ALTER TABLE "customers" ADD COLUMN "marketing_consent_at" TIMESTAMP(3);

-- AlterTable: add revision expiry to vehicles
ALTER TABLE "vehicles" ADD COLUMN "revision_expiry" TIMESTAMP(3);
