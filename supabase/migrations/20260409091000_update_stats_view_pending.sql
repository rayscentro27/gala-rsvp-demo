drop view if exists public.gala_event_stats;

create view public.gala_event_stats as
select
  e.id as event_id,
  count(g.id) filter (where g.status <> 'not_invited')::int as invited_count,
  count(g.id) filter (where g.status = 'accepted')::int as accepted_count,
  count(g.id) filter (where g.status = 'declined')::int as declined_count,
  count(g.id) filter (where g.status in ('invited', 'pending'))::int as pending_count,
  coalesce(sum(g.seat_count) filter (where g.status = 'accepted'), 0)::int as accepted_seats,
  greatest(e.total_capacity - coalesce(sum(g.seat_count) filter (where g.status = 'accepted'), 0), 0)::int as remaining_seats
from public.gala_events e
left join public.gala_guests g on g.event_id = e.id
group by e.id, e.total_capacity;
