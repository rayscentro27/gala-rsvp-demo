
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import CsvImportModal from "./CsvImportModal";
import GuestFormModal from "./GuestFormModal";

export default function GuestManagementSection({ event }) {
  const [guests, setGuests] = useState([]);
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [csvOpen, setCsvOpen] = useState(false);
  const [guestFormOpen, setGuestFormOpen] = useState(false);

  async function loadGuests() {
    setLoading(true);
    setError("");
    try {
      let query = supabase.from("gala_guests").select("*");
      if (tier) query = query.eq("tier", tier);
      if (status) query = query.eq("status", status);
      const { data, error } = await query.order("full_name", { ascending: true });
      if (error) throw error;
      setGuests(data || []);
    } catch (err) {
      setError(err.message || "Unable to load guests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGuests();
    // eslint-disable-next-line
  }, [tier, status]);

  // Listen for dashboard triggers
  useEffect(() => {
    const csvBtn = document.getElementById("guest-mgmt-upload-csv");
    const addBtn = document.getElementById("guest-mgmt-add-guest");
    if (csvBtn) csvBtn.onclick = () => setCsvOpen(true);
    if (addBtn) addBtn.onclick = () => setGuestFormOpen(true);
    return () => {
      if (csvBtn) csvBtn.onclick = null;
      if (addBtn) addBtn.onclick = null;
    };
  }, []);

  const filtered = guests.filter(g => {
    if (!search) return true;
    return (
      g.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      g.email?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 20, background: "#fff", marginBottom: 24 }}>
      <h2 style={{ marginTop: 0 }}>Guest Management</h2>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search guests..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ddd", minWidth: 180 }}
        />
        <select value={tier} onChange={e => setTier(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #ddd" }}>
          <option value="">All Tiers</option>
          <option value="founder">Founder</option>
          <option value="tier1">Tier 1</option>
          <option value="tier2">Tier 2</option>
          <option value="public">Public</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #ddd" }}>
          <option value="">All Statuses</option>
          <option value="invited">Invited</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
          <option value="pending">Pending</option>
          <option value="waitlisted">Waitlisted</option>
        </select>
        {/* Add Guest and Upload CSV buttons (triggered by DashboardPage) */}
        <button id="guest-mgmt-add-guest" style={{ display: "none" }} />
        <button id="guest-mgmt-upload-csv" style={{ display: "none" }} />
      </div>
      {loading ? (
        <div>Loading guests...</div>
      ) : error ? (
        <div style={{ color: "crimson" }}>{error}</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
            <thead>
              <tr style={{ background: "#f4f4f4" }}>
                <th>Name</th>
                <th>Email</th>
                <th>Tier</th>
                <th>Status</th>
                <th>Seats</th>
                <th>RSVP At</th>
                <th>Reminder Count</th>
                <th>Last Reminder</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(guest => (
                <tr key={guest.id}>
                  <td>{guest.full_name}</td>
                  <td>{guest.email}</td>
                  <td>{guest.tier}</td>
                  <td>{guest.status}</td>
                  <td>{guest.seat_count || 1}</td>
                  <td>{guest.rsvp_at ? new Date(guest.rsvp_at).toLocaleString() : "—"}</td>
                  <td>{guest.reminder_count ?? 0}</td>
                  <td>{guest.last_reminder_at ? new Date(guest.last_reminder_at).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CsvImportModal open={csvOpen} onClose={() => setCsvOpen(false)} onImport={text => {/* handle CSV import here */}} />
      <GuestFormModal open={guestFormOpen} onClose={() => setGuestFormOpen(false)} onSave={async form => {/* handle add guest here */}} />
    </div>
  );
}
