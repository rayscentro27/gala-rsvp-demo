create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.unschedule_gala_progression(target_event_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  job_name text := 'gala-progress-' || target_event_id::text;
begin
  perform cron.unschedule(job_name);
exception
  when others then
    null;
end;
$$;

create or replace function public.schedule_gala_progression(
  target_event_id uuid,
  project_url text,
  anon_key text,
  every_minutes integer default 5
)
returns bigint
language plpgsql
security definer
as $$
declare
  job_name text := 'gala-progress-' || target_event_id::text;
  schedule_text text := format('*/%s * * * *', greatest(every_minutes, 1));
  command_text text;
  job_id bigint;
begin
  perform public.unschedule_gala_progression(target_event_id);

  command_text := format(
    $cmd$
    select net.http_post(
      url := %L,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', %L
      ),
      body := jsonb_build_object('event_id', %L)::text
    );
    $cmd$,
    project_url || '/functions/v1/advance-gala',
    anon_key,
    target_event_id::text
  );

  select cron.schedule(job_name, schedule_text, command_text)
  into job_id;

  return job_id;
end;
$$;
