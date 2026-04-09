ALTER TABLE public.gala_rsvp_tokens
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS used boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS used_at timestamptz;
