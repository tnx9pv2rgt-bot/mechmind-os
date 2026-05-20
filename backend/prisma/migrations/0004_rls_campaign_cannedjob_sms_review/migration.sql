-- RLS Policies for tables missing from 0002_rls_policies
-- Safe: skips tables that don't exist or don't have the tenant column

-- Helper function: applies RLS only if the table AND column exist
CREATE OR REPLACE FUNCTION _create_rls_policy_v2(tbl text, col text DEFAULT 'tenant_id') RETURNS void AS $$
BEGIN
  -- Skip if table does not exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
    RAISE NOTICE 'Table % does not exist, skipping RLS', tbl;
    RETURN;
  END IF;

  -- Skip if column does not exist in the table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = tbl AND column_name = col) THEN
    RAISE NOTICE 'Column % does not exist in table %, skipping RLS', col, tbl;
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = tbl AND policyname = tbl || '_tenant_isolation'
  ) THEN
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (%I = current_setting(''app.current_tenant'', true)::text)',
      tbl || '_tenant_isolation', tbl, col
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply RLS to tables that may have been added after 0002
SELECT _create_rls_policy_v2('campaigns');
SELECT _create_rls_policy_v2('canned_jobs');
SELECT _create_rls_policy_v2('canned_responses');
SELECT _create_rls_policy_v2('sms_threads');
SELECT _create_rls_policy_v2('reviews');
SELECT _create_rls_policy_v2('invoices');
SELECT _create_rls_policy_v2('invoice_items');
SELECT _create_rls_policy_v2('vehicles');
SELECT _create_rls_policy_v2('warranty_records');

-- Child tables (FK-based isolation) — only if tables AND columns exist
DO $$
BEGIN
  -- campaign_recipients via campaign_id -> campaigns
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaign_recipients' AND column_name = 'campaign_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'tenant_id')
  THEN
    ALTER TABLE "campaign_recipients" ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'campaign_recipients' AND policyname = 'campaign_recipients_tenant_isolation'
    ) THEN
      CREATE POLICY campaign_recipients_tenant_isolation ON "campaign_recipients"
        USING ("campaign_id" IN (SELECT id FROM "campaigns" WHERE "tenant_id" = current_setting('app.current_tenant', true)::text));
    END IF;
  END IF;

  -- canned_job_items via canned_job_id -> canned_jobs
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'canned_job_items' AND column_name = 'canned_job_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'canned_jobs' AND column_name = 'tenant_id')
  THEN
    ALTER TABLE "canned_job_items" ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'canned_job_items' AND policyname = 'canned_job_items_tenant_isolation'
    ) THEN
      CREATE POLICY canned_job_items_tenant_isolation ON "canned_job_items"
        USING ("canned_job_id" IN (SELECT id FROM "canned_jobs" WHERE "tenant_id" = current_setting('app.current_tenant', true)::text));
    END IF;
  END IF;

  -- sms_messages via thread_id -> sms_threads
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sms_messages' AND column_name = 'thread_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sms_threads' AND column_name = 'tenant_id')
  THEN
    ALTER TABLE "sms_messages" ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'sms_messages' AND policyname = 'sms_messages_tenant_isolation'
    ) THEN
      CREATE POLICY sms_messages_tenant_isolation ON "sms_messages"
        USING ("thread_id" IN (SELECT id FROM "sms_threads" WHERE "tenant_id" = current_setting('app.current_tenant', true)::text));
    END IF;
  END IF;
END
$$;

-- Cleanup
DROP FUNCTION _create_rls_policy_v2(text, text);
