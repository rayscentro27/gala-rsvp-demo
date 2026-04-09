DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.gala_guests'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.gala_guests DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.gala_guests
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_reminder_stage text;

DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'gala_guests'
    AND column_name = 'status';

  IF col_type = 'text' THEN
    ALTER TABLE public.gala_guests
      ADD CONSTRAINT gala_guests_status_check
      CHECK (status in ('not_invited', 'invited', 'pending', 'accepted', 'declined', 'waitlisted'));
  END IF;
END $$;

ALTER TABLE public.gala_events
  ADD COLUMN IF NOT EXISTS email_subject_reminder text,
  ADD COLUMN IF NOT EXISTS email_template_reminder text,
  ADD COLUMN IF NOT EXISTS reminder_max_per_stage integer NOT NULL DEFAULT 1;

DROP VIEW IF EXISTS public.gala_event_stats;

CREATE VIEW public.gala_event_stats AS
SELECT
  e.id as event_id,
  count(g.id) filter (where g.status <> 'not_invited' and g.status <> 'waitlisted')::int as invited_count,
  count(g.id) filter (where g.status = 'accepted')::int as accepted_count,
  count(g.id) filter (where g.status = 'declined')::int as declined_count,
  count(g.id) filter (where g.status = 'invited')::int as pending_count,
  count(g.id) filter (where g.status = 'waitlisted')::int as waitlisted_count,
  coalesce(sum(g.seat_count) filter (where g.status = 'accepted'), 0)::int as accepted_seats,
  greatest(e.total_capacity - coalesce(sum(g.seat_count) filter (where g.status = 'accepted'), 0), 0)::int as remaining_seats
FROM public.gala_events e
LEFT JOIN public.gala_guests g on g.event_id = e.id
GROUP BY e.id, e.total_capacity;

CREATE OR REPLACE FUNCTION public.add_guest_to_waitlist(p_guest_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.gala_guests
  SET status = 'waitlisted'
  WHERE id = p_guest_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_guest_from_waitlist(p_guest_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.gala_guests
  SET status = 'not_invited'
  WHERE id = p_guest_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_waitlist_for_event(p_event_id uuid)
RETURNS SETOF public.gala_guests
LANGUAGE sql
AS $$
  SELECT *
  FROM public.gala_guests
  WHERE event_id = p_event_id
    AND status = 'waitlisted'
  ORDER BY created_at ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_email_templates(p_event_id uuid)
RETURNS TABLE (
  tier text,
  subject text,
  html_body text,
  text_body text
)
LANGUAGE sql
AS $$
  SELECT 'founder'::text AS tier,
         e.email_subject_founders AS subject,
         e.email_template_founders AS html_body,
         NULL::text AS text_body
  FROM public.gala_events e
  WHERE e.id = p_event_id
  UNION ALL
  SELECT 'tier1'::text AS tier,
         e.email_subject_tier1 AS subject,
         COALESCE(e.email_template_tier1, e.email_template_default) AS html_body,
         NULL::text AS text_body
  FROM public.gala_events e
  WHERE e.id = p_event_id
  UNION ALL
  SELECT 'tier2'::text AS tier,
         e.email_subject_tier2 AS subject,
         COALESCE(e.email_template_tier2, e.email_template_default) AS html_body,
         NULL::text AS text_body
  FROM public.gala_events e
  WHERE e.id = p_event_id
  UNION ALL
  SELECT 'reminder'::text AS tier,
         e.email_subject_reminder AS subject,
         e.email_template_reminder AS html_body,
         NULL::text AS text_body
  FROM public.gala_events e
  WHERE e.id = p_event_id;
$$;
