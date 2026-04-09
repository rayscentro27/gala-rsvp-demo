import {
  addMinutes,
  createAdminClient,
  getInvitationContent,
  isOptions,
  json,
  optionsResponse,
  sendResendEmail,
  siteUrlFromRequest,
  syncEventProgress,
} from "../_shared/gala.ts";

Deno.serve(async (req) => {
  if (isOptions(req)) return optionsResponse();
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const eventId = body?.event_id;
    if (!eventId) return json({ error: "event_id is required." }, 400);

    const supabase = createAdminClient();
    const synced = await syncEventProgress(
      supabase,
      eventId,
      (event, guestId) => issueInvitation(req, supabase, event, guestId),
    );

    if (synced.error) return json({ error: synced.error }, 500);

    return json({ ok: true, event: synced.event });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error." }, 500);
  }
});

async function issueInvitation(
  req: Request,
  supabase: ReturnType<typeof createAdminClient>,
  event: Record<string, unknown>,
  guestId: string,
) {
  const { data: guest, error: guestError } = await supabase
    .from("gala_guests")
    .select("*")
    .eq("id", guestId)
    .eq("event_id", String(event.id))
    .single();

  if (guestError || !guest) {
    return { error: guestError?.message ?? "Guest not found." };
  }

  const { data: existingToken } = await supabase
    .from("gala_rsvp_tokens")
    .select("id, token, used")
    .eq("guest_id", guest.id)
    .maybeSingle();

  let tokenRow = existingToken;
  if (!tokenRow) {
    const token = crypto.randomUUID();
    const expiresAt = addMinutes(new Date(), 60 * 24 * 14).toISOString();
    const { data, error: tokenError } = await supabase
      .from("gala_rsvp_tokens")
      .insert({
        event_id: event.id,
        guest_id: guest.id,
        token,
        expires_at: expiresAt,
        used: false,
        used_at: null,
      })
      .select("id, token, used")
      .single();

    if (tokenError || !data) {
      return { error: tokenError?.message ?? "Failed to generate RSVP token." };
    }
    tokenRow = data;
  }

  const rsvpLink = `${siteUrlFromRequest(req)}/rsvp/${tokenRow.token}`;
  const invitation = getInvitationContent(event, guest, rsvpLink);

  const existingInviteStatus = await supabase
    .from("gala_invites")
    .select("id, delivery_status")
    .eq("event_id", String(event.id))
    .eq("guest_id", guest.id)
    .maybeSingle();
  if (
    existingInviteStatus.data &&
    (existingInviteStatus.data.delivery_status === "sent" || existingInviteStatus.data.delivery_status === "queued")
  ) {
    return { ok: true };
  }

  const { data: inviteRow, error: inviteError } = await supabase
    .from("gala_invites")
    .upsert({
      event_id: event.id,
      guest_id: guest.id,
      token_id: tokenRow.id,
      subject: invitation.subject,
      body: invitation.body,
      delivery_status: "queued",
      sent_at: null,
    }, { onConflict: "event_id,guest_id" })
    .select("id")
    .single();

  if (inviteError || !inviteRow) {
    return { error: inviteError?.message ?? "Failed to create invite." };
  }

  if (!guest.email) {
    await supabase
      .from("gala_invites")
      .update({ delivery_status: "failed" })
      .eq("id", inviteRow.id);
    return { error: "Guest email is missing." };
  }

  const sendResult = await sendResendEmail({
    to: String(guest.email),
    subject: invitation.subject,
    text: invitation.text,
    html: invitation.html,
  });
  if (sendResult.error) {
    await supabase
      .from("gala_invites")
      .update({ delivery_status: "failed" })
      .eq("id", inviteRow.id);
    return { error: sendResult.error };
  }

  await supabase
    .from("gala_invites")
    .update({
      delivery_status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("id", inviteRow.id);

  if (guest.status !== "not_invited") {
    return { ok: true };
  }

  const { error: guestUpdateError } = await supabase
    .from("gala_guests")
    .update({
      status: "invited",
      invited_at: new Date().toISOString(),
    })
    .eq("id", guest.id);

  if (guestUpdateError) {
    return { error: guestUpdateError.message };
  }

  return { ok: true };
}
