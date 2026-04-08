import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function EventSettingsModal({ open, onClose, event, onSave }) {
  const [form, setForm] = useState({ name: "", total_capacity: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (event) setForm({ name: event.name, total_capacity: event.total_capacity });
  }, [event, open]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { error } = await supabase
        .from("gala_events")
        .update({
          name: form.name,
          total_capacity: form.total_capacity,
        })
        .eq("id", event.id);
      if (error) throw error;
      onSave();
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;
  return (
    <div style={modalStyle}>
      <form
        onSubmit={handleSave}
        style={{
          background: "#fff",
          padding: 24,
          borderRadius: 12,
          minWidth: 320,
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          type="button"
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            background: "none",
            border: "none",
            fontSize: 20,
            cursor: "pointer",
            color: "#888",
          }}
          aria-label="Close"
        >
          ×
        </button>
        <h2 style={{ marginTop: 0 }}>Edit Event Settings</h2>
        <div style={{ marginBottom: 12 }}>
          <label>
            Event Name<br />
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              style={inputStyle}
              required
            />
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>
            Total Capacity<br />
            <input
              value={form.total_capacity}
              onChange={e => setForm(f => ({ ...f, total_capacity: Number(e.target.value) }))}
              style={inputStyle}
              required
              type="number"
              min={1}
            />
          </label>
        </div>
        {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}
        <button
          type="submit"
          disabled={saving}
          style={{
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 18px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {saving ? "Saving..." : "Save Changes"}
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
