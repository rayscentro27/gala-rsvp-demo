import { useState, useEffect } from "react";
import Papa from "papaparse";
import { supabase } from "../lib/supabase";

// Helper: Map backend tier to display label
function getTierLabel(tier) {
  if (tier === "founder") return "Ambassador";
  if (tier === "tier1") return "Tier 1";
  if (tier === "tier2") return "Tier 2";
  return tier || "—";
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function getStatusLabel(status) {
  if (status === "waitlisted") return "Waitlisted";
  if (status === "not_invited") return "Not Invited";
  if (status === "invited") return "Invited";
  if (status === "accepted") return "Accepted";
  if (status === "declined") return "Declined";
  return status || "—";
}

function getTierBadgeStyle(tier) {
  if (tier === "founder") return { color: "#6d28d9", background: "#ede9fe" };
  if (tier === "tier1") return { color: "#1d4ed8", background: "#dbeafe" };
  if (tier === "tier2") return { color: "#15803d", background: "#dcfce7" };
  if (tier === "waitlisted") return { color: "#b45309", background: "#fef3c7" };
  return { color: "#374151", background: "#f3f4f6" };
}

function getStatusBadgeStyle(status) {
  if (status === "accepted") return { color: "#15803d", background: "#dcfce7" };
  if (status === "declined") return { color: "#b91c1c", background: "#fee2e2" };
  if (status === "waitlisted") return { color: "#b45309", background: "#fef3c7" };
  if (status === "invited") return { color: "#0369a1", background: "#e0f2fe" };
  if (status === "not_invited") return { color: "#6b7280", background: "#f3f4f6" };
  return { color: "#6b7280", background: "#f3f4f6" };
}

function buildPreviewTemplate(template, replacements) {
  return String(template || "")
    .replace(/{{\s*full_name\s*}}/g, replacements.full_name)
    .replace(/{{\s*event_name\s*}}/g, replacements.event_name)
    .replace(/{{\s*rsvp_link\s*}}/g, replacements.rsvp_link);
}

const BASE_URL = import.meta.env.VITE_SUPABASE_URL;
const UI = {
  bg: "#f9fafb",
  card: "#ffffff",
  border: "#e5e7eb",
  text: "#111827",
  muted: "#6b7280",
  accent: "#2563eb",
  dark: "#111827",
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState(null);
  const [stage, setStage] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showFinal, setShowFinal] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [starting, setStarting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [guests, setGuests] = useState([]);
  const [timingMode, setTimingMode] = useState("standard"); // 'standard' or 'fast-demo'
  const [stageWindowMinutes, setStageWindowMinutes] = useState(2880); // default 48h
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [guestToken, setGuestToken] = useState(null);
  const [guestInvites, setGuestInvites] = useState([]);
  const [loadingGuestDetails, setLoadingGuestDetails] = useState(false);
  const [guestSearch, setGuestSearch] = useState("");
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestEmail, setNewGuestEmail] = useState("");
  const [newGuestTier, setNewGuestTier] = useState("tier1");

  // --- Event Settings Save Handler ---
  async function handleSaveSettings() {
    if (!event) return;
    setActionMsg("");
    setLoading(true);
    try {
      const { error } = await supabase
        .from("gala_events")
        .update({
          name: event.name,
          total_capacity: event.total_capacity,
          founder_guest_limit: event.founder_guest_limit,
          stage_window_minutes: stageWindowMinutes,
        })
        .eq("id", event.id);
      if (error) throw error;
      setShowSettings(false);
      setActionMsg("Event settings saved!");
      await loadDashboard();
    } catch (err) {
      setActionMsg(err.message || "Failed to save event settings.");
    } finally {
      setLoading(false);
    }
  }

  // --- Guest List Upload and Add Guest Handlers ---
  async function handleGuestListUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setActionMsg("");
    setLoading(true);
    // Helper to check if a row is empty
    const isRowEmpty = (row) => {
      if (Array.isArray(row)) {
        return row.every(cell => !cell || String(cell).trim() === "");
      } else if (typeof row === "object" && row !== null) {
        return Object.values(row).every(cell => !cell || String(cell).trim() === "");
      }
      return true;
    };
    // Helper to coerce object row to array if needed, and trim trailing empty columns
    const objectRowToArray = (row) => {
      if (Array.isArray(row)) {
        // Remove trailing empty columns and trim all values
        const trimmed = row.map(cell => (cell ? String(cell).trim() : ""));
        while (trimmed.length > 2 && (!trimmed[trimmed.length - 1] || trimmed[trimmed.length - 1] === "")) {
          trimmed.pop();
        }
        return trimmed;
      }
      if (typeof row === "object" && row !== null) {
        // Try to get first two values (name/email), trim them
        const vals = Object.values(row).map(cell => (cell ? String(cell).trim() : ""));
        return [vals[0], vals[1]];
      }
      return [];
    };
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let guests = [];
        // If header row is missing or only has one column, or if all header fields are empty, try parsing without header
        const likelyHeaderless =
          results.meta.fields.length < 2 ||
          results.data.length === 0 ||
          results.meta.fields.every(f => !f || String(f).trim() === "");
        if (likelyHeaderless) {
          // Re-parse without header
          Papa.parse(file, {
            header: false,
            skipEmptyLines: true,
            complete: async (raw) => {
              guests = raw.data
                .map(objectRowToArray)
                .filter(row => Array.isArray(row) && row.length >= 2 && !isRowEmpty(row))
                .map(row => ({
                  event_id: event.id,
                  full_name: row[0],
                  email: row[1],
                  tier: "tier1"
                }))
                .filter(g => g.full_name && g.email && g.tier);
              if (guests.length === 0) {
                setActionMsg("No valid guests found in CSV.");
                setLoading(false);
                return;
              }
              try {
                const { error } = await supabase
                  .from("gala_guests")
                  .upsert(guests, { onConflict: "event_id,email" });
                if (error) throw error;
                setActionMsg(`Uploaded ${guests.length} guests.`);
                await loadDashboard();
              } catch (err) {
                setActionMsg(err.message || "Failed to upload guests.");
              } finally {
                setLoading(false);
              }
            },
            error: (err) => {
              setActionMsg("CSV parse error: " + err.message);
              setLoading(false);
            }
          });
          return;
        }
        // Normal header-based parsing
        guests = results.data
          .filter(row => !isRowEmpty(row))
          .map(row => ({
            event_id: event.id,
            full_name: row.full_name || row.name || "",
            email: row.email || "",
            tier: row.tier || "tier1"
          }))
          .filter(g => g.full_name && g.email && g.tier);
        if (guests.length === 0) {
          setActionMsg("No valid guests found in CSV.");
          setLoading(false);
          return;
        }
        try {
          const { error } = await supabase
            .from("gala_guests")
            .upsert(guests, { onConflict: "event_id,email" });
          if (error) throw error;
          setActionMsg(`Uploaded ${guests.length} guests.`);
          await loadDashboard();
        } catch (err) {
          setActionMsg(err.message || "Failed to upload guests.");
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        setActionMsg("CSV parse error: " + err.message);
        setLoading(false);
      }
    });
  }

  async function handleAddGuest() {
    if (!event) return;
    const full_name = newGuestName.trim();
    const email = newGuestEmail.trim();
    if (!full_name || !email) {
      setActionMsg("Please enter a name and email.");
      return;
    }
    const tier = newGuestTier === "waitlisted" ? "tier1" : newGuestTier;
    const status = newGuestTier === "waitlisted" ? "waitlisted" : "not_invited";
    setActionMsg("");
    setLoading(true);
    try {
      const { error } = await supabase
        .from("gala_guests")
        .insert({ event_id: event.id, full_name, email, tier, status });
      if (error) throw error;
      setActionMsg("Guest added!");
      setNewGuestName("");
      setNewGuestEmail("");
      setNewGuestTier("tier1");
      await loadDashboard();
    } catch (err) {
      setActionMsg(err.message || "Failed to add guest.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDashboard() {
    setLoading(true);
    setActionMsg("");
    try {
      // Fetch event summary and stats from new backend view or RPC
      const { data: initialEventData } = await supabase
        .from("gala_events")
        .select("*, email_template_founders, email_template_default, email_template_tier1, email_template_tier2, email_template_reminder, email_subject_founders, email_subject_tier1, email_subject_tier2, email_subject_reminder, reminder_max_per_stage")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      let eventData = initialEventData;
      setEvent(eventData);

      // Set timing mode and window
      if (eventData?.stage_window_minutes) {
        setStageWindowMinutes(eventData.stage_window_minutes);
        setTimingMode(eventData.stage_window_minutes <= 30 ? "fast-demo" : "standard");
      }

      // Fetch stats for the same event_id as the loaded event
      let statsData = null;
      if (eventData?.id) {
        await fetch(`${BASE_URL}/functions/v1/advance-gala`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ event_id: eventData.id }),
        });

        const { data: refreshedEventData } = await supabase
          .from("gala_events")
          .select("*, email_template_founders, email_template_default, email_template_tier1, email_template_tier2, email_template_reminder, email_subject_founders, email_subject_tier1, email_subject_tier2, email_subject_reminder, reminder_max_per_stage")
          .eq("id", eventData.id)
          .maybeSingle();

        if (refreshedEventData) {
          setEvent(refreshedEventData);
          eventData = refreshedEventData;
        }

        const { data } = await supabase
          .from("gala_event_stats")
          .select("*")
          .eq("event_id", eventData.id)
          .maybeSingle();
        statsData = data;
      }
      setStats(statsData);

      setStage(getStage(eventData));
      setShowFinal(!!eventData?.completed_at);

      // Fetch guests for this event
      if (eventData?.id) {
        const { data: guestData } = await supabase
          .from("gala_guests")
          .select("id, full_name, email, tier, status, reminder_count, last_reminder_at, last_reminder_stage")
          .eq("event_id", eventData.id)
          .order("id", { ascending: true });
        setGuests(guestData || []);
      } else {
        setGuests([]);
      }
    } catch (err) {
      setActionMsg(err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdvanceStages() {
    if (!event?.id) return;
    setAdvancing(true);
    setActionMsg("");
    try {
      const res = await fetch(`${BASE_URL}/functions/v1/advance-gala`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ event_id: event.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to advance stages.");
      setActionMsg("Stage progression checked.");
      await loadDashboard();
    } catch (err) {
      setActionMsg(err.message || "Failed to advance stages.");
    } finally {
      setAdvancing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function startInvitations() {
    setStarting(true);
    setActionMsg("");
    try {
      // Use event_id instead of eventId in payload for backend compatibility
      const res = await fetch(`${BASE_URL}/functions/v1/admin-gala`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ action: "start_gala_invitations", event_id: event?.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        setActionMsg(json.error || "Failed to start invitations.");
        setStarting(false);
        return;
      }
      setActionMsg("Invitations started!");
      await loadDashboard();
    } catch (err) {
      setActionMsg(err.message || "Network error.");
    } finally {
      setStarting(false);
    }
  }

  if (loading) return <div style={{ padding: 24 }}>Loading dashboard...</div>;

  // --- Reset Event Handler ---
  async function handleResetEvent() {
    if (!event?.id) return;
    if (!window.confirm("Are you sure you want to reset this event? This will clear all invitations, stats, and tokens, but KEEP the guest list. This cannot be undone.")) return;
    setActionMsg("");
    setLoading(true);
    try {
      // Delete all RSVP tokens for this event
      const { error: tokenError } = await supabase
        .from("gala_rsvp_tokens")
        .delete()
        .eq("event_id", event.id);
      if (tokenError) throw tokenError;

      // Delete all invitations for this event
      const { error: inviteError } = await supabase
        .from("gala_invites")
        .delete()
        .eq("event_id", event.id);
      if (inviteError) throw inviteError;

      // Reset all guest statuses for this event
      const { error: guestError } = await supabase
        .from("gala_guests")
        .update({ status: "not_invited", reminder_count: 0, last_reminder_at: null, last_reminder_stage: null })
        .eq("event_id", event.id);
      if (guestError) throw guestError;

      // Optionally, reset event status fields
      const { error: eventError } = await supabase
        .from("gala_events")
        .update({
          invitations_started_at: null,
          founder_window_ends_at: null,
          tier1_window_ends_at: null,
          tier2_window_ends_at: null,
          completed_at: null
        })
        .eq("id", event.id);
      if (eventError) throw eventError;

      setActionMsg("Event reset: all invitations, tokens, guest statuses, and stats cleared. Guest list kept.");
      await loadDashboard();
    } catch (err) {
      setActionMsg(err.message || "Failed to reset event.");
    } finally {
      setLoading(false);
    }
  }

  // --- Edit Guest Tier Handler ---
  async function handleEditTier(guest, nextTierValue) {
    if (!nextTierValue) return;
    const newTier = nextTierValue === "waitlisted" ? guest.tier : nextTierValue;
    const shouldWaitlist = nextTierValue === "waitlisted";
    if (!shouldWaitlist && newTier === guest.tier && guest.status !== "waitlisted") return;
    setActionMsg("");
    setLoading(true);
    try {
      const { error } = await supabase
        .from("gala_guests")
        .update({ tier: newTier, status: shouldWaitlist ? "waitlisted" : "not_invited" })
        .eq("id", guest.id);
      if (error) throw error;
      setActionMsg("Guest tier updated.");
      await loadDashboard();
    } catch (err) {
      setActionMsg(err.message || "Failed to update guest tier.");
    } finally {
      setLoading(false);
    }
  }

  // --- Delete Guest Handler ---
  async function handleDeleteGuest(guest) {
    if (!window.confirm(`Delete guest ${guest.full_name}? This cannot be undone.`)) return;
    setActionMsg("");
    setLoading(true);
    try {
      const { error } = await supabase
        .from("gala_guests")
        .delete()
        .eq("id", guest.id);
      if (error) throw error;
      setActionMsg("Guest deleted.");
      await loadDashboard();
    } catch (err) {
      setActionMsg(err.message || "Failed to delete guest.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddToWaitlist(guest) {
    setActionMsg("");
    setLoading(true);
    try {
      const { error } = await supabase
        .from("gala_guests")
        .update({ status: "waitlisted" })
        .eq("id", guest.id);
      if (error) throw error;
      setActionMsg("Guest added to waitlist.");
      await loadDashboard();
    } catch (err) {
      setActionMsg(err.message || "Failed to add to waitlist.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveFromWaitlist(guest) {
    setActionMsg("");
    setLoading(true);
    try {
      const { error } = await supabase
        .from("gala_guests")
        .update({ status: "not_invited" })
        .eq("id", guest.id);
      if (error) throw error;
      setActionMsg("Guest removed from waitlist.");
      await loadDashboard();
    } catch (err) {
      setActionMsg(err.message || "Failed to remove from waitlist.");
    } finally {
      setLoading(false);
    }
  }

  async function openGuestDetails(guest) {
    setSelectedGuest(guest);
    setGuestToken(null);
    setGuestInvites([]);
    setLoadingGuestDetails(true);
    try {
      const { data: tokenRow } = await supabase
        .from("gala_rsvp_tokens")
        .select("token, used, expires_at")
        .eq("guest_id", guest.id)
        .maybeSingle();
      setGuestToken(tokenRow || null);

      const { data: inviteRows } = await supabase
        .from("gala_invites")
        .select("id, subject, delivery_status, sent_at")
        .eq("guest_id", guest.id)
        .order("sent_at", { ascending: false })
        .limit(5);
      setGuestInvites(inviteRows || []);
    } catch (err) {
      setActionMsg(err.message || "Failed to load guest details.");
    } finally {
      setLoadingGuestDetails(false);
    }
  }

  // --- Send Invitation Handler ---
  async function handleSendInvitation(guest) {
    setActionMsg("");
    setLoading(true);
    try {
      if (guest.status === "waitlisted") {
        const { error: waitlistError } = await supabase
          .from("gala_guests")
          .update({ status: "not_invited" })
          .eq("id", guest.id);
        if (waitlistError) throw waitlistError;
      }
      const res = await fetch(`${BASE_URL}/functions/v1/admin-gala`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ action: "send_invitation", guest_id: guest.id, event_id: event.id })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send invitation.");
      setActionMsg("Invitation sent!");
      await loadDashboard();
    } catch (err) {
      setActionMsg(err.message || "Failed to send invitation.");
    } finally {
      setLoading(false);
    }
  }

  const filteredGuests = guests.filter((g) => {
    if (!guestSearch.trim()) return true;
    const term = guestSearch.trim().toLowerCase();
    return String(g.full_name || "").toLowerCase().includes(term)
      || String(g.email || "").toLowerCase().includes(term);
  });
  const filteredWaitlist = filteredGuests.filter((g) => g.status === "waitlisted");
  const filteredMainGuests = filteredGuests.filter((g) => g.status !== "waitlisted");

  return (
    <div style={{ background: UI.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1.1fr) minmax(260px, 1fr)", gap: 20, alignItems: "start" }}>
          <div>
            <h1 style={{ marginBottom: 8, fontSize: 30, color: UI.text }}>{event?.name || "Gala Event"}</h1>
            <p style={{ color: UI.muted, marginBottom: 16, maxWidth: 640 }}>
              Manage invitations, track responses, and keep your guest list organized in one calm, reliable place.
            </p>
            {!event?.invitations_started_at && (
              <button
                style={{
                  background: UI.dark,
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 16,
                  border: "none",
                  borderRadius: 999,
                  padding: "12px 22px",
                  cursor: "pointer",
                }}
                onClick={startInvitations}
                disabled={starting}
              >
                {starting ? "Starting..." : "Start Guest Invitations"}
              </button>
            )}
            <div style={{ marginTop: 8, color: UI.muted, fontSize: 13 }}>
              The invitation timer starts after you click Start Guest Invitations.
            </div>
            <div style={{ marginTop: 10, color: UI.muted, fontSize: 13 }}>
              Ambassadors may still confirm later if space remains available.
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 260, background: UI.card, borderRadius: 16, padding: 20, border: `1px solid ${UI.border}` }}>
            <div style={{ fontSize: 13, color: UI.muted, marginBottom: 8 }}>Event Name</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{event?.name || "—"}</div>
            <div style={{ fontSize: 13, color: UI.muted, marginTop: 12 }}>Total Capacity</div>
            <div style={{ fontSize: 18 }}>{event?.total_capacity ?? "—"}</div>
            <div style={{ fontSize: 13, color: UI.muted, marginTop: 12 }}>Ambassador Guest Allowance</div>
            <div style={{ fontSize: 18 }}>{event?.founder_guest_limit ?? "—"}</div>
            <div style={{ fontSize: 13, color: UI.muted, marginTop: 12 }}>Stage Timing</div>
            <div style={{ fontSize: 15, marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>
                {stageWindowMinutes <= 30 ? "Fast Demo" : "Standard"} ({stageWindowMinutes} minutes)
              </span>
              <button style={{ marginLeft: 12, fontSize: 13, padding: '4px 10px', borderRadius: 999, border: `1px solid ${UI.accent}`, background: '#fff', color: UI.accent, cursor: 'pointer' }} onClick={() => setShowSettings(true)}>
                Edit Event Settings
              </button>
            </div>
            {showSettings && (
              <div style={{ marginTop: 16, background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Edit Event Settings</div>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  Event Name:
                  <input
                    type="text"
                    value={event?.name || ''}
                    onChange={e => setEvent({ ...event, name: e.target.value })}
                    style={{ marginLeft: 8, padding: 6, borderRadius: 8, border: `1px solid ${UI.border}` }}
                  />
                </label>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  Total Capacity:
                  <input
                    type="number"
                    value={event?.total_capacity || ''}
                    onChange={e => setEvent({ ...event, total_capacity: parseInt(e.target.value) })}
                    style={{ marginLeft: 8, padding: 6, borderRadius: 8, border: `1px solid ${UI.border}` }}
                  />
                </label>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  Ambassador Guest Allowance:
                  <input
                    type="number"
                    value={event?.founder_guest_limit || ''}
                    onChange={e => setEvent({ ...event, founder_guest_limit: parseInt(e.target.value) })}
                    style={{ marginLeft: 8, padding: 6, borderRadius: 8, border: `1px solid ${UI.border}` }}
                  />
                </label>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  Stage Timing:
                  <select
                    value={timingMode}
                    onChange={e => {
                      const mode = e.target.value;
                      setTimingMode(mode);
                      setStageWindowMinutes(mode === "fast-demo" ? 30 : 2880);
                    }}
                    style={{ marginLeft: 8, padding: 6, borderRadius: 8, border: `1px solid ${UI.border}` }}
                  >
                    <option value="standard">Standard (48 hours)</option>
                    <option value="fast-demo">Fast Demo (30 minutes)</option>
                  </select>
                </label>
                <button
                  style={{ marginTop: 8, padding: '8px 18px', borderRadius: 999, border: `1px solid ${UI.accent}`, background: UI.accent, color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                  onClick={handleSaveSettings}
                >
                  Save
                </button>
                <button
                  style={{ marginLeft: 8, padding: '8px 18px', borderRadius: 999, border: `1px solid ${UI.border}`, background: '#fff', color: '#333', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => setShowSettings(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

      <div style={{ marginTop: 24 }}>
        <InvitationProgressCard event={event} stats={stats} stage={stage} />
      </div>

      {/* Reset Event Button */}
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <button
          style={{ background: '#fff', color: UI.accent, fontWeight: 600, border: `1px solid ${UI.accent}`, borderRadius: 999, padding: '8px 20px', cursor: 'pointer', marginRight: 8 }}
          onClick={handleAdvanceStages}
          disabled={advancing}
        >
          {advancing ? "Checking..." : "Refresh Stage Status"}
        </button>
        <button
          style={{ background: '#b91c1c', color: '#fff', fontWeight: 600, border: 'none', borderRadius: 999, padding: '8px 20px', cursor: 'pointer' }}
          onClick={handleResetEvent}
        >
          Reset Event
        </button>
      </div>

      {/* Guest Management Section */}
      <div style={{ background: UI.card, borderRadius: 16, padding: 20, border: `1px solid ${UI.border}`, marginBottom: 32 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: UI.accent }}>Guest List</div>
        <div style={{ color: UI.muted, marginBottom: 8 }}>
          Upload your guest list (CSV), add, edit, or remove guests as needed. You can also send invitations individually if required.
        </div>
        <div style={{ color: UI.muted, fontSize: 13, marginBottom: 12 }}>
          Names, event title, and RSVP links are filled automatically when invitations are sent.
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <input
            type="file"
            accept=".csv"
            onChange={handleGuestListUpload}
          />
          <input
            type="text"
            placeholder="Search guest name or email"
            value={guestSearch}
            onChange={(e) => setGuestSearch(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 10, border: `1px solid ${UI.border}`, minWidth: 220 }}
          />
          <button
            style={{ padding: '8px 18px', borderRadius: 999, border: `1px solid ${UI.accent}`, background: UI.accent, color: '#fff', fontWeight: 600, cursor: 'pointer' }}
            onClick={handleAddGuest}
          >
            Add Guest Manually
          </button>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Guest name"
            value={newGuestName}
            onChange={(e) => setNewGuestName(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 10, border: `1px solid ${UI.border}` }}
          />
          <input
            type="email"
            placeholder="Guest email"
            value={newGuestEmail}
            onChange={(e) => setNewGuestEmail(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 10, border: `1px solid ${UI.border}` }}
          />
          <select
            value={newGuestTier}
            onChange={(e) => setNewGuestTier(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 10, border: `1px solid ${UI.border}` }}
          >
            <option value="founder">Ambassador</option>
            <option value="tier1">Tier 1</option>
            <option value="tier2">Tier 2</option>
            <option value="waitlisted">Waitlist</option>
          </select>
        </div>

        {/* Guest List Table */}
        {filteredMainGuests.length > 0 ? (
          <div style={{ maxHeight: 600, overflowY: "auto", borderRadius: 12, border: `1px solid ${UI.border}`, background: "#fff" }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: 10, borderBottom: `1px solid ${UI.border}`, textAlign: 'left', position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>Name</th>
                  <th style={{ padding: 10, borderBottom: `1px solid ${UI.border}`, textAlign: 'left', position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>Email</th>
                  <th style={{ padding: 10, borderBottom: `1px solid ${UI.border}`, textAlign: 'left', position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>Tier</th>
                  <th style={{ padding: 10, borderBottom: `1px solid ${UI.border}`, textAlign: 'left', position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>Status</th>
                  <th style={{ padding: 10, borderBottom: `1px solid ${UI.border}`, textAlign: 'left', position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>Reminder Count</th>
                  <th style={{ padding: 10, borderBottom: `1px solid ${UI.border}`, textAlign: 'left', position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>Last Reminder</th>
                  <th style={{ padding: 10, borderBottom: `1px solid ${UI.border}`, textAlign: 'left', position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMainGuests.map(g => (
                  <tr key={g.id}>
                  <td style={{ padding: 10, borderBottom: `1px solid ${UI.border}` }}>{g.full_name || '—'}</td>
                  <td style={{ padding: 10, borderBottom: `1px solid ${UI.border}` }}>{g.email || '—'}</td>
                  <td style={{ padding: 10, borderBottom: `1px solid ${UI.border}` }}>
                    <select
                      value={g.status === "waitlisted" ? "waitlisted" : g.tier}
                      onChange={(e) => handleEditTier(g, e.target.value)}
                      style={{ padding: "6px 10px", borderRadius: 10, border: `1px solid ${UI.border}`, background: getTierBadgeStyle(g.status === "waitlisted" ? "waitlisted" : g.tier).background, color: getTierBadgeStyle(g.status === "waitlisted" ? "waitlisted" : g.tier).color, fontWeight: 600 }}
                    >
                      <option value="founder">Ambassador</option>
                      <option value="tier1">Tier 1</option>
                      <option value="tier2">Tier 2</option>
                      <option value="waitlisted">Waitlist</option>
                    </select>
                  </td>
                  <td style={{ padding: 10, borderBottom: `1px solid ${UI.border}` }}>
                    <span style={{ padding: "3px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600, ...getStatusBadgeStyle(g.status) }}>
                      {getStatusLabel(g.status)}
                    </span>
                  </td>
                  <td style={{ padding: 10, borderBottom: `1px solid ${UI.border}` }}>{g.reminder_count ?? 0}</td>
                  <td style={{ padding: 10, borderBottom: `1px solid ${UI.border}` }}>{formatDateTime(g.last_reminder_at)}</td>
                  <td style={{ padding: 10, borderBottom: `1px solid ${UI.border}` }}>
                    <button style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, border: '1px solid #64748b', background: '#fff', color: '#334155', cursor: 'pointer', marginRight: 6 }} onClick={() => openGuestDetails(g)}>
                      Details
                    </button>
                    <button style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, border: `1px solid ${UI.accent}`, background: UI.accent, color: '#fff', cursor: 'pointer', marginRight: 6 }} onClick={() => handleSendInvitation(g)}>
                      Send Invitation
                    </button>
                    {g.status !== "waitlisted" ? (
                      <button style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, border: '1px solid #0ea5e9', background: '#fff', color: '#0ea5e9', cursor: 'pointer', marginRight: 6 }} onClick={() => handleAddToWaitlist(g)}>
                        Add to Waitlist
                      </button>
                    ) : (
                      <button style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, border: '1px solid #0ea5e9', background: '#fff', color: '#0ea5e9', cursor: 'pointer', marginRight: 6 }} onClick={() => handleRemoveFromWaitlist(g)}>
                        Remove Waitlist
                      </button>
                    )}
                    <button style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, border: '1px solid #b91c1c', background: '#fff', color: '#b91c1c', cursor: 'pointer' }} onClick={() => handleDeleteGuest(g)}>
                      Delete
                    </button>
                  </td>
                </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ color: '#aaa', marginTop: 18 }}>No guests yet.</div>
        )}

        {/* Waitlist Section */}
        <div style={{ marginTop: 24, padding: 16, background: "#fff", borderRadius: 12, border: `1px solid ${UI.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: "#b45309" }}>Waitlist</div>
          {filteredWaitlist.length > 0 ? (
            <table style={{ width: '100%', background: '#fff', borderRadius: 8, borderCollapse: 'collapse', fontSize: 14, border: `1px solid ${UI.border}` }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: 8, borderBottom: `1px solid ${UI.border}`, textAlign: 'left' }}>Name</th>
                  <th style={{ padding: 8, borderBottom: `1px solid ${UI.border}`, textAlign: 'left' }}>Email</th>
                  <th style={{ padding: 8, borderBottom: `1px solid ${UI.border}`, textAlign: 'left' }}>Tier</th>
                  <th style={{ padding: 8, borderBottom: `1px solid ${UI.border}`, textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWaitlist.map(g => (
                  <tr key={g.id}>
                    <td style={{ padding: 8, borderBottom: `1px solid ${UI.border}` }}>{g.full_name || "—"}</td>
                    <td style={{ padding: 8, borderBottom: `1px solid ${UI.border}` }}>{g.email || "—"}</td>
                    <td style={{ padding: 8, borderBottom: `1px solid ${UI.border}` }}>{getTierLabel(g.tier)}</td>
                    <td style={{ padding: 8, borderBottom: `1px solid ${UI.border}` }}>
                      <button style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, border: '1px solid #0ea5e9', background: '#fff', color: '#0ea5e9', cursor: 'pointer', marginRight: 6 }} onClick={() => handleRemoveFromWaitlist(g)}>
                        Remove Waitlist
                      </button>
                      <button style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, border: `1px solid ${UI.accent}`, background: UI.accent, color: '#fff', cursor: 'pointer' }} onClick={() => handleSendInvitation({ ...g, status: "not_invited" })}>
                        Send Invite
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ color: "#888", fontSize: 13 }}>No waitlisted guests.</div>
          )}
        </div>
        {/* Invitation Message Preview Card (rendered once) */}
        <InvitationPreviewCard event={event} />
      </div>

      {/* Start Invitations */}
      {/* Invitation Progress Section (only once) */}
      {/* Final Report Section */}
      {showFinal && (
        <FinalReportSection stats={stats} guests={guests} />
      )}

      {actionMsg && (
        <div style={{ marginTop: 24, color: "#b91c1c", fontWeight: 500 }}>{actionMsg}</div>
      )}
      {selectedGuest && (
        <GuestDetailModal
          guest={selectedGuest}
          event={event}
          token={guestToken}
          invites={guestInvites}
          loading={loadingGuestDetails}
          onClose={() => setSelectedGuest(null)}
        />
      )}
      </div>
    </div>
  );
}

// Helper: Determine current stage and time remaining
function getStage(event) {
  if (!event) return null;
  if (!event.invitations_started_at) return { label: "Not Started" };
  const now = new Date();
  if (event.completed_at) return { label: "Complete" };
  if (event.founder_window_ends_at && now < new Date(event.founder_window_ends_at))
    return { label: "Founder Invitations", ends: event.founder_window_ends_at };
  if (event.tier1_window_ends_at && now < new Date(event.tier1_window_ends_at))
    return { label: "Tier 1 Invitations", ends: event.tier1_window_ends_at };
  if (event.tier2_window_ends_at && now < new Date(event.tier2_window_ends_at))
    return { label: "Tier 2 Invitations", ends: event.tier2_window_ends_at };
  return { label: "Invitations Closing Soon" };
}

function InvitationProgressCard({ event, stats, stage }) {
  const stageTone = stage?.label === "Founder Invitations"
    ? { color: "#6d28d9", background: "#ede9fe" }
    : stage?.label === "Tier 1 Invitations"
      ? { color: "#1d4ed8", background: "#dbeafe" }
      : stage?.label === "Tier 2 Invitations"
        ? { color: "#15803d", background: "#dcfce7" }
        : { color: "#6b7280", background: "#f3f4f6" };

  const badge = (label, value, tone) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 10, border: `1px solid ${UI.border}`, background: "#fff" }}>
      <span style={{ color: "#374151" }}>{label}</span>
      <span style={{ color: tone.color, background: tone.background, padding: "3px 8px", borderRadius: 999, fontWeight: 600, fontSize: 12 }}>{value}</span>
    </div>
  );

  return (
    <div style={{ background: UI.card, borderRadius: 16, padding: 20, border: `1px solid ${UI.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontWeight: 600, color: UI.text }}>Invitation Progress</div>
        <span style={{ color: stageTone.color, background: stageTone.background, padding: "4px 10px", borderRadius: 999, fontWeight: 600, fontSize: 12 }}>
          {stage?.label === "Founder Invitations" ? "Ambassador Invitations" : stage?.label || "—"}
        </span>
      </div>
      {stage?.ends && (
        <div style={{ marginBottom: 12, color: UI.muted }}>Time Remaining: <strong>{formatTimeRemaining(stage.ends)}</strong></div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
        {badge("Guests Invited", stats?.invited_count ?? "—", { color: "#0369a1", background: "#e0f2fe" })}
        {badge("Guests Confirmed", stats?.accepted_count ?? "—", { color: "#15803d", background: "#dcfce7" })}
        {badge("Guests Declined", stats?.declined_count ?? "—", { color: "#b91c1c", background: "#fee2e2" })}
        {badge("No Response Yet", stats?.pending_count ?? "—", { color: "#6b7280", background: "#f3f4f6" })}
        {badge("Waitlisted", stats?.waitlisted_count ?? "—", { color: "#b45309", background: "#fef3c7" })}
        {badge("Seats Confirmed", stats?.accepted_seats ?? "—", { color: "#15803d", background: "#dcfce7" })}
        {badge("Seats Remaining", stats?.remaining_seats ?? "—", { color: "#6b7280", background: "#f3f4f6" })}
      </div>
    </div>
  );
}

function FinalReportSection({ stats, guests }) {
  // Compute attendance breakdown from guests
  const attending = guests.filter(g => g.status === "accepted");
  const declined = guests.filter(g => g.status === "declined");
  const noResponse = guests.filter(g => !g.status || g.status === "pending");
  const waitlisted = guests.filter(g => g.status === "waitlisted");
  const totalSeats = stats?.accepted_seats ?? attending.length;
  const totalGuests = guests.length;

  // CSV export
  function exportCSV() {
    const rows = [
      ["Name", "Email", "Tier", "Status"],
      ...guests.map(g => [g.full_name, g.email, getTierLabel(g.tier), g.status || "pending"])
    ];
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance_report.csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  return (
    <div style={{ background: UI.card, borderRadius: 16, padding: 20, border: `1px solid ${UI.border}`, marginBottom: 32 }}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: UI.accent }}>Final Attendance Report</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
        <div style={{ padding: "8px 10px", borderRadius: 10, border: `1px solid ${UI.border}` }}>
          <span style={{ color: "#15803d", fontWeight: 600 }}>Attending:</span> {attending.length}
        </div>
        <div style={{ padding: "8px 10px", borderRadius: 10, border: `1px solid ${UI.border}` }}>
          <span style={{ color: "#b91c1c", fontWeight: 600 }}>Declined:</span> {declined.length}
        </div>
        <div style={{ padding: "8px 10px", borderRadius: 10, border: `1px solid ${UI.border}` }}>
          <span style={{ color: "#6b7280", fontWeight: 600 }}>No Response:</span> {noResponse.length}
        </div>
        <div style={{ padding: "8px 10px", borderRadius: 10, border: `1px solid ${UI.border}` }}>
          <span style={{ color: "#b45309", fontWeight: 600 }}>Waitlisted:</span> {waitlisted.length}
        </div>
        <div style={{ padding: "8px 10px", borderRadius: 10, border: `1px solid ${UI.border}` }}>
          <span style={{ color: "#15803d", fontWeight: 600 }}>Seats Confirmed:</span> {totalSeats}
        </div>
        <div style={{ padding: "8px 10px", borderRadius: 10, border: `1px solid ${UI.border}` }}>
          <span style={{ color: "#6b7280", fontWeight: 600 }}>Total Guests:</span> {totalGuests}
        </div>
      </div>
      <button style={{ marginTop: 12, padding: '8px 18px', borderRadius: 999, border: `1px solid ${UI.accent}`, background: UI.accent, color: '#fff', fontWeight: 600, cursor: 'pointer' }} onClick={exportCSV}>
        Export CSV
      </button>
    </div>
  );
}
// Invitation Message Preview Card
function InvitationPreviewCard({ event }) {
  if (!event) return null;
  const [selectedTier, setSelectedTier] = useState("founder");
  const subject = selectedTier === "founder"
    ? event.email_subject_founders || "You're Invited — Priority Access to {{event_name}}"
    : selectedTier === "tier2"
      ? event.email_subject_tier2 || "Final Invitation — {{event_name}}"
      : event.email_subject_tier1 || "You're Invited to {{event_name}}";
  const bodyTemplate = selectedTier === "founder"
    ? event.email_template_founders || "[No ambassador template set]"
    : selectedTier === "tier2"
      ? event.email_template_tier2 || event.email_template_default || "[No tier 2 template set]"
      : event.email_template_tier1 || event.email_template_default || "[No tier 1 template set]";
  return (
    <div style={{ background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 16, padding: 20, marginBottom: 32 }}>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Invitation Preview</div>
      <div style={{ color: UI.muted, fontSize: 13, marginBottom: 12 }}>This is the message your guests will receive.</div>
      <div style={{ marginBottom: 8 }}>
        <b>Subject:</b> <span style={{ color: '#2563eb' }}>{buildPreviewTemplate(subject, { full_name: "Guest Name", event_name: event?.name || "Gala Event", rsvp_link: "https://galademo.netlify.app/rsvp/your-token" })}</span>
      </div>
      <div style={{ marginBottom: 8 }}>
        <b>Email Preview:</b>
        <div style={{ background: '#f8fafc', border: `1px solid ${UI.border}`, borderRadius: 12, padding: 12, marginTop: 6 }}>
          <div style={{ background: '#fff', borderRadius: 6, padding: 12 }} dangerouslySetInnerHTML={{ __html: buildPreviewTemplate(bodyTemplate, {
            full_name: "Guest Name",
            event_name: event?.name || "Gala Event",
            rsvp_link: "https://galademo.netlify.app/rsvp/your-token"
          }) }} />
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <b>Preview as:</b>
        <select value={selectedTier} onChange={e => setSelectedTier(e.target.value)} style={{ marginLeft: 8, padding: 6, borderRadius: 10, border: `1px solid ${UI.border}` }}>
          <option value="founder">Ambassador</option>
          <option value="tier1">Tier 1</option>
          <option value="tier2">Tier 2</option>
        </select>
      </div>
      <div style={{ color: UI.muted, fontSize: 13, marginTop: 8 }}>
        The guest’s name, event name, and RSVP link are filled in automatically.
      </div>
      <div style={{ color: UI.muted, fontSize: 13, marginTop: 6 }}>
        {selectedTier === "founder" ? "Ambassadors receive the priority invitation message." : "This guest will receive the standard invitation message."}
      </div>
    </div>
  );
}

function GuestDetailModal({ guest, event, token, invites, loading, onClose }) {
  const sample = {
    full_name: guest.full_name || "Guest Name",
    event_name: event?.name || "Gala Event",
    rsvp_link: token?.token ? `${window.location.origin}/rsvp/${token.token}` : "https://example.com/rsvp/your-token",
  };

  const subject = guest.tier === "founder"
    ? event?.email_subject_founders
    : guest.tier === "tier2"
      ? event?.email_subject_tier2
      : event?.email_subject_tier1;

  const template = guest.tier === "founder"
    ? event?.email_template_founders
    : guest.tier === "tier2"
      ? event?.email_template_tier2 || event?.email_template_default
      : event?.email_template_tier1 || event?.email_template_default;

  const previewHtml = buildPreviewTemplate(template, sample);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0f172a80", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
      <div style={{ width: "92%", maxWidth: 960, background: "#fff", borderRadius: 16, padding: 24, position: "relative", boxShadow: "0 20px 60px rgba(15, 23, 42, 0.15)" }}>
        <button onClick={onClose} style={{ position: "absolute", right: 12, top: 12, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>×</button>
        <h2 style={{ marginTop: 0, fontSize: 22 }}>Guest Details</h2>
        {loading ? (
          <div>Loading details...</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16, color: "#111827" }}>
              <div><b>Name:</b> {guest.full_name}</div>
              <div><b>Email:</b> {guest.email}</div>
              <div><b>Tier:</b> {getTierLabel(guest.tier)}</div>
              <div><b>Status:</b> {getStatusLabel(guest.status)}</div>
              <div><b>Reminder Count:</b> {guest.reminder_count ?? 0}</div>
              <div><b>Last Reminder:</b> {formatDateTime(guest.last_reminder_at)}</div>
              <div><b>RSVP Token:</b> {token?.token || "—"}</div>
              <div><b>Token Expires:</b> {formatDateTime(token?.expires_at)}</div>
            </div>
            {token?.token && (
              <button
                style={{ marginBottom: 16, padding: "8px 16px", borderRadius: 999, border: `1px solid ${UI.accent}`, background: UI.accent, color: "#fff", fontWeight: 600, cursor: "pointer" }}
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/rsvp/${token.token}`)}
              >
                Copy RSVP Link
              </button>
            )}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Invite History</div>
              {invites?.length ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, border: `1px solid ${UI.border}` }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ padding: 8, borderBottom: `1px solid ${UI.border}`, textAlign: "left" }}>Subject</th>
                      <th style={{ padding: 8, borderBottom: `1px solid ${UI.border}`, textAlign: "left" }}>Status</th>
                      <th style={{ padding: 8, borderBottom: `1px solid ${UI.border}`, textAlign: "left" }}>Sent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map(row => (
                      <tr key={row.id}>
                        <td style={{ padding: 8, borderBottom: `1px solid ${UI.border}` }}>{row.subject}</td>
                        <td style={{ padding: 8, borderBottom: `1px solid ${UI.border}` }}>{row.delivery_status}</td>
                        <td style={{ padding: 8, borderBottom: `1px solid ${UI.border}` }}>{formatDateTime(row.sent_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ color: "#888", fontSize: 13 }}>No invite history.</div>
              )}
            </div>
            <div style={{ marginBottom: 8, fontWeight: 600, color: UI.accent }}>Invitation Preview</div>
            <div style={{ marginBottom: 8 }}>
              <b>Subject:</b> <span style={{ color: "#2563eb" }}>{buildPreviewTemplate(subject, sample)}</span>
            </div>
            <div style={{ border: `1px solid ${UI.border}`, borderRadius: 12, padding: 12, background: "#f8fafc" }}>
              <div style={{ background: "#fff", borderRadius: 8, padding: 12 }} dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
            <div style={{ color: UI.muted, fontSize: 12, marginTop: 8 }}>
              The guest’s name, event name, and RSVP link are filled in automatically.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatTimeRemaining(ends) {
  const ms = new Date(ends) - new Date();
  if (ms <= 0) return "Stage ended";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  let result = '';
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0 || hours > 0) result += `${minutes}m `;
  result += `${seconds}s`;
  return result.trim();
}
