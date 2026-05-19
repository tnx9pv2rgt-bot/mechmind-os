-- AddIndex: customer_id on Vehicle (audit fix DD 2026-05-14)
-- Improves query performance for lookups filtering by customerId
-- Example: SELECT * FROM vehicles WHERE customer_id = ?
CREATE INDEX "vehicles_customer_id_idx" ON "vehicles"("customer_id");

-- AddIndex: customer_encrypted_id on Vehicle (audit fix DD 2026-05-14)
-- Improves query performance for lookups filtering by customerEncryptedId
-- Example: SELECT * FROM vehicles WHERE customer_encrypted_id = ?
CREATE INDEX "vehicles_customer_encrypted_id_idx" ON "vehicles"("customer_encrypted_id");
