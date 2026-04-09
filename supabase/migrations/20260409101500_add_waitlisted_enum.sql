DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gala_guest_status') THEN
    ALTER TYPE public.gala_guest_status ADD VALUE IF NOT EXISTS 'waitlisted';
  END IF;
END $$;
