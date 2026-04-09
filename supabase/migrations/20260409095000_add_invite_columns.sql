ALTER TABLE public.gala_invites
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS sent_at timestamptz DEFAULT timezone('utc', now());
