ALTER TABLE public.gala_events
  ADD COLUMN IF NOT EXISTS founder_guest_limit integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS stage_window_minutes integer NOT NULL DEFAULT 2880,
  ADD COLUMN IF NOT EXISTS email_template_founders text,
  ADD COLUMN IF NOT EXISTS email_template_default text,
  ADD COLUMN IF NOT EXISTS invitations_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS founder_window_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS tier1_window_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS tier2_window_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

ALTER TABLE public.gala_guests
  ADD COLUMN IF NOT EXISTS seat_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS founder_allowance integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS rsvp_at timestamptz;
