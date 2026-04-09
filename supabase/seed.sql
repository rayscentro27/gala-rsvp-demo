insert into public.gala_events (
  id,
  name,
  total_capacity,
  founder_guest_limit,
  stage_window_minutes,
  email_subject_founders,
  email_subject_tier1,
  email_subject_tier2,
  email_template_founders,
  email_template_default,
  email_template_tier1,
  email_template_tier2
)
values (
  '11111111-1111-1111-1111-111111111111',
  'Spring Gala Demo',
  180,
  4,
  30,
  'You’re Invited — Priority Access to {{event_name}}',
  'You’re Invited to {{event_name}}',
  'Final Invitation — {{event_name}}',
  E'<div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px;">\n  <p style="margin: 0 0 16px;">Hi {{full_name}},</p>\n  <p style="margin: 0 0 16px;">We’d love to personally invite you to <strong>{{event_name}}</strong>.</p>\n  <p style="margin: 0 0 16px;">As one of our selected <strong>Ambassadors</strong>, you have early access to reserve your spot before invitations are opened to others.</p>\n  <p style="margin: 0 0 24px;">Please let us know as soon as possible if you’ll be attending.</p>\n  <div style="margin: 0 0 24px;">\n    <a href="{{rsvp_link}}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 14px 22px; border-radius: 8px; font-weight: 600;">Confirm Your Attendance</a>\n  </div>\n  <p style="margin: 0 0 8px; color: #4b5563;">If the button above does not open, please use this link:</p>\n  <p style="margin: 0 0 24px;"><a href="{{rsvp_link}}" style="color: #2563eb;">{{rsvp_link}}</a></p>\n  <p style="margin: 0;">Warm regards,<br />Gala Team</p>\n</div>',
  E'<div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px;">\n  <p style="margin: 0 0 16px;">Hi {{full_name}},</p>\n  <p style="margin: 0 0 16px;">You’re invited to join us for <strong>{{event_name}}</strong>.</p>\n  <p style="margin: 0 0 16px;">We’d be delighted to have you attend.</p>\n  <p style="margin: 0 0 24px;">Please let us know as soon as possible if you’ll be joining us so we can plan accordingly.</p>\n  <div style="margin: 0 0 24px;">\n    <a href="{{rsvp_link}}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 14px 22px; border-radius: 8px; font-weight: 600;">Confirm Your Attendance</a>\n  </div>\n  <p style="margin: 0 0 8px; color: #4b5563;">If the button above does not open, please use this link:</p>\n  <p style="margin: 0 0 24px;"><a href="{{rsvp_link}}" style="color: #2563eb;">{{rsvp_link}}</a></p>\n  <p style="margin: 0;">Best regards,<br />Gala Team</p>\n</div>',
  E'<div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px;">\n  <p style="margin: 0 0 16px;">Hi {{full_name}},</p>\n  <p style="margin: 0 0 16px;">You’re invited to join us for <strong>{{event_name}}</strong>.</p>\n  <p style="margin: 0 0 16px;">We’d be delighted to have you attend.</p>\n  <p style="margin: 0 0 24px;">Please let us know as soon as possible if you’ll be joining us so we can plan accordingly.</p>\n  <div style="margin: 0 0 24px;">\n    <a href="{{rsvp_link}}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 14px 22px; border-radius: 8px; font-weight: 600;">Confirm Your Attendance</a>\n  </div>\n  <p style="margin: 0 0 8px; color: #4b5563;">If the button above does not open, please use this link:</p>\n  <p style="margin: 0 0 24px;"><a href="{{rsvp_link}}" style="color: #2563eb;">{{rsvp_link}}</a></p>\n  <p style="margin: 0;">Best regards,<br />Gala Team</p>\n</div>',
  E'<div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px;">\n  <p style="margin: 0 0 16px;">Hi {{full_name}},</p>\n  <p style="margin: 0 0 16px;">We’re reaching out with a final opportunity to attend <strong>{{event_name}}</strong>.</p>\n  <p style="margin: 0 0 16px;">If you’d like to join us, please confirm your attendance as soon as possible so we can finalize arrangements.</p>\n  <div style="margin: 0 0 24px;">\n    <a href="{{rsvp_link}}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 14px 22px; border-radius: 8px; font-weight: 600;">Confirm Your Attendance</a>\n  </div>\n  <p style="margin: 0 0 8px; color: #4b5563;">If the button above does not open, please use this link:</p>\n  <p style="margin: 0 0 24px;"><a href="{{rsvp_link}}" style="color: #2563eb;">{{rsvp_link}}</a></p>\n  <p style="margin: 0;">Best regards,<br />Gala Team</p>\n</div>'
)
on conflict (id) do update
set
  name = excluded.name,
  total_capacity = excluded.total_capacity,
  founder_guest_limit = excluded.founder_guest_limit,
  stage_window_minutes = excluded.stage_window_minutes,
  email_subject_founders = excluded.email_subject_founders,
  email_subject_tier1 = excluded.email_subject_tier1,
  email_subject_tier2 = excluded.email_subject_tier2,
  email_template_founders = excluded.email_template_founders,
  email_template_default = excluded.email_template_default,
  email_template_tier1 = excluded.email_template_tier1,
  email_template_tier2 = excluded.email_template_tier2;

insert into public.gala_guests (event_id, full_name, email, tier, status, founder_allowance)
values
  ('11111111-1111-1111-1111-111111111111', 'Avery Stone', 'avery@example.com', 'founder', 'not_invited', 4),
  ('11111111-1111-1111-1111-111111111111', 'Jordan Kim', 'jordan@example.com', 'founder', 'not_invited', 4),
  ('11111111-1111-1111-1111-111111111111', 'Riley Brooks', 'riley@example.com', 'tier1', 'not_invited', 4),
  ('11111111-1111-1111-1111-111111111111', 'Morgan Diaz', 'morgan@example.com', 'tier1', 'not_invited', 4),
  ('11111111-1111-1111-1111-111111111111', 'Taylor Chen', 'taylor@example.com', 'tier2', 'not_invited', 4),
  ('11111111-1111-1111-1111-111111111111', 'Casey Patel', 'casey@example.com', 'public', 'not_invited', 4)
on conflict (event_id, email) do update
set
  full_name = excluded.full_name,
  tier = excluded.tier,
  status = excluded.status,
  founder_allowance = excluded.founder_allowance;
