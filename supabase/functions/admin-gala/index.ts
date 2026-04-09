import {
  addMinutes,
  createAdminClient,
  getInvitationContent,
  isOptions,
  json,
  normalizeSeatCount,
  optionsResponse,
  sendResendEmail,
  siteUrlFromRequest,
  syncEventProgress,
} from "../_shared/gala.ts";

Deno.serve(async (req) => {
  if (isOptions(req)) return optionsResponse();
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const body = await req.json();
    const action = body?.action;

    if (action === "start_gala_invitations") {
      return await startGalaInvitations(req, body?.event_id);
    }

    if (action === "send_invitation") {
      return await sendInvitation(req, body?.event_id, body?.guest_id);
    }

    return json({ error: "Unsupported action." }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error." }, 500);
  }
});

async function startGalaInvitations(req: Request, eventId: string) {
  if (!eventId) return json({ error: "event_id is required." }, 400);

  const supabase = createAdminClient();
  const { data: event, error: eventError } = await supabase
    .from("gala_events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    return json({ error: eventError?.message ?? "Event not found." }, 404);
  }

  const now = new Date();
  const stageMinutes = normalizeSeatCount(event.stage_window_minutes, 2880);
  const nextFounderEnd = addMinutes(now, stageMinutes).toISOString();
  const nextTier1End = addMinutes(now, stageMinutes * 2).toISOString();
  const nextTier2End = addMinutes(now, stageMinutes * 3).toISOString();

  const updatePayload: Record<string, string | null> = {
    completed_at: null,
  };

  if (!event.invitations_started_at) {
    updatePayload.invitations_started_at = now.toISOString();
    updatePayload.founder_window_ends_at = nextFounderEnd;
    updatePayload.tier1_window_ends_at = nextTier1End;
    updatePayload.tier2_window_ends_at = nextTier2End;
  }

  if (Object.keys(updatePayload).length > 0) {
    const { error: updateError } = await supabase
      .from("gala_events")
      .update(updatePayload)
      .eq("id", eventId);

    if (updateError) {
      return json({ error: updateError.message }, 500);
    }
  }

  const { data: founderGuests, error: founderError } = await supabase
    .from("gala_guests")
    .select("id")
    .eq("event_id", eventId)
    .eq("tier", "founder")
    .eq("status", "not_invited");

  if (founderError) return json({ error: founderError.message }, 500);

  const invitedGuestIds: string[] = [];
  for (const guest of founderGuests ?? []) {
    const result = await issueInvitation(req, supabase, event, guest.id);
    if (result.error) return json({ error: result.error }, 500);
    invitedGuestIds.push(guest.id);
  }

  const synced = await syncEventProgress(
    supabase,
    eventId,
    (currentEvent, guestId) => issueInvitation(req, supabase, currentEvent, guestId),
  );
  if (synced.error) return json({ error: synced.error }, 500);

  return json({
    ok: true,
    invited_count: invitedGuestIds.length,
    invited_guest_ids: invitedGuestIds,
    event_id: eventId,
  });
}

async function sendInvitation(req: Request, eventId: string, guestId: string) {
  if (!eventId || !guestId) {
    return json({ error: "event_id and guest_id are required." }, 400);
  }

  const supabase = createAdminClient();
  const { data: event, error: eventError } = await supabase
    .from("gala_events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    return json({ error: eventError?.message ?? "Event not found." }, 404);
  }

  const { data: guest, error: guestError } = await supabase
    .from("gala_guests")
    .select("status")
    .eq("id", guestId)
    .eq("event_id", eventId)
    .single();

  if (guestError || !guest) {
    return json({ error: guestError?.message ?? "Guest not found." }, 404);
  }
  if (guest.status !== "not_invited") {
    return json({ error: "This guest already has an invitation or RSVP on file." }, 409);
  }

  const result = await issueInvitation(req, supabase, event, guestId);
  if (result.error) return json({ error: result.error }, 500);

  const synced = await syncEventProgress(
    supabase,
    eventId,
    (currentEvent, nextGuestId) => issueInvitation(req, supabase, currentEvent, nextGuestId),
  );
  if (synced.error) return json({ error: synced.error }, 500);

  return json({ ok: true, guest_id: guestId, token: result.token });
}

async function issueInvitation(req: Request, supabase: ReturnType<typeof createAdminClient>, event: Record<string, unknown>, guestId: string) {
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
    .select("id, token, expires_at, used")
    .eq("guest_id", guest.id)
    .maybeSingle();

  let tokenRow = existingToken;
  if (!tokenRow) {
    const token = crypto.randomUUID();
    const expiresAt = addMinutes(new Date(), 60 * 24 * 30).toISOString();
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
      .select("id, token, expires_at, used")
      .single();

    if (tokenError || !data) {
      return { error: tokenError?.message ?? "Failed to generate RSVP token." };
    }
    tokenRow = data;
  }

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
    return { token: tokenRow.token };
  }

  const siteUrl = siteUrlFromRequest(req);
  const rsvpLink = `${siteUrl}/rsvp/${tokenRow.token}`;
  const invitation = getInvitationContent(event, guest, rsvpLink);

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

  return { token: tokenRow.token };
}
