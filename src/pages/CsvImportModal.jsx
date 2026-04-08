import { useRef } from "react";

export default function CsvImportModal({ open, onClose, onImport }) {
  const fileInput = useRef();
  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      onImport(text);
      onClose();
    };
    reader.readAsText(file);
  }
  if (!open) return null;
  return (
    <div style={modalStyle}>
      <div style={{ background: "#fff", padding: 24, borderRadius: 12, minWidth: 320, position: "relative" }}>
        <button
          onClick={onClose}
          type="button"
          style={{ position: "absolute", right: 12, top: 12, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}
          aria-label="Close"
        >
          ×
        </button>
        <h2 style={{ marginTop: 0 }}>Import Guest List (CSV)</h2>
        <input type="file" accept=".csv" ref={fileInput} onChange={handleFile} />
        <p style={{ color: "#666", marginTop: 12 }}>Upload a CSV file with guest data.</p>
      </div>
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
