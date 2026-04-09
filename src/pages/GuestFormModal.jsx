import { useState } from "react";

export default function GuestFormModal({ open, onClose, onSave }) {
  const [form, setForm] = useState({ full_name: "", email: "", tier: "tier1", seat_count: 1 });
  const [saving, setSaving] = useState(false);
  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }
  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  }
  if (!open) return null;
  return (
    <div style={modalStyle}>
      <form onSubmit={handleSubmit} style={{ background: "#fff", padding: 24, borderRadius: 12, minWidth: 320, position: "relative" }}>
        <button
          onClick={onClose}
          type="button"
          style={{ position: "absolute", right: 12, top: 12, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}
          aria-label="Close"
        >
          ×
        </button>
        <h2 style={{ marginTop: 0 }}>Add Guest</h2>
        <div style={{ marginBottom: 12 }}>
          <label>
            Name<br />
            <input name="full_name" value={form.full_name} onChange={handleChange} style={inputStyle} required />
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>
            Email<br />
            <input name="email" value={form.email} onChange={handleChange} style={inputStyle} required type="email" />
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>
            Tier<br />
            <select name="tier" value={form.tier} onChange={handleChange} style={inputStyle}>
              <option value="founder">Founder</option>
              <option value="tier1">Tier 1</option>
              <option value="tier2">Tier 2</option>
              <option value="public">Public</option>
            </select>
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>
            Seats<br />
            <input name="seat_count" value={form.seat_count} onChange={handleChange} style={inputStyle} type="number" min={1} max={10} />
          </label>
        </div>
        <button type="submit" disabled={saving} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 600, cursor: "pointer" }}>
          {saving ? "Saving..." : "Add Guest"}
        </button>
      </form>
    </div>
  );
}

const modalStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "#0005",
  zIndex: 2000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const inputStyle = {
  width: "100%",
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #ddd",
  marginTop: 2,
  marginBottom: 2,
  fontSize: 15,
};
