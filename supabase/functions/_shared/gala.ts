import { createClient } from "npm:@supabase/supabase-js@2.57.4";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export function createAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

export function isOptions(req: Request) {
  return req.method === "OPTIONS";
}

export function optionsResponse() {
  return new Response("ok", { headers: corsHeaders });
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function tierOrder(tier: string) {
  switch (tier) {
    case "founder":
      return 0;
    case "tier1":
      return 1;
    case "tier2":
      return 2;
    default:
      return 3;
  }
}

export function renderTemplate(template: string, values: Record<string, string>) {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key) => values[key] ?? "");
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractEmailAddress(raw: string | null) {
  if (!raw) return null;
  const match = raw.match(/<([^>]+)>/);
  if (match) return match[1].trim();
  return raw.trim();
}

const FALLBACK_TEMPLATES = {
  founder: {
    subject: "You're Invited — Priority Access to {{event_name}}",
    body: `<div style="background: #F9FAFB; padding: 24px 0;">
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
</div>`,
  },
  tier1: {
    subject: "You're Invited to {{event_name}}",
    body: `<div style="background: #F9FAFB; padding: 24px 0;">
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
</div>`,
  },
  tier2: {
    subject: "Final Invitation — {{event_name}}",
    body: `<div style="background: #F9FAFB; padding: 24px 0;">
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
</div>`,
  },
  reminder: {
    subject: "Reminder — Please Confirm Your Attendance",
    body: `<div style="background: #F9FAFB; padding: 24px 0;">
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
</div>`,
  },
  thankyou: {
    subject: "Thank You for Being Part of {{event_name}}",
    body: `<div style="background: #F9FAFB; padding: 24px 0;">
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
</div>`,
  },
};

export function getInvitationContent(
  event: Record<string, unknown>,
  guest: Record<string, unknown>,
  rsvpLink: string,
) {
  const tier = guest.tier === "founder" || guest.tier === "tier1" || guest.tier === "tier2"
    ? guest.tier
    : "tier1";

  const templateConfig = tier === "founder"
    ? {
        subject: String(event.email_subject_founders ?? FALLBACK_TEMPLATES.founder.subject),
        body: String(event.email_template_founders ?? FALLBACK_TEMPLATES.founder.body),
      }
    : tier === "tier2"
      ? {
          subject: String(event.email_subject_tier2 ?? FALLBACK_TEMPLATES.tier2.subject),
          body: String(event.email_template_tier2 ?? event.email_template_default ?? FALLBACK_TEMPLATES.tier2.body),
        }
      : {
          subject: String(event.email_subject_tier1 ?? FALLBACK_TEMPLATES.tier1.subject),
          body: String(event.email_template_tier1 ?? event.email_template_default ?? FALLBACK_TEMPLATES.tier1.body),
        };

  const values = {
    full_name: String(guest.full_name ?? "Guest"),
    event_name: String(event.name ?? "Gala Event"),
    rsvp_link: rsvpLink,
  };
  const subject = renderTemplate(templateConfig.subject, values);
  let body = renderTemplate(templateConfig.body, values);
  const isHtml = /<[^>]+>/.test(body);

  const unsubscribeUrl = Deno.env.get("PUBLIC_UNSUBSCRIBE_URL");
  const footerText = `You are receiving this email because you were invited to ${values.event_name}.\nIf this was a mistake, reply to this email${unsubscribeUrl ? ` or unsubscribe here: ${unsubscribeUrl}` : ""}.`;
  const footerHtml = `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" /><p style="margin:0;color:#6b7280;font-size:12px;">You are receiving this email because you were invited to ${values.event_name}. If this was a mistake, reply to this email${unsubscribeUrl ? ` or <a href="${unsubscribeUrl}" style="color:#2563eb;">unsubscribe</a>.` : "."}</p>`;

  if (isHtml) {
    body = `${body}${footerHtml}`;
  } else {
    body = `${body}\n\n${footerText}`;
  }

  return {
    subject,
    body,
    html: isHtml ? body : undefined,
    text: isHtml ? stripHtml(body) : body,
  };
}

export function getReminderContent(
  event: Record<string, unknown>,
  guest: Record<string, unknown>,
  rsvpLink: string,
) {
  const values = {
    full_name: String(guest.full_name ?? "Guest"),
    event_name: String(event.name ?? "Gala Event"),
    rsvp_link: rsvpLink,
  };
  const subject = renderTemplate(
    String(event.email_subject_reminder ?? FALLBACK_TEMPLATES.reminder.subject),
    values,
  );
  let body = renderTemplate(
    String(event.email_template_reminder ?? FALLBACK_TEMPLATES.reminder.body),
    values,
  );
  const isHtml = /<[^>]+>/.test(body);

  const unsubscribeUrl = Deno.env.get("PUBLIC_UNSUBSCRIBE_URL");
  const footerText = `You are receiving this email because you were invited to ${values.event_name}.\nIf this was a mistake, reply to this email${unsubscribeUrl ? ` or unsubscribe here: ${unsubscribeUrl}` : ""}.`;
  const footerHtml = `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" /><p style="margin:0;color:#6b7280;font-size:12px;">You are receiving this email because you were invited to ${values.event_name}. If this was a mistake, reply to this email${unsubscribeUrl ? ` or <a href="${unsubscribeUrl}" style="color:#2563eb;">unsubscribe</a>.` : "."}</p>`;

  if (isHtml) {
    body = `${body}${footerHtml}`;
  } else {
    body = `${body}\n\n${footerText}`;
  }

  return {
    subject,
    body,
    html: isHtml ? body : undefined,
    text: isHtml ? stripHtml(body) : body,
  };
}

export function getThankYouContent(
  event: Record<string, unknown>,
  guest: Record<string, unknown>,
  rsvpLink: string,
) {
  const values = {
    full_name: String(guest.full_name ?? "Guest"),
    event_name: String(event.name ?? "Gala Event"),
    rsvp_link: rsvpLink,
  };
  const subject = renderTemplate(
    String(event.email_subject_thankyou ?? FALLBACK_TEMPLATES.thankyou.subject),
    values,
  );
  let body = renderTemplate(
    String(event.email_template_thankyou ?? FALLBACK_TEMPLATES.thankyou.body),
    values,
  );
  const isHtml = /<[^>]+>/.test(body);

  const unsubscribeUrl = Deno.env.get("PUBLIC_UNSUBSCRIBE_URL");
  const footerText = `You are receiving this email because you were invited to ${values.event_name}.\nIf this was a mistake, reply to this email${unsubscribeUrl ? ` or unsubscribe here: ${unsubscribeUrl}` : ""}.`;
  const footerHtml = `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" /><p style="margin:0;color:#6b7280;font-size:12px;">You are receiving this email because you were invited to ${values.event_name}. If this was a mistake, reply to this email${unsubscribeUrl ? ` or <a href="${unsubscribeUrl}" style="color:#2563eb;">unsubscribe</a>.` : "."}</p>`;

  if (isHtml) {
    body = `${body}${footerHtml}`;
  } else {
    body = `${body}\n\n${footerText}`;
  }

  return {
    subject,
    body,
    html: isHtml ? body : undefined,
    text: isHtml ? stripHtml(body) : body,
  };
}

export function getStageWindowForGuest(event: Record<string, unknown>, guest: Record<string, unknown>) {
  const startedAt = event.invitations_started_at ? new Date(String(event.invitations_started_at)) : null;
  const founderEnds = event.founder_window_ends_at ? new Date(String(event.founder_window_ends_at)) : null;
  const tier1Ends = event.tier1_window_ends_at ? new Date(String(event.tier1_window_ends_at)) : null;
  const tier2Ends = event.tier2_window_ends_at ? new Date(String(event.tier2_window_ends_at)) : null;

  if (!startedAt) return null;

  if (guest.tier === "founder" && founderEnds) {
    return { stage: "founder", start: startedAt, end: founderEnds };
  }
  if (guest.tier === "tier1" && founderEnds && tier1Ends) {
    return { stage: "tier1", start: founderEnds, end: tier1Ends };
  }
  if ((guest.tier === "tier2" || guest.tier === "public") && tier1Ends && tier2Ends) {
    return { stage: "tier2", start: tier1Ends, end: tier2Ends };
  }
  return null;
}

export async function processReminderEmails(
  supabase: ReturnType<typeof createAdminClient>,
  event: Record<string, unknown>,
) {
  if (!event.invitations_started_at || event.completed_at) return { ok: true };

  const { data: invitedGuests, error: guestError } = await supabase
    .from("gala_guests")
    .select("*")
    .eq("event_id", event.id)
    .eq("status", "invited");

  if (guestError) return { error: guestError.message };

  const now = new Date();
  const maxPerStage = Number(event.reminder_max_per_stage ?? 1) || 1;

  for (const guest of invitedGuests ?? []) {
    if (maxPerStage <= 0) continue;
    const stageWindow = getStageWindowForGuest(event, guest);
    if (!stageWindow) continue;

    const { stage, start, end } = stageWindow;
    if (now < start || now > end) continue;

    const midpoint = new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);
    if (now < midpoint) continue;

    if (guest.last_reminder_stage === stage) continue;
    if (guest.reminder_count >= maxPerStage) continue;

    const { data: tokenRow } = await supabase
      .from("gala_rsvp_tokens")
      .select("token, used")
      .eq("guest_id", guest.id)
      .maybeSingle();
    if (!tokenRow || tokenRow.used) continue;

    const rsvpLink = `${siteUrlFromEnv()}/rsvp/${tokenRow.token}`;

    const reminder = getReminderContent(event, guest, rsvpLink);
    const sendResult = await sendResendEmail({
      to: String(guest.email),
      subject: reminder.subject,
      text: reminder.text,
      html: reminder.html,
    });
    if (sendResult.error) continue;

    await supabase
      .from("gala_guests")
      .update({
        reminder_count: (guest.reminder_count ?? 0) + 1,
        last_reminder_at: now.toISOString(),
        last_reminder_stage: stage,
      })
      .eq("id", guest.id);
  }

  return { ok: true };
}

export function siteUrlFromRequest(req: Request) {
  return (
    Deno.env.get("PUBLIC_APP_URL") ??
    Deno.env.get("PUBLIC_SITE_URL") ??
    req.headers.get("origin") ??
    "http://localhost:5173"
  ).replace(/\/$/, "");
}

export function siteUrlFromEnv() {
  return (
    Deno.env.get("PUBLIC_APP_URL") ??
    Deno.env.get("PUBLIC_SITE_URL") ??
    "http://localhost:5173"
  ).replace(/\/$/, "");
}

export function normalizeSeatCount(raw: unknown, fallback = 1) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

export async function syncEventProgress(
  supabase: ReturnType<typeof createAdminClient>,
  eventId: string,
  inviteGuest: (event: Record<string, unknown>, guestId: string) => Promise<{ error?: string }>,
) {
  const { data: event, error: eventError } = await supabase
    .from("gala_events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    return { error: eventError?.message ?? "Event not found." };
  }

  if (!event.invitations_started_at || event.completed_at) {
    return { event };
  }

  const now = new Date();
  const founderEnded = Boolean(event.founder_window_ends_at && now >= new Date(event.founder_window_ends_at));
  const tier1Ended = Boolean(event.tier1_window_ends_at && now >= new Date(event.tier1_window_ends_at));
  const tier2Ended = Boolean(event.tier2_window_ends_at && now >= new Date(event.tier2_window_ends_at));

  const tiersToInvite: string[] = [];
  if (founderEnded) tiersToInvite.push("tier1");
  if (tier1Ended) tiersToInvite.push("tier2", "public");

  if (tiersToInvite.length > 0) {
    const { data: guestsToInvite, error: guestsError } = await supabase
      .from("gala_guests")
      .select("id")
      .eq("event_id", eventId)
      .in("tier", tiersToInvite)
      .eq("status", "not_invited");

    if (guestsError) {
      return { error: guestsError.message };
    }

    for (const guest of guestsToInvite ?? []) {
      const result = await inviteGuest(event, guest.id);
      if (result.error) return result;
    }
  }

  if (tier2Ended) {
    if (!event.completed_at) {
      const { error: updateError } = await supabase
        .from("gala_events")
        .update({ completed_at: now.toISOString() })
        .eq("id", eventId)
        .is("completed_at", null);

      if (updateError) {
        return { error: updateError.message };
      }
    }
  }

  const { data: refreshedEvent, error: refreshedEventError } = await supabase
    .from("gala_events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (refreshedEventError || !refreshedEvent) {
    return { error: refreshedEventError?.message ?? "Event not found after sync." };
  }

  const reminderResult = await processReminderEmails(supabase, refreshedEvent);
  if (reminderResult.error) {
    return { error: reminderResult.error };
  }

  return { event: refreshedEvent };
}

export type ResendEmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendResendEmail(payload: ResendEmailPayload) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM");
  const unsubscribeUrl = Deno.env.get("PUBLIC_UNSUBSCRIBE_URL");
  const unsubscribeEmail = extractEmailAddress(
    Deno.env.get("RESEND_LIST_UNSUBSCRIBE_EMAIL") ?? from ?? "",
  );

  if (!apiKey) {
    return { error: "Missing RESEND_API_KEY secret." };
  }
  if (!from) {
    return { error: "Missing RESEND_FROM secret." };
  }

  const html = payload.html ?? payload.text.replace(/\n/g, "<br />");
  const listUnsubscribeParts = [];
  if (unsubscribeEmail) listUnsubscribeParts.push(`<mailto:${unsubscribeEmail}>`);
  if (unsubscribeUrl) listUnsubscribeParts.push(`<${unsubscribeUrl}>`);
  const headers = listUnsubscribeParts.length > 0
    ? { "List-Unsubscribe": listUnsubscribeParts.join(", ") }
    : undefined;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html,
      headers,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return { error: `Resend error ${response.status}: ${body}` };
  }

  return { ok: true };
}
