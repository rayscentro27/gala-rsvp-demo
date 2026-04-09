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

  try {
    if (req.method === "GET") {
      const token = new URL(req.url).searchParams.get("token");
      return await getRsvp(req, token);
    }

    if (req.method === "POST") {
      const body = await req.json();
      return await submitRsvp(req, body?.token, body?.response, body?.seat_count);
    }

    return json({ error: "Method not allowed." }, 405);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error." }, 500);
  }
});

async function getRsvp(req: Request, token: string | null) {
  if (!token) return json({ error: "token is required." }, 400);

  const supabase = createAdminClient();
  const tokenRecord = await fetchTokenRecord(supabase, token);
  if (tokenRecord.error) return json({ error: tokenRecord.error }, tokenRecord.status ?? 404);

  const { guest, event, tokenRow } = tokenRecord;
  const synced = await syncEventProgress(
    supabase,
    event.id,
    (currentEvent, guestId) => issueInvitation(req, supabase, currentEvent, guestId),
  );
  if (synced.error) return json({ error: synced.error }, 500);

  return json({
    guest,
    event: synced.event ?? event,
    token: {
      token: tokenRow.token,
      used: tokenRow.used,
      used_at: tokenRow.used_at,
      expires_at: tokenRow.expires_at,
      expired: Boolean(tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()),
    },
    rsvpConfirmed: null,
  });
}

async function submitRsvp(req: Request, token: string | null, response: string | null, requestedSeats: unknown) {
  if (!token) return json({ error: "token is required." }, 400);
  if (response !== "accepted" && response !== "declined") {
    return json({ error: "response must be accepted or declined." }, 400);
  }

  const supabase = createAdminClient();
  const tokenRecord = await fetchTokenRecord(supabase, token);
  if (tokenRecord.error) return json({ error: tokenRecord.error }, tokenRecord.status ?? 404);

  const { guest, event, tokenRow } = tokenRecord;
  if (tokenRow.used) return json({ error: "This RSVP link has already been used." }, 400);
  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    return json({ error: "This RSVP link has expired." }, 400);
  }

  const maxSeats = guest.tier === "founder"
    ? normalizeSeatCount(guest.founder_allowance, 4)
    : 2;
  const seatCount = response === "accepted"
    ? Math.min(Math.max(normalizeSeatCount(requestedSeats, 1), 1), maxSeats)
    : 0;

  const now = new Date().toISOString();
  const { error: guestError } = await supabase
    .from("gala_guests")
    .update({
      status: response,
      seat_count: seatCount,
      rsvp_at: now,
    })
    .eq("id", guest.id);

  if (guestError) return json({ error: guestError.message }, 500);

  const { error: tokenError } = await supabase
    .from("gala_rsvp_tokens")
    .update({
      used: true,
      used_at: now,
    })
    .eq("id", tokenRow.id);

  if (tokenError) return json({ error: tokenError.message }, 500);

  const { count: remainingCount, error: remainingError } = await supabase
    .from("gala_guests")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .in("status", ["invited", "pending"]);

  if (!remainingError && (remainingCount ?? 0) === 0) {
    await supabase
      .from("gala_events")
      .update({ completed_at: now })
      .eq("id", event.id)
      .is("completed_at", null);
  }

  const synced = await syncEventProgress(
    supabase,
    event.id,
    (currentEvent, guestId) => issueInvitation(req, supabase, currentEvent, guestId),
  );
  if (synced.error) return json({ error: synced.error }, 500);

  return json({ ok: true, response, seat_count: seatCount });
}

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

async function fetchTokenRecord(supabase: ReturnType<typeof createAdminClient>, token: string) {
  const { data: tokenRow, error: tokenError } = await supabase
    .from("gala_rsvp_tokens")
    .select("*")
    .eq("token", token)
    .single();

  if (tokenError || !tokenRow) {
    return { error: tokenError?.message ?? "RSVP token not found.", status: 404 };
  }

  const [{ data: guest, error: guestError }, { data: event, error: eventError }] = await Promise.all([
    supabase.from("gala_guests").select("*").eq("id", tokenRow.guest_id).single(),
    supabase.from("gala_events").select("*").eq("id", tokenRow.event_id).single(),
  ]);

  if (guestError || !guest) {
    return { error: guestError?.message ?? "Guest not found.", status: 404 };
  }

  if (eventError || !event) {
    return { error: eventError?.message ?? "Event not found.", status: 404 };
  }

  return { guest, event, tokenRow };
}
