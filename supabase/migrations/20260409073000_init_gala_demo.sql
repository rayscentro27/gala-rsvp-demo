create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.gala_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  total_capacity integer not null check (total_capacity > 0),
  founder_guest_limit integer not null default 4 check (founder_guest_limit > 0),
  stage_window_minutes integer not null default 2880 check (stage_window_minutes > 0),
  email_template_founders text,
  email_template_default text,
  invitations_started_at timestamptz,
  founder_window_ends_at timestamptz,
  tier1_window_ends_at timestamptz,
  tier2_window_ends_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.gala_guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.gala_events(id) on delete cascade,
  full_name text not null,
  email text not null,
  tier text not null default 'tier1' check (tier in ('founder', 'tier1', 'tier2', 'public')),
  status text not null default 'not_invited' check (status in ('not_invited', 'invited', 'pending', 'accepted', 'declined')),
  seat_count integer not null default 1 check (seat_count >= 0),
  founder_allowance integer not null default 4 check (founder_allowance > 0),
  invited_at timestamptz,
  rsvp_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (event_id, email)
);

create table if not exists public.gala_rsvp_tokens (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.gala_events(id) on delete cascade,
  guest_id uuid not null references public.gala_guests(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz,
  used boolean not null default false,
  used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (guest_id)
);

create table if not exists public.gala_invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.gala_events(id) on delete cascade,
  guest_id uuid not null references public.gala_guests(id) on delete cascade,
  token_id uuid references public.gala_rsvp_tokens(id) on delete set null,
  subject text not null,
  body text not null,
  sent_at timestamptz not null default timezone('utc', now()),
  delivery_status text not null default 'queued' check (delivery_status in ('queued', 'sent', 'opened', 'bounced')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists gala_guests_event_id_idx on public.gala_guests(event_id);
create index if not exists gala_guests_event_id_tier_idx on public.gala_guests(event_id, tier);
create index if not exists gala_invites_event_id_idx on public.gala_invites(event_id);
create index if not exists gala_rsvp_tokens_guest_id_idx on public.gala_rsvp_tokens(guest_id);
create index if not exists gala_rsvp_tokens_token_idx on public.gala_rsvp_tokens(token);

drop view if exists public.gala_event_stats;

create view public.gala_event_stats as
select
  e.id as event_id,
  count(g.id) filter (where g.status <> 'not_invited')::int as invited_count,
  count(g.id) filter (where g.status = 'accepted')::int as accepted_count,
  count(g.id) filter (where g.status = 'declined')::int as declined_count,
  count(g.id) filter (where g.status = 'invited')::int as pending_count,
  coalesce(sum(g.seat_count) filter (where g.status = 'accepted'), 0)::int as accepted_seats,
  greatest(e.total_capacity - coalesce(sum(g.seat_count) filter (where g.status = 'accepted'), 0), 0)::int as remaining_seats
from public.gala_events e
left join public.gala_guests g on g.event_id = e.id
group by e.id, e.total_capacity;

create trigger gala_events_set_updated_at
before update on public.gala_events
for each row
execute function public.set_updated_at();

create trigger gala_guests_set_updated_at
before update on public.gala_guests
for each row
execute function public.set_updated_at();

create trigger gala_rsvp_tokens_set_updated_at
before update on public.gala_rsvp_tokens
for each row
execute function public.set_updated_at();

alter table public.gala_events enable row level security;
alter table public.gala_guests enable row level security;
alter table public.gala_rsvp_tokens enable row level security;
alter table public.gala_invites enable row level security;

create policy "demo gala_events full access"
on public.gala_events
for all
using (true)
with check (true);

create policy "demo gala_guests full access"
on public.gala_guests
for all
using (true)
with check (true);

create policy "demo gala_rsvp_tokens full access"
on public.gala_rsvp_tokens
for all
using (true)
with check (true);

create policy "demo gala_invites full access"
on public.gala_invites
for all
using (true)
with check (true);
