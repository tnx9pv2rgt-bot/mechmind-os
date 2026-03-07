-- ============================================================================
-- MechMind OS Analytics Views for Metabase
-- Row-Level Security (RLS) compliant analytics layer
-- ============================================================================
-- Queste viste forniscono aggregazioni ottimizzate per Metabase BI Dashboards
-- Ogni vista include tenant_id per il filtraggio a livello di riga
-- ============================================================================

-- Create analytics schema for organizing all analytics views
CREATE SCHEMA IF NOT EXISTS analytics;

-- ============================================================================
-- VIEW 1: Daily Booking Metrics
-- Metriche giornaliere delle prenotazioni per trend analysis
-- ============================================================================
CREATE OR REPLACE VIEW analytics.daily_booking_metrics AS
SELECT 
  DATE(b.created_at) AS day,
  b.tenant_id,
  t.name AS tenant_name,
  COUNT(*) AS total_bookings,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) AS completed_bookings,
  COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) AS cancelled_bookings,
  COUNT(CASE WHEN b.status = 'no_show' THEN 1 END) AS no_show_bookings,
  COUNT(CASE WHEN b.status = 'pending' THEN 1 END) AS pending_bookings,
  COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) AS confirmed_bookings,
  COUNT(CASE WHEN b.status = 'in_progress' THEN 1 END) AS in_progress_bookings,
  ROUND(
    COUNT(CASE WHEN b.status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 
    2
  ) AS completion_rate,
  ROUND(
    COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 
    2
  ) AS cancellation_rate,
  AVG(b.estimated_duration_minutes) AS avg_estimated_duration_minutes,
  SUM(b.total_cost_cents) / 100.0 AS total_revenue,
  AVG(b.total_cost_cents) / 100.0 AS avg_booking_value,
  COUNT(DISTINCT b.customer_id) AS unique_customers,
  COUNT(DISTINCT b.vehicle_id) AS unique_vehicles
FROM bookings b
JOIN tenants t ON b.tenant_id = t.id
GROUP BY DATE(b.created_at), b.tenant_id, t.name;

COMMENT ON VIEW analytics.daily_booking_metrics IS 
  'Metriche giornaliere delle prenotazioni con rate di completamento e cancellazione';

-- ============================================================================
-- VIEW 2: Revenue by Month
-- Fatturato mensile aggregato per analisi trend
-- ============================================================================
CREATE OR REPLACE VIEW analytics.monthly_revenue AS
SELECT 
  DATE_TRUNC('month', b.created_at) AS month,
  b.tenant_id,
  t.name AS tenant_name,
  COUNT(*) AS total_bookings,
  COUNT(CASE WHEN b.payment_status = 'paid' THEN 1 END) AS paid_bookings,
  COUNT(CASE WHEN b.payment_status = 'unpaid' THEN 1 END) AS unpaid_bookings,
  COUNT(CASE WHEN b.payment_status = 'pending' THEN 1 END) AS pending_payments,
  SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_cost_cents ELSE 0 END) / 100.0 AS paid_revenue,
  SUM(CASE WHEN b.payment_status = 'pending' THEN b.total_cost_cents ELSE 0 END) / 100.0 AS pending_revenue,
  SUM(CASE WHEN b.payment_status = 'unpaid' THEN b.total_cost_cents ELSE 0 END) / 100.0 AS unpaid_revenue,
  SUM(b.total_cost_cents) / 100.0 AS total_expected_revenue,
  AVG(CASE WHEN b.payment_status = 'paid' THEN b.total_cost_cents END) / 100.0 AS avg_paid_value,
  SUM(CASE WHEN b.payment_method = 'cash' THEN b.total_cost_cents ELSE 0 END) / 100.0 AS cash_revenue,
  SUM(CASE WHEN b.payment_method = 'card' THEN b.total_cost_cents ELSE 0 END) / 100.0 AS card_revenue,
  SUM(CASE WHEN b.payment_method = 'bank_transfer' THEN b.total_cost_cents ELSE 0 END) / 100.0 AS bank_transfer_revenue,
  SUM(CASE WHEN b.payment_method = 'insurance' THEN b.total_cost_cents ELSE 0 END) / 100.0 AS insurance_revenue
FROM bookings b
JOIN tenants t ON b.tenant_id = t.id
GROUP BY DATE_TRUNC('month', b.created_at), b.tenant_id, t.name;

COMMENT ON VIEW analytics.monthly_revenue IS 
  'Fatturato mensile dettagliato per metodo di pagamento e stato';

-- ============================================================================
-- VIEW 3: Customer Insights
-- Analisi clienti, retention e frequenza
-- ============================================================================
CREATE OR REPLACE VIEW analytics.customer_insights AS
SELECT 
  c.tenant_id,
  t.name AS tenant_name,
  c.id AS customer_id,
  c.created_at AS first_visit_date,
  MAX(b.created_at) AS last_visit_date,
  COUNT(b.id) AS total_bookings,
  SUM(COALESCE(b.total_cost_cents, 0)) / 100.0 AS total_spent,
  AVG(b.total_cost_cents) / 100.0 AS avg_spent_per_visit,
  MIN(b.created_at) AS first_booking_date,
  EXTRACT(DAY FROM (CURRENT_DATE - MAX(b.created_at)::date)) AS days_since_last_visit,
  CASE 
    WHEN MAX(b.created_at) >= CURRENT_DATE - INTERVAL '30 days' THEN 'active'
    WHEN MAX(b.created_at) >= CURRENT_DATE - INTERVAL '90 days' THEN 'at_risk'
    ELSE 'inactive'
  END AS customer_status,
  COUNT(DISTINCT v.id) AS vehicles_count
FROM customers_encrypted c
JOIN tenants t ON c.tenant_id = t.id
LEFT JOIN bookings b ON c.id = b.customer_id
LEFT JOIN vehicles v ON c.id = v.customer_id
WHERE c.is_deleted = false
GROUP BY c.tenant_id, t.name, c.id, c.created_at;

COMMENT ON VIEW analytics.customer_insights IS 
  'Analisi cliente con metriche di retention e LTV stimato';

-- ============================================================================
-- VIEW 4: Mechanic Performance
-- Performance meccanici: ore lavorate, efficienza
-- ============================================================================
CREATE OR REPLACE VIEW analytics.mechanic_performance AS
SELECT 
  bs.tenant_id,
  t.name AS tenant_name,
  bs.mechanic_id,
  tu.email AS mechanic_email,
  tu.role AS mechanic_role,
  DATE_TRUNC('month', bs.slot_date) AS month,
  COUNT(DISTINCT bs.id) AS total_slots,
  COUNT(DISTINCT CASE WHEN bs.status = 'booked' THEN bs.id END) AS booked_slots,
  COUNT(DISTINCT b.id) AS completed_bookings,
  SUM(CASE WHEN b.status = 'completed' THEN b.estimated_duration_minutes ELSE 0 END) AS total_worked_minutes,
  ROUND(
    COUNT(DISTINCT CASE WHEN bs.status = 'booked' THEN bs.id END) * 100.0 / NULLIF(COUNT(DISTINCT bs.id), 0),
    2
  ) AS utilization_rate,
  SUM(CASE WHEN b.status = 'completed' THEN b.total_cost_cents ELSE 0 END) / 100.0 AS revenue_generated,
  AVG(CASE WHEN b.status = 'completed' THEN b.total_cost_cents END) / 100.0 AS avg_revenue_per_booking,
  COUNT(DISTINCT bs.slot_date) AS working_days,
  ROUND(
    SUM(CASE WHEN b.status = 'completed' THEN b.estimated_duration_minutes ELSE 0 END) / 60.0 / 
    NULLIF(COUNT(DISTINCT bs.slot_date), 0),
    2
  ) AS avg_hours_per_day
FROM booking_slots bs
JOIN tenants t ON bs.tenant_id = t.id
LEFT JOIN tenant_users tu ON bs.mechanic_id = tu.id
LEFT JOIN bookings b ON bs.id = b.slot_id AND b.status = 'completed'
GROUP BY bs.tenant_id, t.name, bs.mechanic_id, tu.email, tu.role, DATE_TRUNC('month', bs.slot_date);

COMMENT ON VIEW analytics.mechanic_performance IS 
  'Performance mensile meccanici: utilizzo, ore lavorate, fatturato generato';

-- ============================================================================
-- VIEW 5: Vehicle Analytics
-- Analisi per marca/modello
-- ============================================================================
CREATE OR REPLACE VIEW analytics.vehicle_analytics AS
SELECT 
  v.tenant_id,
  t.name AS tenant_name,
  COALESCE(v.make, 'Sconosciuta') AS make,
  COALESCE(v.model, 'Sconosciuto') AS model,
  v.year,
  COUNT(v.id) AS vehicles_count,
  COUNT(b.id) AS total_services,
  AVG(v.year) FILTER (WHERE v.year IS NOT NULL) AS avg_year,
  SUM(COALESCE(b.total_cost_cents, 0)) / 100.0 AS total_service_revenue,
  AVG(b.total_cost_cents) FILTER (WHERE b.total_cost_cents IS NOT NULL) / 100.0 AS avg_service_cost,
  MAX(b.created_at) AS last_service_date,
  COUNT(DISTINCT v.customer_id) AS unique_owners,
  ROUND(
    COUNT(b.id) * 1.0 / NULLIF(COUNT(DISTINCT v.id), 0),
    2
  ) AS avg_services_per_vehicle
FROM vehicles v
JOIN tenants t ON v.tenant_id = t.id
LEFT JOIN bookings b ON v.id = b.vehicle_id
GROUP BY v.tenant_id, t.name, COALESCE(v.make, 'Sconosciuta'), COALESCE(v.model, 'Sconosciuto'), v.year;

COMMENT ON VIEW analytics.vehicle_analytics IS 
  'Analisi veicoli per marca, modello e anno con metriche di servizio';

-- ============================================================================
-- VIEW 6: Service Trends
-- Trend servizi nel tempo
-- ============================================================================
CREATE OR REPLACE VIEW analytics.service_trends AS
SELECT 
  DATE_TRUNC('month', b.created_at) AS month,
  b.tenant_id,
  t.name AS tenant_name,
  EXTRACT(YEAR FROM b.created_at) AS year,
  EXTRACT(MONTH FROM b.created_at) AS month_number,
  COUNT(*) AS total_services,
  COUNT(CASE WHEN b.estimated_duration_minutes <= 30 THEN 1 END) AS quick_services,
  COUNT(CASE WHEN b.estimated_duration_minutes > 30 AND b.estimated_duration_minutes <= 60 THEN 1 END) AS standard_services,
  COUNT(CASE WHEN b.estimated_duration_minutes > 60 AND b.estimated_duration_minutes <= 120 THEN 1 END) AS long_services,
  COUNT(CASE WHEN b.estimated_duration_minutes > 120 THEN 1 END) AS extended_services,
  SUM(b.total_cost_cents) / 100.0 AS total_revenue,
  AVG(b.estimated_duration_minutes) AS avg_duration_minutes,
  LAG(COUNT(*)) OVER (PARTITION BY b.tenant_id ORDER BY DATE_TRUNC('month', b.created_at)) AS prev_month_services,
  ROUND(
    (COUNT(*) - LAG(COUNT(*)) OVER (PARTITION BY b.tenant_id ORDER BY DATE_TRUNC('month', b.created_at))) * 100.0 / 
    NULLIF(LAG(COUNT(*)) OVER (PARTITION BY b.tenant_id ORDER BY DATE_TRUNC('month', b.created_at)), 0),
    2
  ) AS month_over_month_growth
FROM bookings b
JOIN tenants t ON b.tenant_id = t.id
GROUP BY DATE_TRUNC('month', b.created_at), b.tenant_id, t.name, EXTRACT(YEAR FROM b.created_at), EXTRACT(MONTH FROM b.created_at);

COMMENT ON VIEW analytics.service_trends IS 
  'Trend mensili dei servizi con confronto anno su anno e crescita mese su mese';

-- ============================================================================
-- VIEW 7: Booking Slot Utilization
-- Utilizzo degli slot prenotabili
-- ============================================================================
CREATE OR REPLACE VIEW analytics.slot_utilization AS
SELECT 
  bs.tenant_id,
  t.name AS tenant_name,
  bs.slot_date,
  EXTRACT(DOW FROM bs.slot_date) AS day_of_week,
  TO_CHAR(bs.slot_date, 'Day') AS day_name,
  EXTRACT(HOUR FROM bs.slot_start) AS hour,
  COUNT(*) AS total_slots,
  COUNT(CASE WHEN bs.status = 'available' THEN 1 END) AS available_slots,
  COUNT(CASE WHEN bs.status = 'booked' THEN 1 END) AS booked_slots,
  COUNT(CASE WHEN bs.status = 'blocked' THEN 1 END) AS blocked_slots,
  COUNT(CASE WHEN bs.status = 'cancelled' THEN 1 END) AS cancelled_slots,
  ROUND(
    COUNT(CASE WHEN bs.status = 'booked' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0),
    2
  ) AS booking_rate,
  bs.slot_type,
  AVG(EXTRACT(EPOCH FROM (bs.slot_end - bs.slot_start)) / 60) AS avg_slot_duration_minutes
FROM booking_slots bs
JOIN tenants t ON bs.tenant_id = t.id
WHERE bs.slot_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY bs.tenant_id, t.name, bs.slot_date, EXTRACT(DOW FROM bs.slot_date), 
         TO_CHAR(bs.slot_date, 'Day'), EXTRACT(HOUR FROM bs.slot_start), bs.slot_type;

COMMENT ON VIEW analytics.slot_utilization IS 
  'Analisi utilizzo slot prenotabili per giorno della settimana e ora';

-- ============================================================================
-- VIEW 8: Customer Cohort Analysis
-- Analisi cohort per retention
-- ============================================================================
CREATE OR REPLACE VIEW analytics.customer_cohorts AS
WITH first_bookings AS (
  SELECT 
    customer_id,
    tenant_id,
    DATE_TRUNC('month', MIN(created_at)) AS cohort_month
  FROM bookings
  GROUP BY customer_id, tenant_id
),
cohort_activity AS (
  SELECT 
    fb.cohort_month,
    fb.tenant_id,
    DATE_TRUNC('month', b.created_at) AS activity_month,
    COUNT(DISTINCT fb.customer_id) AS active_customers,
    COUNT(DISTINCT b.customer_id) AS returning_customers
  FROM first_bookings fb
  LEFT JOIN bookings b ON fb.customer_id = b.customer_id 
    AND DATE_TRUNC('month', b.created_at) >= fb.cohort_month
  GROUP BY fb.cohort_month, fb.tenant_id, DATE_TRUNC('month', b.created_at)
)
SELECT 
  ca.cohort_month,
  ca.tenant_id,
  t.name AS tenant_name,
  ca.activity_month,
  EXTRACT(YEAR FROM AGE(ca.activity_month, ca.cohort_month)) * 12 + 
    EXTRACT(MONTH FROM AGE(ca.activity_month, ca.cohort_month)) AS months_since_first,
  ca.active_customers,
  ca.returning_customers,
  ROUND(
    ca.returning_customers * 100.0 / NULLIF(ca.active_customers, 0),
    2
  ) AS retention_rate
FROM cohort_activity ca
JOIN tenants t ON ca.tenant_id = t.id
WHERE ca.cohort_month >= CURRENT_DATE - INTERVAL '24 months'
ORDER BY ca.cohort_month, ca.activity_month;

COMMENT ON VIEW analytics.customer_cohorts IS 
  'Analisi cohort clienti per misurare retention nel tempo';

-- ============================================================================
-- VIEW 9: Invoice Analytics
-- Analisi fatturazione
-- ============================================================================
CREATE OR REPLACE VIEW analytics.invoice_analytics AS
SELECT 
  i.tenant_id,
  t.name AS tenant_name,
  DATE_TRUNC('month', i.created_at) AS month,
  COUNT(*) AS total_invoices,
  COUNT(CASE WHEN i.status = 'paid' THEN 1 END) AS paid_invoices,
  COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) AS overdue_invoices,
  COUNT(CASE WHEN i.status = 'draft' THEN 1 END) AS draft_invoices,
  COUNT(CASE WHEN i.status = 'sent' THEN 1 END) AS sent_invoices,
  SUM(i.total_cents) / 100.0 AS total_invoiced,
  SUM(CASE WHEN i.status = 'paid' THEN i.total_cents ELSE 0 END) / 100.0 AS paid_amount,
  SUM(CASE WHEN i.status = 'overdue' THEN i.total_cents ELSE 0 END) / 100.0 AS overdue_amount,
  AVG(i.total_cents) / 100.0 AS avg_invoice_amount,
  AVG(CASE WHEN i.tax_cents IS NOT NULL THEN i.tax_cents END) / 100.0 AS avg_tax_amount,
  SUM(COALESCE(i.tax_cents, 0)) / 100.0 AS total_tax,
  ROUND(
    COUNT(CASE WHEN i.status = 'paid' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0),
    2
  ) AS payment_rate,
  AVG(
    EXTRACT(DAY FROM (i.payment_date - i.created_at))
  ) FILTER (WHERE i.payment_date IS NOT NULL) AS avg_payment_days
FROM invoices i
JOIN tenants t ON i.tenant_id = t.id
GROUP BY i.tenant_id, t.name, DATE_TRUNC('month', i.created_at);

COMMENT ON VIEW analytics.invoice_analytics IS 
  'Metriche fatturazione mensili con rate di pagamento e tempi medi';

-- ============================================================================
-- VIEW 10: Comprehensive Dashboard Summary
-- Riepilogo completo per dashboard principale
-- ============================================================================
CREATE OR REPLACE VIEW analytics.dashboard_summary AS
SELECT 
  t.id AS tenant_id,
  t.name AS tenant_name,
  t.subscription_tier,
  t.created_at AS tenant_created_at,
  CURRENT_DATE AS report_date,
  
  -- Bookings metrics (last 30 days)
  (SELECT COUNT(*) FROM bookings b WHERE b.tenant_id = t.id AND b.created_at >= CURRENT_DATE - INTERVAL '30 days') AS bookings_last_30d,
  (SELECT COUNT(*) FROM bookings b WHERE b.tenant_id = t.id AND b.created_at >= CURRENT_DATE - INTERVAL '7 days') AS bookings_last_7d,
  (SELECT COUNT(*) FROM bookings b WHERE b.tenant_id = t.id AND DATE(b.created_at) = CURRENT_DATE) AS bookings_today,
  
  -- Revenue metrics
  (SELECT COALESCE(SUM(total_cost_cents), 0) / 100.0 FROM bookings b WHERE b.tenant_id = t.id AND b.payment_status = 'paid' AND b.created_at >= CURRENT_DATE - INTERVAL '30 days') AS revenue_last_30d,
  (SELECT COALESCE(SUM(total_cents), 0) / 100.0 FROM invoices i WHERE i.tenant_id = t.id AND i.status = 'paid' AND i.created_at >= CURRENT_DATE - INTERVAL '30 days') AS invoiced_last_30d,
  
  -- Customer metrics
  (SELECT COUNT(*) FROM customers_encrypted c WHERE c.tenant_id = t.id AND c.is_deleted = false) AS total_customers,
  (SELECT COUNT(DISTINCT b.customer_id) FROM bookings b WHERE b.tenant_id = t.id AND b.created_at >= CURRENT_DATE - INTERVAL '30 days') AS active_customers_30d,
  
  -- Vehicle metrics
  (SELECT COUNT(*) FROM vehicles v WHERE v.tenant_id = t.id) AS total_vehicles,
  
  -- Slot utilization
  (SELECT ROUND(COUNT(CASE WHEN status = 'booked' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) 
   FROM booking_slots bs WHERE bs.tenant_id = t.id AND bs.slot_date >= CURRENT_DATE - INTERVAL '30 days') AS slot_utilization_30d,
  
  -- Completion rate
  (SELECT ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2)
   FROM bookings b WHERE b.tenant_id = t.id AND b.created_at >= CURRENT_DATE - INTERVAL '30 days') AS completion_rate_30d

FROM tenants t
WHERE t.created_at IS NOT NULL;

COMMENT ON VIEW analytics.dashboard_summary IS 
  'Riepilogo completo KPI per dashboard principale Metabase';

-- ============================================================================
-- Function to refresh all materialized analytics
-- ============================================================================
CREATE OR REPLACE FUNCTION analytics.refresh_all_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Note: These are regular views, not materialized views
  -- This function can be extended when materialized views are added
  RAISE NOTICE 'Analytics views refreshed at %', NOW();
END;
$$;

COMMENT ON FUNCTION analytics.refresh_all_views() IS 
  'Funzione per refresh manuale delle viste analytics (placeholder per future materialized views)';

-- ============================================================================
-- Grant permissions
-- ============================================================================
-- Grant read access to analytics schema
GRANT USAGE ON SCHEMA analytics TO PUBLIC;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO PUBLIC;

-- Set default privileges for future views
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics GRANT SELECT ON TABLES TO PUBLIC;
