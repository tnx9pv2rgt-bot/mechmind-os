-- AddColumns: legal compliance fields for D.Lgs. 206/2005 (Codice del Consumo)
ALTER TABLE "estimates" ADD COLUMN IF NOT EXISTS "customer_signature" TEXT;
ALTER TABLE "estimates" ADD COLUMN IF NOT EXISTS "customer_signed_at" TIMESTAMP(3);
ALTER TABLE "estimates" ADD COLUMN IF NOT EXISTS "terms_accepted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "estimates" ADD COLUMN IF NOT EXISTS "approval_ip_address" TEXT;
