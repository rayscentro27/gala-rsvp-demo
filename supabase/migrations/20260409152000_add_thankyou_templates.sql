alter table public.gala_events
add column if not exists email_subject_thankyou text,
add column if not exists email_template_thankyou text;

create or replace function public.get_email_templates(p_event_id uuid)
returns table (
  tier text,
  subject text,
  html_body text,
  text_body text
)
language sql
as $$
  select 'founder'::text as tier,
         e.email_subject_founders as subject,
         e.email_template_founders as html_body,
         null::text as text_body
  from public.gala_events e
  where e.id = p_event_id
  union all
  select 'tier1'::text as tier,
         e.email_subject_tier1 as subject,
         coalesce(e.email_template_tier1, e.email_template_default) as html_body,
         null::text as text_body
  from public.gala_events e
  where e.id = p_event_id
  union all
  select 'tier2'::text as tier,
         e.email_subject_tier2 as subject,
         coalesce(e.email_template_tier2, e.email_template_default) as html_body,
         null::text as text_body
  from public.gala_events e
  where e.id = p_event_id
  union all
  select 'reminder'::text as tier,
         e.email_subject_reminder as subject,
         e.email_template_reminder as html_body,
         null::text as text_body
  from public.gala_events e
  where e.id = p_event_id
  union all
  select 'thankyou'::text as tier,
         e.email_subject_thankyou as subject,
         e.email_template_thankyou as html_body,
         null::text as text_body
  from public.gala_events e
  where e.id = p_event_id;
$$;

with target_event as (
  select id
  from public.gala_events
  order by created_at desc
  limit 1
)
update public.gala_events
set
  email_subject_thankyou = 'Thank You for Being Part of {{event_name}}',
  email_template_thankyou = $$
<div style="background: #F9FAFB; padding: 24px 0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 14px; overflow: hidden;">
          <tr>
            <td style="padding: 28px 32px; font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
              <p style="margin: 0 0 16px;">Hi {{full_name}},</p>
              <p style="margin: 0 0 16px;">Thank you for your response regarding <strong>{{event_name}}</strong>. Your RSVP has been recorded.</p>
              <p style="margin: 0 0 24px;">If you need to review your RSVP, you may use the link below.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 24px;">
                <tr>
                  <td bgcolor="#111827" style="border-radius: 8px;">
                    <a href="{{rsvp_link}}" style="display: inline-block; padding: 14px 22px; color: #ffffff; text-decoration: none; font-weight: 600;">Confirm Your Attendance</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 8px; color: #6B7280;">If the button above does not open, please use this link:</p>
              <p style="margin: 0 0 24px;"><a href="{{rsvp_link}}" style="color: #2563EB;">{{rsvp_link}}</a></p>
              <p style="margin: 0;">Warm regards,<br />Gala Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
$$
where id in (select id from target_event);
