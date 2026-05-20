-- Add IN_APP value to NotificationChannel enum if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'IN_APP'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationChannel')
  ) THEN
    ALTER TYPE "NotificationChannel" ADD VALUE 'IN_APP';
  END IF;
END$$;
