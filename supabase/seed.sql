insert into public.gala_events (
  id,
  name,
  total_capacity,
  founder_guest_limit,
  stage_window_minutes,
  email_subject_founders,
  email_subject_tier1,
  email_subject_tier2,
  email_subject_reminder,
  email_template_founders,
  email_template_default,
  email_template_tier1,
  email_template_tier2,
  email_template_reminder,
  reminder_max_per_stage
)
values (
  '11111111-1111-1111-1111-111111111111',
  'Spring Gala Demo',
  180,
  4,
  30,
  'You''re Invited — Priority Access to {{event_name}}',
  'You''re Invited to {{event_name}}',
  'Final Invitation — {{event_name}}',
  'Reminder — Please Confirm Your Attendance',
  E'<div style="background: #F9FAFB; padding: 24px 0;">\n  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">\n    <tr>\n      <td align="center">\n        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 14px; overflow: hidden;">\n          <tr>\n            <td style="padding: 28px 32px; font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">\n              <p style="margin: 0 0 16px;">Hi {{full_name}},</p>\n              <p style="margin: 0 0 16px;">We would love to personally invite you to <strong>{{event_name}}</strong>.</p>\n              <p style="margin: 0 0 16px;">As one of our selected <strong>Ambassadors</strong>, you have early access to reserve your spot before invitations open to others.</p>\n              <p style="margin: 0 0 24px;">Please let us know as soon as possible if you will be attending.</p>\n              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 24px;">\n                <tr>\n                  <td bgcolor="#111827" style="border-radius: 8px;">\n                    <a href="{{rsvp_link}}" style="display: inline-block; padding: 14px 22px; color: #ffffff; text-decoration: none; font-weight: 600;">Confirm Your Attendance</a>\n                  </td>\n                </tr>\n              </table>\n              <p style="margin: 0 0 8px; color: #6B7280;">If the button above does not open, please use this link:</p>\n              <p style="margin: 0 0 24px;"><a href="{{rsvp_link}}" style="color: #2563EB;">{{rsvp_link}}</a></p>\n              <p style="margin: 0;">Warm regards,<br />Gala Team</p>\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n</div>',
  E'<div style="background: #F9FAFB; padding: 24px 0;">\n  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">\n    <tr>\n      <td align="center">\n        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 14px; overflow: hidden;">\n          <tr>\n            <td style="padding: 28px 32px; font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">\n              <p style="margin: 0 0 16px;">Hi {{full_name}},</p>\n              <p style="margin: 0 0 16px;">You are invited to join us for <strong>{{event_name}}</strong>.</p>\n              <p style="margin: 0 0 16px;">We would be delighted to have you attend.</p>\n              <p style="margin: 0 0 24px;">Please let us know as soon as possible if you will be joining us so we can plan accordingly.</p>\n              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 24px;">\n                <tr>\n                  <td bgcolor="#111827" style="border-radius: 8px;">\n                    <a href="{{rsvp_link}}" style="display: inline-block; padding: 14px 22px; color: #ffffff; text-decoration: none; font-weight: 600;">Confirm Your Attendance</a>\n                  </td>\n                </tr>\n              </table>\n              <p style="margin: 0 0 8px; color: #6B7280;">If the button above does not open, please use this link:</p>\n              <p style="margin: 0 0 24px;"><a href="{{rsvp_link}}" style="color: #2563EB;">{{rsvp_link}}</a></p>\n              <p style="margin: 0;">Best regards,<br />Gala Team</p>\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n</div>',
  E'<div style="background: #F9FAFB; padding: 24px 0;">\n  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">\n    <tr>\n      <td align="center">\n        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 14px; overflow: hidden;">\n          <tr>\n            <td style="padding: 28px 32px; font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">\n              <p style="margin: 0 0 16px;">Hi {{full_name}},</p>\n              <p style="margin: 0 0 16px;">You are invited to join us for <strong>{{event_name}}</strong>.</p>\n              <p style="margin: 0 0 16px;">We would be delighted to have you attend.</p>\n              <p style="margin: 0 0 24px;">Please let us know as soon as possible if you will be joining us so we can plan accordingly.</p>\n              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 24px;">\n                <tr>\n                  <td bgcolor="#111827" style="border-radius: 8px;">\n                    <a href="{{rsvp_link}}" style="display: inline-block; padding: 14px 22px; color: #ffffff; text-decoration: none; font-weight: 600;">Confirm Your Attendance</a>\n                  </td>\n                </tr>\n              </table>\n              <p style="margin: 0 0 8px; color: #6B7280;">If the button above does not open, please use this link:</p>\n              <p style="margin: 0 0 24px;"><a href="{{rsvp_link}}" style="color: #2563EB;">{{rsvp_link}}</a></p>\n              <p style="margin: 0;">Best regards,<br />Gala Team</p>\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n</div>',
  E'<div style="background: #F9FAFB; padding: 24px 0;">\n  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">\n    <tr>\n      <td align="center">\n        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 14px; overflow: hidden;">\n          <tr>\n            <td style="padding: 28px 32px; font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">\n              <p style="margin: 0 0 16px;">Hi {{full_name}},</p>\n              <p style="margin: 0 0 16px;">We are reaching out with a final opportunity to attend <strong>{{event_name}}</strong>.</p>\n              <p style="margin: 0 0 16px;">If you would like to join us, please confirm your attendance as soon as possible so we can finalize arrangements.</p>\n              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 24px;">\n                <tr>\n                  <td bgcolor="#111827" style="border-radius: 8px;">\n                    <a href="{{rsvp_link}}" style="display: inline-block; padding: 14px 22px; color: #ffffff; text-decoration: none; font-weight: 600;">Confirm Your Attendance</a>\n                  </td>\n                </tr>\n              </table>\n              <p style="margin: 0 0 8px; color: #6B7280;">If the button above does not open, please use this link:</p>\n              <p style="margin: 0 0 24px;"><a href="{{rsvp_link}}" style="color: #2563EB;">{{rsvp_link}}</a></p>\n              <p style="margin: 0;">Best regards,<br />Gala Team</p>\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n</div>',
  E'<div style="background: #F9FAFB; padding: 24px 0;">\n  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">\n    <tr>\n      <td align="center">\n        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 14px; overflow: hidden;">\n          <tr>\n            <td style="padding: 28px 32px; font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">\n              <p style="margin: 0 0 16px;">Hi {{full_name}},</p>\n              <p style="margin: 0 0 16px;">We wanted to send a gentle reminder to confirm your attendance for <strong>{{event_name}}</strong>.</p>\n              <p style="margin: 0 0 16px;">If you plan to attend, please let us know as soon as possible so we can plan accordingly.</p>\n              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 24px;">\n                <tr>\n                  <td bgcolor="#111827" style="border-radius: 8px;">\n                    <a href="{{rsvp_link}}" style="display: inline-block; padding: 14px 22px; color: #ffffff; text-decoration: none; font-weight: 600;">Confirm Your Attendance</a>\n                  </td>\n                </tr>\n              </table>\n              <p style="margin: 0 0 8px; color: #6B7280;">If the button above does not open, please use this link:</p>\n              <p style="margin: 0 0 24px;"><a href="{{rsvp_link}}" style="color: #2563EB;">{{rsvp_link}}</a></p>\n              <p style="margin: 0;">Thank you,<br />Gala Team</p>\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n</div>',
  1
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
  email_subject_reminder = excluded.email_subject_reminder,
  email_template_founders = excluded.email_template_founders,
  email_template_default = excluded.email_template_default,
  email_template_tier1 = excluded.email_template_tier1,
  email_template_tier2 = excluded.email_template_tier2,
  email_template_reminder = excluded.email_template_reminder,
  reminder_max_per_stage = excluded.reminder_max_per_stage;

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
