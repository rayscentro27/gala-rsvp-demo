DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gala_rsvp_tokens_guest_id_key'
  ) THEN
    ALTER TABLE public.gala_rsvp_tokens
      ADD CONSTRAINT gala_rsvp_tokens_guest_id_key UNIQUE (guest_id);
  END IF;
END $$;
