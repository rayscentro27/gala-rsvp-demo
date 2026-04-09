ALTER TABLE public.gala_invites
  ADD COLUMN IF NOT EXISTS token_id uuid;
