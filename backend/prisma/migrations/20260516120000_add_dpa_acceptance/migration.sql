-- CreateTable: dpa_acceptances (GDPR Art. 28 — audit trail for Data Processing Agreements)
-- Required for commercial launch: proves each tenant explicitly accepted the DPA.
CREATE TABLE "dpa_acceptances" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "signer_name" TEXT NOT NULL,
    "signer_email" TEXT NOT NULL,
    "dpa_version" TEXT NOT NULL,
    "document_url" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'click',
    "ip_address" TEXT,
    "user_agent" TEXT,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dpa_acceptances_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "dpa_acceptances" ADD CONSTRAINT "dpa_acceptances_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "dpa_acceptances_tenant_id_idx" ON "dpa_acceptances"("tenant_id");

-- CreateIndex
CREATE INDEX "dpa_acceptances_tenant_id_accepted_at_idx" ON "dpa_acceptances"("tenant_id", "accepted_at");

-- CreateIndex
CREATE INDEX "dpa_acceptances_signer_email_idx" ON "dpa_acceptances"("signer_email");

-- CreateIndex
CREATE INDEX "dpa_acceptances_dpa_version_idx" ON "dpa_acceptances"("dpa_version");
