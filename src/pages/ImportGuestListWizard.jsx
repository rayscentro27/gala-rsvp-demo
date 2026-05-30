import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabase";

const TIER_LABELS = [
  { key: "founder", label: "Ambassador" },
  { key: "tier1", label: "Tier 1" },
  { key: "tier2", label: "Tier 2" },
  { key: "waitlist", label: "Waitlist" },
  { key: "ignore", label: "Ignore Row" },
];

const SAMPLE_CSV = `full_name,email,tier,guest_count
Alexandra Pierce,alexandra@example.com,Ambassador,2
Marcus Bennett,marcus@example.com,Tier 1,1
Olivia Brooks,olivia@example.com,Tier 2,1`;

function normalizeCell(value) {
  return String(value ?? "").trim();
}

function sanitizeHeader(value, index) {
  const cleaned = String(value ?? "").trim();
  return cleaned || `Column ${index + 1}`;
}

function detectDefaultIndex(headers, guesses) {
  const normalized = headers.map((h) => String(h).trim().toLowerCase());
  return guesses.reduce((found, guess) => {
    if (found !== -1) return found;
    const key = guess.toLowerCase();
    return normalized.findIndex((value) => value === key || value.includes(key));
  }, -1);
}

function normalizeTierMappingValue(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "tier1";
  if (raw.includes("wait")) return "waitlist";
  if (raw.includes("founder") || raw.includes("ambassador") || raw.includes("vip") || raw.includes("host")) return "founder";
  if (raw.includes("tier 1") || raw.includes("tier1") || raw.includes("gold") || raw.includes("donor") || raw.includes("sponsor")) return "tier1";
  if (raw.includes("tier 2") || raw.includes("tier2") || raw.includes("general") || raw.includes("guest")) return "tier2";
  return "tier1";
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function hasColumn(value) {
  return value !== "" && value !== null && value !== undefined;
}

async function readUploadedFile(file) {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv")) {
    const text = await file.text();
    const workbook = XLSX.read(text, { type: "string" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    return rows;
  }
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
}

function buildHeadersAndRows(rawRows) {
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    return { headers: [], rows: [] };
  }
  const headerRow = rawRows[0].map(sanitizeHeader);
  const rows = rawRows
    .slice(1)
    .map((row) => Array.isArray(row) ? row.map(normalizeCell) : [])
    .filter((row) => row.some((cell) => cell !== ""));
  return { headers: headerRow, rows };
}

function buildTierValueSet(rows, tierIndex) {
  const values = new Set();
  rows.forEach((row) => {
    const value = normalizeCell(row[tierIndex]);
    if (value) values.add(value);
  });
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

function mapRowToPreview(row, mapping, tierMap, existingEmails, rowIndex, useFullName) {
  const fullName = useFullName
    ? normalizeCell(row[mapping.fullName])
    : `${normalizeCell(row[mapping.firstName])} ${normalizeCell(row[mapping.lastName])}`.trim();
  const email = normalizeCell(row[mapping.email]).toLowerCase();
  const tierRaw = normalizeCell(row[mapping.tier]);
  const tierValue = tierMap[tierRaw] || "tier1";
  const guestCountRaw = mapping.guestCount === "none" ? "" : normalizeCell(row[mapping.guestCount]);
  const guestCount = Math.max(1, parseInt(String(guestCountRaw).replace(/[^0-9]/g, "")) || 1);

  const reasons = [];
  if (!fullName) reasons.push("Missing guest name");
  if (!email) reasons.push("Missing email");
  else if (!validateEmail(email)) reasons.push("Invalid email");
  if (tierValue !== "ignore" && !tierRaw) reasons.push("Missing tier");
  if (guestCount < 1) reasons.push("Guest count must be 1 or more");

  let status = "Ready to import";
  if (tierValue === "ignore") status = "Ignored";
  else if (reasons.length > 0) status = reasons.join(" • ");

  const isDuplicateExisting = email && existingEmails.has(email) && tierValue !== "ignore";
  const duplicateReason = isDuplicateExisting ? "Duplicate in current guest list" : "";

  return {
    key: rowIndex,
    fullName,
    email,
    tierRaw,
    tierValue,
    displayTier: tierValue === "founder" ? "Ambassador" : tierValue === "tier1" ? "Tier 1" : tierValue === "tier2" ? "Tier 2" : tierValue === "waitlist" ? "Waitlist" : "Ignore",
    guestCount,
    reasons,
    status,
    duplicateReason,
    ignored: tierValue === "ignore",
    importable: reasons.length === 0 && !isDuplicateExisting && tierValue !== "ignore",
  };
}

export default function ImportGuestListWizard({ open, onClose, event, onImported }) {
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [mapping, setMapping] = useState({
    fullName: "",
    firstName: "",
    lastName: "",
    email: "",
    tier: "",
    guestCount: "none",
  });
  const [useFullName, setUseFullName] = useState(true);
  const [tierValues, setTierValues] = useState([]);
  const [tierMap, setTierMap] = useState({});
  const [existingEmails, setExistingEmails] = useState(new Set());
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!open) {
      setStep(0);
      setFileName("");
      setHeaders([]);
      setRawRows([]);
      setMapping({ fullName: "", firstName: "", lastName: "", email: "", tier: "", guestCount: "none" });
      setUseFullName(true);
      setTierValues([]);
      setTierMap({});
      setExistingEmails(new Set());
      setError("");
      setImporting(false);
      setSummary(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !event) return;
    supabase
      .from("gala_guests")
      .select("email")
      .eq("event_id", event.id)
      .then(({ data }) => {
        const set = new Set();
        (data || []).forEach((item) => {
          if (item.email) set.add(String(item.email).trim().toLowerCase());
        });
        setExistingEmails(set);
      })
      .catch(() => {
        setExistingEmails(new Set());
      });
  }, [open, event]);

  const previewRows = useMemo(() => {
    if (
      !rawRows.length ||
      !hasColumn(mapping.email) ||
      !hasColumn(mapping.tier) ||
      (useFullName && !hasColumn(mapping.fullName)) ||
      (!useFullName && (!hasColumn(mapping.firstName) || !hasColumn(mapping.lastName)))
    ) {
      return [];
    }
    const rows = rawRows.map((row, index) => mapRowToPreview(row, mapping, tierMap, existingEmails, index, useFullName));
    const emailCounts = rows.reduce((acc, row) => {
      if (!row.email) return acc;
      const lowerEmail = row.email.toLowerCase();
      acc[lowerEmail] = (acc[lowerEmail] || 0) + 1;
      return acc;
    }, {});
    return rows.map((row) => {
      if (!row.email) return row;
      const lower = row.email.toLowerCase();
      if (emailCounts[lower] > 1) {
        return {
          ...row,
          importable: false,
          duplicateReason: row.duplicateReason || "Duplicate in uploaded file",
          status: "Duplicate in uploaded file",
        };
      }
      return row;
    });
  }, [rawRows, mapping, tierMap, existingEmails, useFullName]);

  useEffect(() => {
    if (step === 2 && hasColumn(mapping.tier)) {
      const values = buildTierValueSet(rawRows, mapping.tier);
      setTierValues(values);
      const initial = values.reduce((map, value) => {
        map[value] = normalizeTierMappingValue(value);
        return map;
      }, {});
      setTierMap(initial);
    } else {
      setTierValues([]);
      setTierMap({});
    }
  }, [step, mapping.tier, rawRows]);

  function downloadSampleFile() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "guest-list-sample.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleFileChange(eventFile) {
    const file = eventFile.target.files?.[0];
    if (!file) return;
    setError("");
    setFileName(file.name);
    try {
      const rows = await readUploadedFile(file);
      const { headers: parsedHeaders, rows: parsedRows } = buildHeadersAndRows(rows);
      if (!parsedHeaders.length || !parsedRows.length) {
        setError("We could not detect headers or guest rows in that file.");
        return;
      }
      const fullNameDefault = detectDefaultIndex(parsedHeaders, ["full_name", "name", "guest name"]);
      const firstNameDefault = detectDefaultIndex(parsedHeaders, ["first_name", "first name", "first"]);
      const lastNameDefault = detectDefaultIndex(parsedHeaders, ["last_name", "last name", "last", "surname"]);
      const emailDefault = detectDefaultIndex(parsedHeaders, ["email", "e-mail"]);
      const tierDefault = detectDefaultIndex(parsedHeaders, ["tier", "group", "package", "guest group"]);
      const countDefault = detectDefaultIndex(parsedHeaders, ["guest_count", "seat_count", "guests", "seats"]);

      setHeaders(parsedHeaders);
      setRawRows(parsedRows);
      setUseFullName(fullNameDefault !== -1 || firstNameDefault === -1 || lastNameDefault === -1);
      setMapping({
        fullName: fullNameDefault !== -1 ? fullNameDefault : "",
        firstName: firstNameDefault !== -1 ? firstNameDefault : "",
        lastName: lastNameDefault !== -1 ? lastNameDefault : "",
        email: emailDefault !== -1 ? emailDefault : "",
        tier: tierDefault !== -1 ? tierDefault : "",
        guestCount: countDefault !== -1 ? countDefault : "none",
      });
      setStep(1);
    } catch (err) {
      setError(err.message || "Unable to parse spreadsheet.");
    }
  }

  function handleMappingChange(field, value) {
    setMapping((prev) => ({ ...prev, [field]: value }));
  }

  function renderHeaderSelect(label, field, showNone = false) {
    return (
      <label style={styles.fieldBlock}>
        <div style={styles.fieldLabel}>{label}</div>
        <select
          value={mapping[field]}
          onChange={(e) => handleMappingChange(field, e.target.value === "none" || e.target.value === "" ? e.target.value : Number(e.target.value))}
          style={styles.select}
        >
          <option value="">Select column</option>
          {showNone && <option value="none">Not Used / Default to 1</option>}
          {headers.map((header, index) => (
            <option key={index} value={index}>
              {header}
            </option>
          ))}
        </select>
      </label>
    );
  }

  async function handleImport() {
    if (!event) return;
    setError("");
    if (!previewRows.length) {
      setError("No rows are ready to import. Please review your mapping and file.");
      return;
    }
    const rowsToInsert = previewRows
      .filter((row) => row.importable)
      .map((row) => ({
        event_id: event.id,
        full_name: row.fullName,
        email: row.email,
        tier: row.tierValue,
        seat_count: row.guestCount,
        status: row.tierValue === "waitlist" ? "waitlisted" : "not_invited",
      }));

    if (!rowsToInsert.length) {
      setError("No valid rows available for import.");
      return;
    }

    setImporting(true);
    try {
      const { error: insertError } = await supabase.from("gala_guests").insert(rowsToInsert);
      if (insertError) throw insertError;
      const duplicates = previewRows.filter((row) => row.duplicateReason).length;
      const ignored = previewRows.filter((row) => row.ignored).length;
      const invalid = previewRows.filter((row) => !row.importable && !row.ignored && !row.duplicateReason).length;
      const imported = rowsToInsert.length;
      const message = `Imported ${imported} guests. Skipped ${duplicates} duplicates. ${invalid + ignored} rows need review.`;
      setSummary({ imported, duplicates, review: invalid + ignored, message });
      onImported?.({ imported, duplicates, review: invalid + ignored, message });
      setStep(4);
    } catch (err) {
      setError(err.message || "Unable to import guest list.");
    } finally {
      setImporting(false);
    }
  }

  if (!open) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalCard}>
        <button onClick={onClose} type="button" style={styles.closeButton} aria-label="Close">×</button>
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 24, color: "#111827" }}>
            {step === 0 && "Upload Your Guest List"}
            {step === 1 && "Match Your Spreadsheet Columns"}
            {step === 2 && "Match Guest Groups"}
            {step === 3 && "Review Before Import"}
            {step === 4 && "Import Complete"}
          </h2>
          <div style={{ color: "#4b5563", marginTop: 8, fontSize: 14 }}>
            Your spreadsheet can include extra columns. We'll only import the details needed for invitations.
          </div>
        </div>

        {step === 0 && (
          <div>
            <div style={styles.box}>
              <label style={styles.fieldBlock}>
                <div style={styles.fieldLabel}>Choose file</div>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  style={{ padding: 12 }}
                />
              </label>
              {fileName && <div style={{ color: "#334155", marginBottom: 8 }}>Selected file: {fileName}</div>}
              <button type="button" onClick={downloadSampleFile} style={styles.secondaryButton}>
                Download Sample File
              </button>
            </div>
            {error && <div style={styles.error}>{error}</div>}
          </div>
        )}

        {step === 1 && (
          <div>
            <div style={styles.gridTwoColumn}>
              <div style={styles.mappingColumn}>
                <div style={styles.sectionLabel}>Name mapping</div>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="nameMode"
                    checked={useFullName}
                    onChange={() => setUseFullName(true)}
                    style={styles.radioInput}
                  />
                  Full name in one column
                </label>
                {useFullName ? renderHeaderSelect("Guest Name", "fullName") : null}
                {!useFullName && (
                  <>
                    {renderHeaderSelect("First Name", "firstName")}
                    {renderHeaderSelect("Last Name", "lastName")}
                  </>
                )}
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="nameMode"
                    checked={!useFullName}
                    onChange={() => setUseFullName(false)}
                    style={styles.radioInput}
                  />
                  First name + last name columns
                </label>
              </div>
              <div style={styles.mappingColumn}>
                <div style={styles.sectionLabel}>Required fields</div>
                {renderHeaderSelect("Email", "email")}
                {renderHeaderSelect("Tier", "tier")}
                {renderHeaderSelect("Guest Count / Seat Count", "guestCount", true)}
              </div>
            </div>
            {error && <div style={styles.error}>{error}</div>}
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={styles.box}>
              <div style={styles.sectionLabel}>Spreadsheet tier values</div>
              <div style={{ color: "#475569", marginBottom: 12 }}>
                Map the values found in your file to the guest tiers used by the system.
              </div>
              {tierValues.length === 0 ? (
                <div style={{ color: "#475569" }}>
                  No tier values were detected. You can continue to preview, where rows with missing guest groups will be marked for review.
                </div>
              ) : (
                tierValues.map((value) => (
                  <div key={value} style={styles.tierRow}>
                    <div style={{ flex: 1, color: "#111827" }}>{value || <i>Blank value</i>}</div>
                    <select
                      value={tierMap[value] || "tier1"}
                      onChange={(e) => setTierMap((prev) => ({ ...prev, [value]: e.target.value }))}
                      style={styles.select}
                    >
                      {TIER_LABELS.map((option) => (
                        <option key={option.key} value={option.key}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={styles.summaryRow}>
              <div>Valid rows: {previewRows.filter((row) => row.importable).length}</div>
              <div>Invalid rows: {previewRows.filter((row) => !row.importable && !row.ignored && !row.duplicateReason).length}</div>
              <div>Ignored rows: {previewRows.filter((row) => row.ignored).length}</div>
              <div>Duplicates: {previewRows.filter((row) => row.duplicateReason).length}</div>
            </div>
            <div style={{ overflowX: "auto", maxHeight: 320, border: `1px solid #e2e8f0`, borderRadius: 12, background: "#fff" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={styles.previewHeader}>Name</th>
                    <th style={styles.previewHeader}>Email</th>
                    <th style={styles.previewHeader}>Tier</th>
                    <th style={styles.previewHeader}>Count</th>
                    <th style={styles.previewHeader}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={row.key} style={{ background: row.importable ? "#ffffff" : "#f8f7f7" }}>
                      <td style={styles.previewCell}>{row.fullName || "—"}</td>
                      <td style={styles.previewCell}>{row.email || "—"}</td>
                      <td style={styles.previewCell}>{row.displayTier}</td>
                      <td style={styles.previewCell}>{row.guestCount}</td>
                      <td style={{ ...styles.previewCell, color: row.importable ? "#15803d" : "#b91c1c" }}>{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {error && <div style={styles.error}>{error}</div>}
          </div>
        )}

        {step === 4 && summary && (
          <div style={styles.box}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Import complete</div>
            <div style={{ color: "#334155", marginBottom: 16 }}>{summary.message}</div>
            <button type="button" onClick={onClose} style={styles.primaryButton}>Close</button>
          </div>
        )}

        <div style={styles.footerButtons}>
          {step > 0 && step < 4 && (
            <button type="button" onClick={() => setStep((prev) => Math.max(prev - 1, 0))} style={styles.secondaryButton}>
              Back
            </button>
          )}
          {step === 0 && (
            <button type="button" disabled={!headers.length && !fileName} style={styles.primaryButton}>
              Choose a file above to continue
            </button>
          )}
          {step === 1 && (
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={
                !hasColumn(mapping.email) ||
                !hasColumn(mapping.tier) ||
                (useFullName
                  ? !hasColumn(mapping.fullName)
                  : !hasColumn(mapping.firstName) || !hasColumn(mapping.lastName))
              }
              style={styles.primaryButton}
            >
              Continue to tier mapping
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              onClick={() => setStep(3)}
              style={styles.primaryButton}
            >
              Continue to preview
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || previewRows.filter((row) => row.importable).length === 0}
              style={styles.primaryButton}
            >
              {importing ? "Importing…" : "Import"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    zIndex: 3000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 860,
    background: "#fff",
    borderRadius: 18,
    padding: 24,
    boxShadow: "0 18px 45px rgba(15, 23, 42, 0.12)",
    position: "relative",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    border: "none",
    background: "none",
    fontSize: 24,
    color: "#475569",
    cursor: "pointer",
  },
  box: {
    background: "#f8fafc",
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
  },
  fieldBlock: {
    display: "block",
    marginBottom: 16,
  },
  fieldLabel: {
    marginBottom: 6,
    fontWeight: 600,
    color: "#0f172a",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#fff",
    fontSize: 14,
    color: "#111827",
  },
  gridTwoColumn: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 18,
  },
  mappingColumn: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 16,
  },
  sectionLabel: {
    fontWeight: 700,
    marginBottom: 12,
    color: "#0f172a",
  },
  radioLabel: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    color: "#334155",
  },
  radioInput: {
    accentColor: "#2563eb",
  },
  tierRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 10,
  },
  previewHeader: {
    padding: 12,
    textAlign: "left",
    borderBottom: "1px solid #e2e8f0",
  },
  previewCell: {
    padding: 10,
    borderBottom: "1px solid #e2e8f0",
  },
  summaryRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 12,
    marginBottom: 14,
    color: "#334155",
    fontSize: 14,
  },
  footerButtons: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 16,
    flexWrap: "wrap",
  },
  primaryButton: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 18px",
    cursor: "pointer",
    fontWeight: 600,
  },
  secondaryButton: {
    background: "#fff",
    color: "#111827",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    padding: "10px 18px",
    cursor: "pointer",
    fontWeight: 600,
  },
  error: {
    color: "#b91c1c",
    marginTop: 12,
    fontSize: 14,
  },
};
