ALTER TABLE public.gala_events
  ADD COLUMN IF NOT EXISTS email_subject_founders text,
  ADD COLUMN IF NOT EXISTS email_subject_tier1 text,
  ADD COLUMN IF NOT EXISTS email_subject_tier2 text,
  ADD COLUMN IF NOT EXISTS email_template_tier1 text,
  ADD COLUMN IF NOT EXISTS email_template_tier2 text;
