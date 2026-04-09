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
    subject: "You’re Invited — Priority Access to {{event_name}}",
    body: `<div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Hi {{full_name}},</p>
  <p style="margin: 0 0 16px;">We’d love to personally invite you to <strong>{{event_name}}</strong>.</p>
  <p style="margin: 0 0 16px;">As one of our selected <strong>Ambassadors</strong>, you have early access to reserve your spot before invitations are opened to others.</p>
  <p style="margin: 0 0 24px;">Please let us know as soon as possible if you’ll be attending.</p>
  <div style="margin: 0 0 24px;">
    <a href="{{rsvp_link}}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 14px 22px; border-radius: 8px; font-weight: 600;">Confirm Your Attendance</a>
  </div>
  <p style="margin: 0 0 8px; color: #4b5563;">If the button above does not open, please use this link:</p>
  <p style="margin: 0 0 24px;"><a href="{{rsvp_link}}" style="color: #2563eb;">{{rsvp_link}}</a></p>
  <p style="margin: 0;">Warm regards,<br />Gala Team</p>
</div>`,
  },
  tier1: {
    subject: "You’re Invited to {{event_name}}",
    body: `<div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Hi {{full_name}},</p>
  <p style="margin: 0 0 16px;">You’re invited to join us for <strong>{{event_name}}</strong>.</p>
  <p style="margin: 0 0 16px;">We’d be delighted to have you attend.</p>
  <p style="margin: 0 0 24px;">Please let us know as soon as possible if you’ll be joining us so we can plan accordingly.</p>
  <div style="margin: 0 0 24px;">
    <a href="{{rsvp_link}}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 14px 22px; border-radius: 8px; font-weight: 600;">Confirm Your Attendance</a>
  </div>
  <p style="margin: 0 0 8px; color: #4b5563;">If the button above does not open, please use this link:</p>
  <p style="margin: 0 0 24px;"><a href="{{rsvp_link}}" style="color: #2563eb;">{{rsvp_link}}</a></p>
  <p style="margin: 0;">Best regards,<br />Gala Team</p>
</div>`,
  },
  tier2: {
    subject: "Final Invitation — {{event_name}}",
    body: `<div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Hi {{full_name}},</p>
  <p style="margin: 0 0 16px;">We’re reaching out with a final opportunity to attend <strong>{{event_name}}</strong>.</p>
  <p style="margin: 0 0 16px;">If you’d like to join us, please confirm your attendance as soon as possible so we can finalize arrangements.</p>
  <div style="margin: 0 0 24px;">
    <a href="{{rsvp_link}}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 14px 22px; border-radius: 8px; font-weight: 600;">Confirm Your Attendance</a>
  </div>
  <p style="margin: 0 0 8px; color: #4b5563;">If the button above does not open, please use this link:</p>
  <p style="margin: 0 0 24px;"><a href="{{rsvp_link}}" style="color: #2563eb;">{{rsvp_link}}</a></p>
  <p style="margin: 0;">Best regards,<br />Gala Team</p>
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

export function siteUrlFromRequest(req: Request) {
  return (
    Deno.env.get("PUBLIC_APP_URL") ??
    Deno.env.get("PUBLIC_SITE_URL") ??
    req.headers.get("origin") ??
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
