-- Migration: Advisory Lock Utilities
-- Implements P0 FIX #3: Advisory Lock Deadlock Prevention
-- Validation: https://www.postgresql.org/docs/current/explicit-locking.html

-- Function to acquire advisory lock with timeout
CREATE OR REPLACE FUNCTION acquire_booking_lock_with_timeout(
    p_tenant_id UUID,
    p_slot_id UUID,
    p_timeout_seconds INTEGER DEFAULT 5
) RETURNS BOOLEAN AS $$
DECLARE
    v_lock_id BIGINT;
    v_start_time TIMESTAMP;
BEGIN
    v_start_time := clock_timestamp();
    
    -- Generate lock ID using bit-shifting: (tenant_id << 32) | slot_id
    v_lock_id := (
        (('x' || substr(md5(p_tenant_id::text), 1, 8))::bit(32)::bigint) << 32
        |
        (('x' || substr(md5(p_slot_id::text), 1, 8))::bit(32)::bigint)
    )::bigint;
    
    -- Try to acquire lock with timeout
    WHILE clock_timestamp() - v_start_time < (p_timeout_seconds || ' seconds')::interval LOOP
        IF pg_try_advisory_lock(v_lock_id) THEN
            RETURN TRUE;
        END IF;
        
        -- Wait 100ms before retry
        PERFORM pg_sleep(0.1);
    END LOOP;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to release advisory lock
CREATE OR REPLACE FUNCTION release_booking_lock(
    p_tenant_id UUID,
    p_slot_id UUID
) RETURNS VOID AS $$
DECLARE
    v_lock_id BIGINT;
BEGIN
    -- Generate lock ID using same formula
    v_lock_id := (
        (('x' || substr(md5(p_tenant_id::text), 1, 8))::bit(32)::bigint) << 32
        |
        (('x' || substr(md5(p_slot_id::text), 1, 8))::bit(32)::bigint)
    )::bigint;
    
    PERFORM pg_advisory_unlock(v_lock_id);
END;
$$ LANGUAGE plpgsql;

-- Function to check if lock is held
CREATE OR REPLACE FUNCTION is_booking_lock_held(
    p_tenant_id UUID,
    p_slot_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_lock_id BIGINT;
BEGIN
    v_lock_id := (
        (('x' || substr(md5(p_tenant_id::text), 1, 8))::bit(32)::bigint) << 32
        |
        (('x' || substr(md5(p_slot_id::text), 1, 8))::bit(32)::bigint)
    )::bigint;
    
    RETURN EXISTS(
        SELECT 1 FROM pg_locks 
        WHERE locktype = 'advisory' 
        AND objid = v_lock_id
        AND granted = TRUE
    );
END;
$$ LANGUAGE plpgsql;

-- Create index for monitoring advisory locks
CREATE INDEX IF NOT EXISTS idx_pg_locks_advisory ON pg_locks(locktype) WHERE locktype = 'advisory';

-- Comment explaining lock key design
COMMENT ON FUNCTION acquire_booking_lock_with_timeout IS 
'Acquires advisory lock using bit-shifted key: (tenant_hash << 32) | slot_hash.
This prevents collisions between tenants and enables debugging.
Validation: https://www.postgresql.org/docs/current/explicit-locking.html';
