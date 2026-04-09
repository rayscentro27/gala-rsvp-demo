DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gala_invites_event_id_guest_id_key'
  ) THEN
    ALTER TABLE public.gala_invites
      ADD CONSTRAINT gala_invites_event_id_guest_id_key UNIQUE (event_id, guest_id);
  END IF;
END $$;
