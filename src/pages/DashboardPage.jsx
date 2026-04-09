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

function buildPreviewTemplate(template, replacements) {
  return String(template || "")
    .replace(/{{\s*full_name\s*}}/g, replacements.full_name)
    .replace(/{{\s*event_name\s*}}/g, replacements.event_name)
    .replace(/{{\s*rsvp_link\s*}}/g, replacements.rsvp_link);
}

const BASE_URL = import.meta.env.VITE_SUPABASE_URL;

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
    const full_name = window.prompt("Enter guest name:");
    if (!full_name) return;
    const email = window.prompt("Enter guest email:");
    if (!email) return;
    // Default tier for manual add (adjust as needed)
    const tier = window.prompt("Enter guest tier (e.g. founder, tier1, tier2):", "tier1");
    if (!tier) return;
    setActionMsg("");
    setLoading(true);
    try {
      const { error } = await supabase
        .from("gala_guests")
        .insert({ event_id: event.id, full_name, email, tier });
      if (error) throw error;
      setActionMsg("Guest added!");
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
  async function handleEditTier(guest) {
    const newTier = window.prompt("Edit guest tier (e.g. founder, tier1, tier2):", guest.tier);
    if (!newTier || newTier === guest.tier) return;
    setActionMsg("");
    setLoading(true);
    try {
      const { error } = await supabase
        .from("gala_guests")
        .update({ tier: newTier })
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

  return (
    <div style={{ maxWidth: 900, margin: "32px auto", padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ marginBottom: 8 }}>{event?.name || "Gala Event"} Admin</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        Welcome to your event dashboard. Upload your guest list, adjust event settings, and click <b>Start Invitations</b> when ready.<br/>
        <span style={{ color: '#b91c1c', fontWeight: 500 }}>
          The invitation timer will only start after you click <b>Start Invitations</b>. If you see a timer before starting, your event's window fields may have been set automatically by the backend.
        </span>
      </p>

      {/* Event Summary & Setup */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 260, background: "#fafafa", borderRadius: 12, padding: 18, border: "1px solid #eee" }}>
          <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>Event Name</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{event?.name || "—"}</div>
          <div style={{ fontSize: 13, color: "#666", marginTop: 12 }}>Total Capacity</div>
          <div style={{ fontSize: 18 }}>{event?.total_capacity ?? "—"}</div>
          <div style={{ fontSize: 13, color: "#666", marginTop: 12 }}>Ambassador Guest Allowance</div>
          <div style={{ fontSize: 18 }}>{event?.founder_guest_limit ?? "—"}</div>
          <div style={{ fontSize: 13, color: "#666", marginTop: 12 }}>Stage Timing</div>
          <div style={{ fontSize: 16, marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>
              {stageWindowMinutes <= 30 ? "Fast Demo" : "Standard"} ({stageWindowMinutes} minutes)
            </span>
            <button style={{ marginLeft: 12, fontSize: 13, padding: '2px 8px', borderRadius: 4, border: '1px solid #2563eb', background: '#fff', color: '#2563eb', cursor: 'pointer' }} onClick={() => setShowSettings(true)}>
              Edit Event Settings
            </button>
          </div>
          {showSettings && (
            <div style={{ marginTop: 16, background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Edit Event Settings</div>
              <label style={{ display: 'block', marginBottom: 8 }}>
                Event Name:
                <input
                  type="text"
                  value={event?.name || ''}
                  onChange={e => setEvent({ ...event, name: e.target.value })}
                  style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc' }}
                />
              </label>
              <label style={{ display: 'block', marginBottom: 8 }}>
                Total Capacity:
                <input
                  type="number"
                  value={event?.total_capacity || ''}
                  onChange={e => setEvent({ ...event, total_capacity: parseInt(e.target.value) })}
                  style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc' }}
                />
              </label>
              <label style={{ display: 'block', marginBottom: 8 }}>
                Ambassador Guest Allowance:
                <input
                  type="number"
                  value={event?.founder_guest_limit || ''}
                  onChange={e => setEvent({ ...event, founder_guest_limit: parseInt(e.target.value) })}
                  style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc' }}
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
                  style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc' }}
                >
                  <option value="standard">Standard (48 hours)</option>
                  <option value="fast-demo">Fast Demo (30 minutes)</option>
                </select>
              </label>
              <button
                style={{ marginTop: 8, padding: '6px 16px', borderRadius: 6, border: '1px solid #2563eb', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                onClick={handleSaveSettings}
              >
                Save
              </button>
              <button
                style={{ marginLeft: 8, padding: '6px 16px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', color: '#333', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => setShowSettings(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        <div style={{ flex: 2, minWidth: 320 }}>
          <InvitationProgressCard event={event} stats={stats} stage={stage} />
        </div>
      </div>

      {/* Reset Event Button */}
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <button
          style={{ background: '#fff', color: '#2563eb', fontWeight: 600, border: '1px solid #2563eb', borderRadius: 6, padding: '8px 20px', cursor: 'pointer', marginRight: 8 }}
          onClick={handleAdvanceStages}
          disabled={advancing}
        >
          {advancing ? "Checking..." : "Advance Stages"}
        </button>
        <button
          style={{ background: '#b91c1c', color: '#fff', fontWeight: 600, border: 'none', borderRadius: 6, padding: '8px 20px', cursor: 'pointer' }}
          onClick={handleResetEvent}
        >
          Reset Event
        </button>
      </div>

      {/* Guest Management Section */}
      <div style={{ background: "#f8fafc", borderRadius: 12, padding: 18, border: "1px solid #eee", marginBottom: 32 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Guest List</div>
        <div style={{ color: "#666", marginBottom: 8 }}>
          Upload your guest list (CSV), add, edit, or remove guests as needed. You can also send invitations individually if required.<br/>
          <span style={{ color: '#2563eb', fontSize: 13 }}>
            When a guest is marked invited, the system automatically queues their email. Invitation messages are filled automatically with the guest name, event name, and RSVP link.
          </span>
        </div>
        <input
          type="file"
          accept=".csv"
          style={{ marginBottom: 12 }}
          onChange={handleGuestListUpload}
        />
        <button
          style={{ marginLeft: 8, padding: '6px 16px', borderRadius: 6, border: '1px solid #2563eb', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
          onClick={handleAddGuest}
        >
          Add Guest Manually
        </button>

        {/* Guest List Table */}
        {guests.length > 0 ? (
          <table style={{ width: '100%', marginTop: 18, background: '#fff', borderRadius: 8, borderCollapse: 'collapse', fontSize: 15 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: 8, border: '1px solid #eee', textAlign: 'left' }}>Name</th>
                <th style={{ padding: 8, border: '1px solid #eee', textAlign: 'left' }}>Email</th>
                <th style={{ padding: 8, border: '1px solid #eee', textAlign: 'left' }}>Tier</th>
                <th style={{ padding: 8, border: '1px solid #eee', textAlign: 'left' }}>Status</th>
                <th style={{ padding: 8, border: '1px solid #eee', textAlign: 'left' }}>Reminder</th>
                <th style={{ padding: 8, border: '1px solid #eee', textAlign: 'left' }}>Last Reminder</th>
                <th style={{ padding: 8, border: '1px solid #eee', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {guests.map(g => (
                <tr key={g.id}>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>{g.full_name || '—'}</td>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>{g.email || '—'}</td>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>
                    {getTierLabel(g.tier)}{' '}
                    <button style={{ marginLeft: 6, fontSize: 13, padding: '2px 8px', borderRadius: 4, border: '1px solid #2563eb', background: '#fff', color: '#2563eb', cursor: 'pointer' }} onClick={() => handleEditTier(g)}>Edit</button>
                  </td>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>{getStatusLabel(g.status)}</td>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>{g.reminder_count ?? 0}</td>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>{formatDateTime(g.last_reminder_at)}</td>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>
                    <button style={{ fontSize: 13, padding: '2px 10px', borderRadius: 4, border: '1px solid #64748b', background: '#fff', color: '#334155', cursor: 'pointer', marginRight: 6 }} onClick={() => openGuestDetails(g)}>
                      Details
                    </button>
                    <button style={{ fontSize: 13, padding: '2px 10px', borderRadius: 4, border: '1px solid #2563eb', background: '#2563eb', color: '#fff', cursor: 'pointer', marginRight: 6 }} onClick={() => handleSendInvitation(g)}>
                      Send Invitation
                    </button>
                    {g.status !== "waitlisted" ? (
                      <button style={{ fontSize: 13, padding: '2px 10px', borderRadius: 4, border: '1px solid #0ea5e9', background: '#fff', color: '#0ea5e9', cursor: 'pointer', marginRight: 6 }} onClick={() => handleAddToWaitlist(g)}>
                        Add to Waitlist
                      </button>
                    ) : (
                      <button style={{ fontSize: 13, padding: '2px 10px', borderRadius: 4, border: '1px solid #0ea5e9', background: '#fff', color: '#0ea5e9', cursor: 'pointer', marginRight: 6 }} onClick={() => handleRemoveFromWaitlist(g)}>
                        Remove Waitlist
                      </button>
                    )}
                    <button style={{ fontSize: 13, padding: '2px 10px', borderRadius: 4, border: '1px solid #b91c1c', background: '#fff', color: '#b91c1c', cursor: 'pointer' }} onClick={() => handleDeleteGuest(g)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ color: '#aaa', marginTop: 18 }}>No guests yet.</div>
        )}

        {/* Waitlist Section */}
        <div style={{ marginTop: 24, padding: 16, background: "#fff", borderRadius: 10, border: "1px solid #eee" }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Waitlist</div>
          {guests.filter(g => g.status === "waitlisted").length > 0 ? (
            <table style={{ width: '100%', background: '#fff', borderRadius: 8, borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: 8, border: '1px solid #eee', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: 8, border: '1px solid #eee', textAlign: 'left' }}>Email</th>
                  <th style={{ padding: 8, border: '1px solid #eee', textAlign: 'left' }}>Tier</th>
                  <th style={{ padding: 8, border: '1px solid #eee', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {guests.filter(g => g.status === "waitlisted").map(g => (
                  <tr key={g.id}>
                    <td style={{ padding: 8, border: '1px solid #eee' }}>{g.full_name || "—"}</td>
                    <td style={{ padding: 8, border: '1px solid #eee' }}>{g.email || "—"}</td>
                    <td style={{ padding: 8, border: '1px solid #eee' }}>{getTierLabel(g.tier)}</td>
                    <td style={{ padding: 8, border: '1px solid #eee' }}>
                      <button style={{ fontSize: 13, padding: '2px 10px', borderRadius: 4, border: '1px solid #0ea5e9', background: '#fff', color: '#0ea5e9', cursor: 'pointer', marginRight: 6 }} onClick={() => handleRemoveFromWaitlist(g)}>
                        Remove Waitlist
                      </button>
                      <button style={{ fontSize: 13, padding: '2px 10px', borderRadius: 4, border: '1px solid #2563eb', background: '#2563eb', color: '#fff', cursor: 'pointer' }} onClick={() => handleSendInvitation({ ...g, status: "not_invited" })}>
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
      {!event?.invitations_started_at && (
        <div style={{ margin: "32px 0", textAlign: "center" }}>
          <button
            style={{
              background: "#2563eb",
              color: "#fff",
              fontWeight: 600,
              fontSize: 18,
              border: "none",
              borderRadius: 8,
              padding: "16px 36px",
              cursor: "pointer",
            }}
            onClick={startInvitations}
            disabled={starting}
          >
            {starting ? "Starting..." : "Start Invitations"}
          </button>
          <div style={{ marginTop: 12, color: '#666', fontSize: 14 }}>
            Click to begin the invitation process. The timer/countdown will start after this action.
          </div>
        </div>
      )}

      {/* Invitation Progress Section (only once) */}
      <div style={{ background: "#f8fafc", borderRadius: 12, padding: 18, border: "1px solid #eee", marginBottom: 32 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Invitation Progress</div>
        <InvitationProgressCard event={event} stats={stats} stage={stage} />
      </div>

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
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #eee" }}>
      <div style={{ marginBottom: 8 }}>
        <b>Current Stage:</b> {stage?.label === "Founder Invitations" ? "Ambassador Invitations" : stage?.label || "—"}
      </div>
      {stage?.ends && (
        <div style={{ marginBottom: 8 }}>
          <b>Time Remaining:</b> {formatTimeRemaining(stage.ends)}
        </div>
      )}
      <div style={{ marginBottom: 8 }}>
        <b>Guests Invited:</b> {stats?.invited_count ?? "—"}
      </div>
      <div style={{ marginBottom: 8 }}>
        <b>Guests Confirmed:</b> {stats?.accepted_count ?? "—"}
      </div>
      <div style={{ marginBottom: 8 }}>
        <b>Guests Declined:</b> {stats?.declined_count ?? "—"}
      </div>
      <div style={{ marginBottom: 8 }}>
        <b>No Response Yet:</b> {stats?.pending_count ?? "—"}
      </div>
      <div style={{ marginBottom: 8 }}>
        <b>Waitlisted:</b> {stats?.waitlisted_count ?? "—"}
      </div>
      <div style={{ marginBottom: 8 }}>
        <b>Total Seats Confirmed:</b> {stats?.accepted_seats ?? "—"}
      </div>
      <div>
        <b>Seats Remaining:</b> {stats?.remaining_seats ?? "—"}
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
    <div style={{ background: "#f8fafc", borderRadius: 12, padding: 18, border: "1px solid #eee", marginBottom: 32 }}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Final Attendance Report</div>
      <div style={{ marginBottom: 8 }}><b>Attending:</b> {attending.length}</div>
      <div style={{ marginBottom: 8 }}><b>Declined:</b> {declined.length}</div>
      <div style={{ marginBottom: 8 }}><b>No Response:</b> {noResponse.length}</div>
      <div style={{ marginBottom: 8 }}><b>Waitlisted:</b> {waitlisted.length}</div>
      <div style={{ marginBottom: 8 }}><b>Seats Confirmed:</b> {totalSeats}</div>
      <div style={{ marginBottom: 8 }}><b>Total Guests Processed:</b> {totalGuests}</div>
      <button style={{ marginTop: 12, padding: '6px 16px', borderRadius: 6, border: '1px solid #2563eb', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' }} onClick={exportCSV}>
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
    ? event.email_subject_founders || "You’re Invited — Priority Access to {{event_name}}"
    : selectedTier === "tier2"
      ? event.email_subject_tier2 || "Final Invitation — {{event_name}}"
      : event.email_subject_tier1 || "You’re Invited to {{event_name}}";
  const bodyTemplate = selectedTier === "founder"
    ? event.email_template_founders || "[No ambassador template set]"
    : selectedTier === "tier2"
      ? event.email_template_tier2 || event.email_template_default || "[No tier 2 template set]"
      : event.email_template_tier1 || event.email_template_default || "[No tier 1 template set]";
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 18, marginBottom: 32 }}>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Invitation Message Preview</div>
      <div style={{ marginBottom: 8 }}>
        <b>Subject:</b> <span style={{ color: '#2563eb' }}>{buildPreviewTemplate(subject, { full_name: "Guest Name", event_name: event?.name || "Gala Event", rsvp_link: "https://galademo.netlify.app/rsvp/your-token" })}</span>
      </div>
      <div style={{ marginBottom: 8 }}>
        <b>Email Preview:</b>
        <div style={{ background: '#f8fafc', border: '1px solid #eee', borderRadius: 6, padding: 12, marginTop: 4 }}>
          <div style={{ background: '#fff', borderRadius: 6, padding: 12 }} dangerouslySetInnerHTML={{ __html: buildPreviewTemplate(bodyTemplate, {
            full_name: "Guest Name",
            event_name: event?.name || "Gala Event",
            rsvp_link: "https://galademo.netlify.app/rsvp/your-token"
          }) }} />
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <b>Preview as:</b>
        <select value={selectedTier} onChange={e => setSelectedTier(e.target.value)} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc' }}>
          <option value="founder">Ambassador</option>
          <option value="tier1">Tier 1</option>
          <option value="tier2">Tier 2</option>
        </select>
      </div>
      <div style={{ color: '#666', fontSize: 13, marginTop: 8 }}>
        The guest’s name, event name, and RSVP link are filled in automatically when the email is sent.<br/>
        Each guest gets one unique RSVP link in the format <b>/rsvp/:token</b>.
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
    <div style={{ position: "fixed", inset: 0, background: "#0006", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
      <div style={{ width: "90%", maxWidth: 900, background: "#fff", borderRadius: 12, padding: 20, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", right: 12, top: 12, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>×</button>
        <h2 style={{ marginTop: 0 }}>Guest Details</h2>
        {loading ? (
          <div>Loading details...</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
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
                style={{ marginBottom: 16, padding: "6px 12px", borderRadius: 6, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer" }}
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/rsvp/${token.token}`)}
              >
                Copy RSVP Link
              </button>
            )}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Invite History</div>
              {invites?.length ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9" }}>
                      <th style={{ padding: 8, border: "1px solid #eee", textAlign: "left" }}>Subject</th>
                      <th style={{ padding: 8, border: "1px solid #eee", textAlign: "left" }}>Status</th>
                      <th style={{ padding: 8, border: "1px solid #eee", textAlign: "left" }}>Sent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map(row => (
                      <tr key={row.id}>
                        <td style={{ padding: 8, border: "1px solid #eee" }}>{row.subject}</td>
                        <td style={{ padding: 8, border: "1px solid #eee" }}>{row.delivery_status}</td>
                        <td style={{ padding: 8, border: "1px solid #eee" }}>{formatDateTime(row.sent_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ color: "#888", fontSize: 13 }}>No invite history.</div>
              )}
            </div>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>Invitation Preview</div>
            <div style={{ marginBottom: 8 }}>
              <b>Subject:</b> <span style={{ color: "#2563eb" }}>{buildPreviewTemplate(subject, sample)}</span>
            </div>
            <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, background: "#f8fafc" }}>
              <div style={{ background: "#fff", borderRadius: 8, padding: 12 }} dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
            <div style={{ color: "#666", fontSize: 12, marginTop: 8 }}>
              The guest’s name, event name, and RSVP link are filled in automatically when the email is sent.
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
