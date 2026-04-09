
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function RsvpPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [seatCount, setSeatCount] = useState(1);

  useEffect(() => {
    async function loadRsvp() {
      try {
        const res = await fetch(
          `${BASE_URL}/functions/v1/public-rsvp?token=${token}`,
          {
            headers: {
              "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
              "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            }
          }
        );
        const json = await res.json();

        if (!res.ok) {
          setMessage(json.error || "Unable to load RSVP.");
          setLoading(false);
          return;
        }

        setData(json);
      } catch (err) {
        setMessage("Network error loading RSVP.");
      } finally {
        setLoading(false);
      }
    }

    loadRsvp();
  }, [token]);

  async function submitResponse(response) {
    setSubmitting(true);
    setMessage("");

    try {
      const res = await fetch(`${BASE_URL}/functions/v1/public-rsvp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          token,
          response,
          seat_count: response === "accepted" ? seatCount : 0,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setMessage(json.error || "Unable to submit RSVP.");
        setSubmitting(false);
        return;
      }

      setMessage("");
      setData((prev) => ({
        ...prev,
        guest: {
          ...prev.guest,
          status: response,
          seat_count: response === "accepted" ? seatCount : 0,
        },
        token: {
          ...prev.token,
          used: true,
          used_at: new Date().toISOString(),
        },
        rsvpConfirmed: response,
      }));
    } catch (err) {
      setMessage("Network error submitting RSVP.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div style={{ padding: 24 }}>Loading RSVP...</div>;

  if (!data)
    return <div style={{ padding: 24 }}>{message || "RSVP not found."}</div>;

  const { guest, event, token: tokenInfo, rsvpConfirmed } = data;
  const locked = tokenInfo.used || tokenInfo.expired;

  // Determine seat allowance
  let maxSeats = 1;
  let seatLabel = "";
  if (guest.tier === "founder") {
    maxSeats = guest.founder_allowance || 4;
    seatLabel = `You may RSVP for up to ${maxSeats} guests (including yourself).`;
  } else {
    maxSeats = 2;
    seatLabel = "You may RSVP for yourself and a guest (max 2).";
  }

  // Show a polished confirmation if RSVP just submitted
  if (rsvpConfirmed) {
    return (
      <div style={{ maxWidth: 640, margin: "40px auto", padding: 24, textAlign: "center" }}>
        <h1>Thank you, {guest.full_name}!</h1>
        <p style={{ fontSize: 18, marginTop: 24 }}>
          Your RSVP has been confirmed: <b style={{ textTransform: "capitalize" }}>{rsvpConfirmed}</b>
        </p>
        {guest.seat_count > 1 && rsvpConfirmed === "accepted" && (
          <p style={{ marginTop: 16 }}>Seats reserved: <b>{guest.seat_count}</b></p>
        )}
        <p style={{ marginTop: 32, color: "#666" }}>We look forward to seeing you at {event.name}!</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "40px auto", padding: 24 }}>
      <h1>{event.name}</h1>
      <p style={{ fontSize: 18 }}>Welcome, <strong>{guest.full_name}</strong>!</p>
      <p style={{ color: "#666" }}>Please confirm your attendance below. {seatLabel}</p>
      <div style={{ margin: "18px 0" }}>
        <div><strong>Email:</strong> {guest.email}</div>
        <div><strong>Tier:</strong> {guest.tier}</div>
        <div><strong>Status:</strong> {guest.status}</div>
      </div>

      {tokenInfo.expired && (
        <p style={{ color: "red" }}>This RSVP link has expired.</p>
      )}

      {tokenInfo.used && !rsvpConfirmed && (
        <p style={{ color: "orange" }}>This RSVP link has already been used.</p>
      )}

      {!locked && (
        <form
          onSubmit={e => {
            e.preventDefault();
            submitResponse("accepted");
          }}
          style={{ marginTop: 24 }}
        >
          {maxSeats > 1 && (
            <div style={{ marginBottom: 16 }}>
              <label>
                Number of guests attending:
                <select
                  value={seatCount}
                  onChange={e => setSeatCount(Number(e.target.value))}
                  style={{ marginLeft: 8, padding: 6, borderRadius: 6, border: "1px solid #ddd" }}
                  disabled={submitting}
                >
                  {Array.from({ length: maxSeats }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
            <button type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Accept Invitation"}
            </button>
            <button
              type="button"
              onClick={() => submitResponse("declined")}
              disabled={submitting}
              style={{ background: "#eee", color: "#444" }}
            >
              Decline
            </button>
          </div>
        </form>
      )}

      {message && <p style={{ marginTop: 20 }}>{message}</p>}
    </div>
  );
}
