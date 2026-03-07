-- MechMind OS - Analytics Materialized Views
-- Run these migrations to create BI reporting views

-- ==========================================
-- DAILY BOOKING METRICS
-- ==========================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_booking_metrics AS
SELECT 
    tenant_id,
    DATE(scheduled_date) as date,
    COUNT(*) as total_bookings,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_bookings,
    COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_bookings,
    COUNT(CASE WHEN status = 'NO_SHOW' THEN 1 END) as no_show_bookings,
    COUNT(CASE WHEN source = 'VOICE' THEN 1 END) as voice_bookings,
    COUNT(CASE WHEN source = 'WEB' THEN 1 END) as web_bookings,
    COUNT(CASE WHEN source = 'APP' THEN 1 END) as app_bookings,
    AVG(duration_minutes) as avg_duration_minutes,
    COUNT(DISTINCT customer_id) as unique_customers
FROM bookings
GROUP BY tenant_id, DATE(scheduled_date)
WITH DATA;

CREATE UNIQUE INDEX idx_mv_daily_booking_metrics_pk 
ON mv_daily_booking_metrics (tenant_id, date);

CREATE INDEX idx_mv_daily_booking_metrics_date 
ON mv_daily_booking_metrics (date DESC);

-- ==========================================
-- REVENUE ANALYTICS
-- ==========================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_revenue_analytics AS
SELECT 
    b.tenant_id,
    DATE(b.scheduled_date) as date,
    DATE_TRUNC('month', b.scheduled_date) as month,
    SUM(bs.price) as total_revenue,
    COUNT(DISTINCT b.id) as booking_count,
    AVG(bs.price) as avg_revenue_per_booking,
    SUM(CASE WHEN b.status = 'COMPLETED' THEN bs.price ELSE 0 END) as realized_revenue,
    SUM(CASE WHEN b.status = 'CANCELLED' THEN bs.price ELSE 0 END) as lost_revenue
FROM bookings b
JOIN booking_services bs ON b.id = bs.booking_id
WHERE b.status != 'PENDING'
GROUP BY b.tenant_id, DATE(b.scheduled_date), DATE_TRUNC('month', b.scheduled_date)
WITH DATA;

CREATE UNIQUE INDEX idx_mv_revenue_analytics_pk 
ON mv_revenue_analytics (tenant_id, date);

-- ==========================================
-- SERVICE POPULARITY
-- ==========================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_service_popularity AS
SELECT 
    s.tenant_id,
    s.id as service_id,
    s.name as service_name,
    s.category,
    COUNT(bs.id) as times_booked,
    SUM(bs.price) as total_revenue,
    AVG(bs.price) as avg_price,
    COUNT(DISTINCT b.customer_id) as unique_customers,
    DATE_TRUNC('month', b.scheduled_date) as month
FROM services s
JOIN booking_services bs ON s.id = bs.service_id
JOIN bookings b ON bs.booking_id = b.id
WHERE b.status = 'COMPLETED'
GROUP BY s.tenant_id, s.id, s.name, s.category, DATE_TRUNC('month', b.scheduled_date)
WITH DATA;

CREATE INDEX idx_mv_service_popularity_tenant 
ON mv_service_popularity (tenant_id, month DESC);

-- ==========================================
-- CUSTOMER RETENTION
-- ==========================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_customer_retention AS
WITH customer_bookings AS (
    SELECT 
        tenant_id,
        customer_id,
        MIN(scheduled_date) as first_booking,
        MAX(scheduled_date) as last_booking,
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN scheduled_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as bookings_last_30_days,
        COUNT(CASE WHEN scheduled_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as bookings_last_90_days
    FROM bookings
    GROUP BY tenant_id, customer_id
)
SELECT 
    tenant_id,
    COUNT(*) as total_customers,
    COUNT(CASE WHEN bookings_last_30_days > 0 THEN 1 END) as active_customers_30d,
    COUNT(CASE WHEN bookings_last_90_days > 0 THEN 1 END) as active_customers_90d,
    COUNT(CASE WHEN total_bookings = 1 THEN 1 END) as one_time_customers,
    COUNT(CASE WHEN total_bookings > 1 THEN 1 END) as returning_customers,
    AVG(total_bookings) as avg_bookings_per_customer,
    DATE_TRUNC('month', CURRENT_DATE) as month
FROM customer_bookings
GROUP BY tenant_id, DATE_TRUNC('month', CURRENT_DATE)
WITH DATA;

CREATE UNIQUE INDEX idx_mv_customer_retention_pk 
ON mv_customer_retention (tenant_id, month);

-- ==========================================
-- MECHANIC PERFORMANCE
-- ==========================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_mechanic_performance AS
SELECT 
    b.tenant_id,
    b.mechanic_id,
    u.first_name || ' ' || u.last_name as mechanic_name,
    DATE_TRUNC('month', b.scheduled_date) as month,
    COUNT(b.id) as total_bookings,
    COUNT(CASE WHEN b.status = 'COMPLETED' THEN 1 END) as completed_bookings,
    AVG(b.duration_minutes) as avg_job_duration,
    SUM(bs.price) as total_revenue_generated,
    COUNT(CASE WHEN b.status = 'CANCELLED' THEN 1 END) as cancelled_bookings,
    -- Calculate completion rate
    CASE 
        WHEN COUNT(b.id) > 0 
        THEN ROUND(COUNT(CASE WHEN b.status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(b.id), 2)
        ELSE 0 
    END as completion_rate
FROM bookings b
JOIN users u ON b.mechanic_id = u.id
LEFT JOIN booking_services bs ON b.id = bs.booking_id
GROUP BY b.tenant_id, b.mechanic_id, u.first_name, u.last_name, DATE_TRUNC('month', b.scheduled_date)
WITH DATA;

CREATE INDEX idx_mv_mechanic_performance_tenant 
ON mv_mechanic_performance (tenant_id, month DESC);

-- ==========================================
-- INVENTORY STATUS
-- ==========================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_inventory_status AS
SELECT 
    p.tenant_id,
    p.id as part_id,
    p.sku,
    p.name as part_name,
    p.category,
    p.cost_price,
    p.retail_price,
    COALESCE(ii.quantity, 0) as stock_quantity,
    COALESCE(ii.reserved, 0) as reserved_quantity,
    COALESCE(ii.available, 0) as available_quantity,
    p.min_stock_level,
    p.reorder_point,
    s.name as supplier_name,
    CASE 
        WHEN COALESCE(ii.quantity, 0) <= p.min_stock_level THEN 'LOW_STOCK'
        WHEN COALESCE(ii.quantity, 0) <= p.reorder_point THEN 'REORDER'
        ELSE 'OK'
    END as stock_status,
    COALESCE(ii.quantity, 0) * p.cost_price as inventory_value
FROM parts p
LEFT JOIN inventory_items ii ON p.id = ii.part_id
LEFT JOIN suppliers s ON p.supplier_id = s.id
WHERE p.is_active = true
WITH DATA;

CREATE INDEX idx_mv_inventory_status_tenant 
ON mv_inventory_status (tenant_id, stock_status);

-- ==========================================
-- DASHBOARD SUMMARY
-- ==========================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_summary AS
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    -- Booking metrics
    COUNT(DISTINCT b.id) as total_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'COMPLETED' THEN b.id END) as completed_bookings,
    COUNT(DISTINCT CASE WHEN DATE(b.scheduled_date) = CURRENT_DATE THEN b.id END) as today_bookings,
    -- Revenue
    COALESCE(SUM(CASE WHEN b.status = 'COMPLETED' THEN bs.price ELSE 0 END), 0) as total_revenue,
    -- Customers
    COUNT(DISTINCT b.customer_id) as total_customers,
    COUNT(DISTINCT CASE WHEN b.scheduled_date >= CURRENT_DATE - INTERVAL '30 days' THEN b.customer_id END) as active_customers_30d,
    -- Inventory
    (SELECT COUNT(*) FROM parts p WHERE p.tenant_id = t.id AND p.is_active = true) as total_parts,
    (SELECT COUNT(*) FROM mv_inventory_status mvis WHERE mvis.tenant_id = t.id AND mvis.stock_status = 'LOW_STOCK') as low_stock_items,
    -- Inspections
    (SELECT COUNT(*) FROM inspections i WHERE i.tenant_id = t.id AND i.status = 'READY_FOR_CUSTOMER') as pending_inspection_reviews,
    CURRENT_DATE as date
FROM tenants t
LEFT JOIN bookings b ON t.id = b.tenant_id
LEFT JOIN booking_services bs ON b.id = bs.booking_id
GROUP BY t.id, t.name
WITH DATA;

CREATE UNIQUE INDEX idx_mv_dashboard_summary_pk 
ON mv_dashboard_summary (tenant_id, date);

-- ==========================================
-- REFRESH FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_booking_metrics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_revenue_analytics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_service_popularity;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_retention;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_mechanic_performance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inventory_status;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_summary;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh (requires pg_cron extension)
-- SELECT cron.schedule('refresh-analytics', '0 */6 * * *', 'SELECT refresh_analytics_views()');
