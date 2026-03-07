-- ============================================================================
-- MechMind OS v10 - Exclusion Constraints & Advisory Locks
-- Race Condition Prevention for Booking System
-- ============================================================================

-- Ensure btree_gist extension is available for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================================
-- EXCLUSION CONSTRAINTS - Prevent Double Bookings
-- ============================================================================

-- Drop existing constraint if it exists (for idempotency)
ALTER TABLE booking_slots
  DROP CONSTRAINT IF EXISTS no_overlapping_slots;

-- Add exclusion constraint to prevent overlapping slots for same mechanic
-- This ensures no mechanic can have two bookings at the same time
ALTER TABLE booking_slots
  ADD CONSTRAINT no_overlapping_slots
  EXCLUDE USING GIST (
    tenant_id WITH =,
    mechanic_id WITH =,
    slot_date WITH =,
    tsrange(slot_start::time, slot_end::time) WITH &&
  )
  WHERE (status != 'cancelled');

-- ============================================================================
-- ADVISORY LOCK FUNCTIONS - Distributed Locking
-- ============================================================================

-- Function to acquire advisory lock for booking operation
-- Uses a composite key: tenant_id (high bits) + slot_id (low bits)
CREATE OR REPLACE FUNCTION acquire_booking_lock(
  p_tenant_id UUID,
  p_slot_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_lock_key BIGINT;
BEGIN
  -- Create a unique lock key from tenant_id and slot_id
  -- Using the first 8 bytes of each UUID XORed together
  v_lock_key := (
    ('x' || substr(p_tenant_id::text, 1, 16))::bit(64)::bigint #
    ('x' || substr(p_slot_id::text, 1, 16))::bit(64)::bigint
  );
  
  -- Try to acquire lock (non-blocking)
  RETURN pg_try_advisory_lock(v_lock_key);
END;
$$ LANGUAGE plpgsql;

-- Function to release advisory lock
CREATE OR REPLACE FUNCTION release_booking_lock(
  p_tenant_id UUID,
  p_slot_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_lock_key BIGINT;
BEGIN
  v_lock_key := (
    ('x' || substr(p_tenant_id::text, 1, 16))::bit(64)::bigint #
    ('x' || substr(p_slot_id::text, 1, 16))::bit(64)::bigint
  );
  
  RETURN pg_advisory_unlock(v_lock_key);
END;
$$ LANGUAGE plpgsql;

-- Function to acquire lock with timeout (blocking with timeout)
CREATE OR REPLACE FUNCTION acquire_booking_lock_with_timeout(
  p_tenant_id UUID,
  p_slot_id UUID,
  p_timeout_seconds INTEGER DEFAULT 5
) RETURNS BOOLEAN AS $$
DECLARE
  v_lock_key BIGINT;
  v_start_time TIMESTAMP;
BEGIN
  v_lock_key := (
    ('x' || substr(p_tenant_id::text, 1, 16))::bit(64)::bigint #
    ('x' || substr(p_slot_id::text, 1, 16))::bit(64)::bigint
  );
  
  v_start_time := clock_timestamp();
  
  -- Try to acquire lock with timeout
  WHILE clock_timestamp() - v_start_time < (p_timeout_seconds || ' seconds')::INTERVAL LOOP
    IF pg_try_advisory_lock(v_lock_key) THEN
      RETURN TRUE;
    END IF;
    -- Small delay before retry
    PERFORM pg_sleep(0.01);
  END LOOP;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- BOOKING TRANSACTION FUNCTIONS
-- ============================================================================

-- Function to book a slot with proper locking
CREATE OR REPLACE FUNCTION book_slot_with_lock(
  p_tenant_id UUID,
  p_slot_id UUID,
  p_customer_id UUID,
  p_vehicle_id UUID DEFAULT NULL,
  p_estimated_duration_minutes INTEGER DEFAULT 60
) RETURNS TABLE (
  booking_id UUID,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_booking_id UUID;
  v_slot_status VARCHAR(50);
  v_lock_acquired BOOLEAN;
BEGIN
  -- Try to acquire lock
  v_lock_acquired := acquire_booking_lock_with_timeout(p_tenant_id, p_slot_id, 5);
  
  IF NOT v_lock_acquired THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Could not acquire lock - slot is being booked by another user';
    RETURN;
  END IF;
  
  BEGIN
    -- Check slot availability with SERIALIZABLE isolation
    SET LOCAL TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    
    SELECT status INTO v_slot_status
    FROM booking_slots
    WHERE id = p_slot_id
      AND tenant_id = p_tenant_id
    FOR UPDATE;
    
    IF v_slot_status IS NULL THEN
      RETURN QUERY SELECT NULL::UUID, FALSE, 'Slot not found';
      RETURN;
    END IF;
    
    IF v_slot_status != 'available' THEN
      RETURN QUERY SELECT NULL::UUID, FALSE, 'Slot is no longer available';
      RETURN;
    END IF;
    
    -- Create booking
    INSERT INTO bookings (
      tenant_id,
      slot_id,
      customer_id,
      vehicle_id,
      estimated_duration_minutes,
      status
    ) VALUES (
      p_tenant_id,
      p_slot_id,
      p_customer_id,
      p_vehicle_id,
      p_estimated_duration_minutes,
      'confirmed'
    )
    RETURNING bookings.id INTO v_booking_id;
    
    -- Update slot status
    UPDATE booking_slots
    SET status = 'booked', updated_at = NOW()
    WHERE id = p_slot_id;
    
    -- Create booking event
    INSERT INTO booking_events (
      tenant_id,
      slot_id,
      event_type,
      event_data
    ) VALUES (
      p_tenant_id,
      p_slot_id,
      'BOOKING_CREATED',
      jsonb_build_object(
        'booking_id', v_booking_id,
        'customer_id', p_customer_id,
        'vehicle_id', p_vehicle_id,
        'timestamp', NOW()
      )
    );
    
    -- Release lock
    PERFORM release_booking_lock(p_tenant_id, p_slot_id);
    
    RETURN QUERY SELECT v_booking_id, TRUE, 'Booking created successfully';
    
  EXCEPTION
    WHEN serialization_failure THEN
      PERFORM release_booking_lock(p_tenant_id, p_slot_id);
      RETURN QUERY SELECT NULL::UUID, FALSE, 'Transaction conflict - please retry';
    WHEN OTHERS THEN
      PERFORM release_booking_lock(p_tenant_id, p_slot_id);
      RETURN QUERY SELECT NULL::UUID, FALSE, SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql;

-- Function to cancel booking with lock
CREATE OR REPLACE FUNCTION cancel_booking_with_lock(
  p_tenant_id UUID,
  p_booking_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_slot_id UUID;
  v_lock_acquired BOOLEAN;
BEGIN
  -- Get slot ID
  SELECT slot_id INTO v_slot_id
  FROM bookings
  WHERE id = p_booking_id
    AND tenant_id = p_tenant_id;
  
  IF v_slot_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Booking not found';
    RETURN;
  END IF;
  
  -- Try to acquire lock
  v_lock_acquired := acquire_booking_lock_with_timeout(p_tenant_id, v_slot_id, 5);
  
  IF NOT v_lock_acquired THEN
    RETURN QUERY SELECT FALSE, 'Could not acquire lock - booking is being modified';
    RETURN;
  END IF;
  
  BEGIN
    SET LOCAL TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    
    -- Update booking status
    UPDATE bookings
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = p_booking_id
      AND tenant_id = p_tenant_id;
    
    -- Release slot
    UPDATE booking_slots
    SET status = 'available', updated_at = NOW()
    WHERE id = v_slot_id
      AND tenant_id = p_tenant_id;
    
    -- Create cancellation event
    INSERT INTO booking_events (
      tenant_id,
      slot_id,
      event_type,
      event_data
    ) VALUES (
      p_tenant_id,
      v_slot_id,
      'BOOKING_CANCELLED',
      jsonb_build_object(
        'booking_id', p_booking_id,
        'reason', p_reason,
        'timestamp', NOW()
      )
    );
    
    PERFORM release_booking_lock(p_tenant_id, v_slot_id);
    
    RETURN QUERY SELECT TRUE, 'Booking cancelled successfully';
    
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM release_booking_lock(p_tenant_id, v_slot_id);
      RETURN QUERY SELECT FALSE, SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SLOT AVAILABILITY CHECKS
-- ============================================================================

-- Function to check slot availability (for AI voice booking)
CREATE OR REPLACE FUNCTION check_slot_availability(
  p_tenant_id UUID,
  p_mechanic_id UUID,
  p_slot_date DATE,
  p_slot_start TIME,
  p_slot_end TIME
) RETURNS TABLE (
  available BOOLEAN,
  conflicting_slot_id UUID,
  message TEXT
) AS $$
DECLARE
  v_conflicting_id UUID;
BEGIN
  -- Check for overlapping slots
  SELECT bs.id INTO v_conflicting_id
  FROM booking_slots bs
  WHERE bs.tenant_id = p_tenant_id
    AND bs.mechanic_id = p_mechanic_id
    AND bs.slot_date = p_slot_date
    AND bs.status IN ('available', 'booked')
    AND tsrange(bs.slot_start::time, bs.slot_end::time) && tsrange(p_slot_start, p_slot_end)
  LIMIT 1;
  
  IF v_conflicting_id IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, v_conflicting_id, 'Time slot overlaps with existing booking';
  ELSE
    RETURN QUERY SELECT TRUE, NULL::UUID, 'Slot is available';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CLEANUP FUNCTIONS
-- ============================================================================

-- Function to release all advisory locks for current session
CREATE OR REPLACE FUNCTION release_all_booking_locks()
RETURNS INTEGER AS $$
DECLARE
  v_released_count INTEGER;
BEGIN
  SELECT count(*) INTO v_released_count
  FROM pg_locks
  WHERE locktype = 'advisory'
    AND pid = pg_backend_pid();
  
  PERFORM pg_advisory_unlock_all();
  
  RETURN v_released_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON CONSTRAINT no_overlapping_slots ON booking_slots IS 
  'Prevents double-booking by ensuring no overlapping time ranges for the same mechanic';

COMMENT ON FUNCTION book_slot_with_lock IS 
  'Creates a booking with advisory lock and SERIALIZABLE isolation to prevent race conditions';

COMMENT ON FUNCTION cancel_booking_with_lock IS 
  'Cancels a booking with advisory lock to prevent concurrent modifications';

COMMENT ON FUNCTION check_slot_availability IS 
  'Checks if a time slot is available for booking (used by AI voice booking)';
