with target_event as (
  select id
  from public.gala_events
  order by created_at desc
  limit 1
)
update public.gala_events
set
  email_subject_founders = 'You''re Invited — Priority Access to {{event_name}}',
  email_subject_tier1 = 'You''re Invited to {{event_name}}',
  email_subject_tier2 = 'Final Invitation — {{event_name}}',
  email_subject_reminder = 'Reminder — Please Confirm Your Attendance',
  email_template_founders = $$
<div style="background: #F9FAFB; padding: 24px 0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 14px; overflow: hidden;">
          <tr>
            <td style="padding: 28px 32px; font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
              <p style="margin: 0 0 16px;">Hi {{full_name}},</p>
              <p style="margin: 0 0 16px;">We would love to personally invite you to <strong>{{event_name}}</strong>.</p>
              <p style="margin: 0 0 16px;">As one of our selected <strong>Ambassadors</strong>, you have early access to reserve your spot before invitations open to others.</p>
              <p style="margin: 0 0 24px;">Please let us know as soon as possible if you will be attending.</p>
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
$$,
  email_template_default = $$
<div style="background: #F9FAFB; padding: 24px 0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 14px; overflow: hidden;">
          <tr>
            <td style="padding: 28px 32px; font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
              <p style="margin: 0 0 16px;">Hi {{full_name}},</p>
              <p style="margin: 0 0 16px;">You are invited to join us for <strong>{{event_name}}</strong>.</p>
              <p style="margin: 0 0 16px;">We would be delighted to have you attend.</p>
              <p style="margin: 0 0 24px;">Please let us know as soon as possible if you will be joining us so we can plan accordingly.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 24px;">
                <tr>
                  <td bgcolor="#111827" style="border-radius: 8px;">
                    <a href="{{rsvp_link}}" style="display: inline-block; padding: 14px 22px; color: #ffffff; text-decoration: none; font-weight: 600;">Confirm Your Attendance</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 8px; color: #6B7280;">If the button above does not open, please use this link:</p>
              <p style="margin: 0 0 24px;"><a href="{{rsvp_link}}" style="color: #2563EB;">{{rsvp_link}}</a></p>
              <p style="margin: 0;">Best regards,<br />Gala Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
$$,
  email_template_tier1 = $$
<div style="background: #F9FAFB; padding: 24px 0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 14px; overflow: hidden;">
          <tr>
            <td style="padding: 28px 32px; font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
              <p style="margin: 0 0 16px;">Hi {{full_name}},</p>
              <p style="margin: 0 0 16px;">You are invited to join us for <strong>{{event_name}}</strong>.</p>
              <p style="margin: 0 0 16px;">We would be delighted to have you attend.</p>
              <p style="margin: 0 0 24px;">Please let us know as soon as possible if you will be joining us so we can plan accordingly.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 24px;">
                <tr>
                  <td bgcolor="#111827" style="border-radius: 8px;">
                    <a href="{{rsvp_link}}" style="display: inline-block; padding: 14px 22px; color: #ffffff; text-decoration: none; font-weight: 600;">Confirm Your Attendance</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 8px; color: #6B7280;">If the button above does not open, please use this link:</p>
              <p style="margin: 0 0 24px;"><a href="{{rsvp_link}}" style="color: #2563EB;">{{rsvp_link}}</a></p>
              <p style="margin: 0;">Best regards,<br />Gala Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
$$,
  email_template_tier2 = $$
<div style="background: #F9FAFB; padding: 24px 0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 14px; overflow: hidden;">
          <tr>
            <td style="padding: 28px 32px; font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
              <p style="margin: 0 0 16px;">Hi {{full_name}},</p>
              <p style="margin: 0 0 16px;">We are reaching out with a final opportunity to attend <strong>{{event_name}}</strong>.</p>
              <p style="margin: 0 0 16px;">If you would like to join us, please confirm your attendance as soon as possible so we can finalize arrangements.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 24px;">
                <tr>
                  <td bgcolor="#111827" style="border-radius: 8px;">
                    <a href="{{rsvp_link}}" style="display: inline-block; padding: 14px 22px; color: #ffffff; text-decoration: none; font-weight: 600;">Confirm Your Attendance</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 8px; color: #6B7280;">If the button above does not open, please use this link:</p>
              <p style="margin: 0 0 24px;"><a href="{{rsvp_link}}" style="color: #2563EB;">{{rsvp_link}}</a></p>
              <p style="margin: 0;">Best regards,<br />Gala Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
$$,
  email_template_reminder = $$
<div style="background: #F9FAFB; padding: 24px 0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 14px; overflow: hidden;">
          <tr>
            <td style="padding: 28px 32px; font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
              <p style="margin: 0 0 16px;">Hi {{full_name}},</p>
              <p style="margin: 0 0 16px;">We wanted to send a gentle reminder to confirm your attendance for <strong>{{event_name}}</strong>.</p>
              <p style="margin: 0 0 16px;">If you plan to attend, please let us know as soon as possible so we can plan accordingly.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 24px;">
                <tr>
                  <td bgcolor="#111827" style="border-radius: 8px;">
                    <a href="{{rsvp_link}}" style="display: inline-block; padding: 14px 22px; color: #ffffff; text-decoration: none; font-weight: 600;">Confirm Your Attendance</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 8px; color: #6B7280;">If the button above does not open, please use this link:</p>
              <p style="margin: 0 0 24px;"><a href="{{rsvp_link}}" style="color: #2563EB;">{{rsvp_link}}</a></p>
              <p style="margin: 0;">Thank you,<br />Gala Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
$$
where id in (select id from target_event);
