import './App.css'

import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

import RsvpPage from "./pages/RsvpPage";
import DashboardPage from "./pages/DashboardPage";
import GuestManagementSection from "./pages/GuestManagementSection";

function requireAdminAccess() {
  const required = import.meta.env.VITE_ADMIN_PASSWORD;
  if (!required) return true;
  const cached = sessionStorage.getItem("gala_admin_ok");
  if (cached === "true") return true;
  const entered = window.prompt("Enter admin password:");
  if (entered && entered === required) {
    sessionStorage.setItem("gala_admin_ok", "true");
    return true;
  }
  return false;
}

function AdminGate({ children }) {
  if (requireAdminAccess()) return children;
  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h2>Admin access required</h2>
      <p>Please reload and enter the admin password.</p>
    </div>
  );
}

function Home() {
  return (
    <div style={{ background: "#f9fafb", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "48px 24px 80px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 48 }}>
          <div style={{ fontWeight: 700, color: "#111827", fontSize: 18 }}>Gala Invitations</div>
          <Link
            to="/dashboard"
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              background: "#111827",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            Access Your Dashboard
          </Link>
        </header>

        <section style={{ marginBottom: 56 }}>
          <h1 style={{ fontSize: 44, marginBottom: 12, color: "#111827" }}>
            Manage Your Event Invitations with Ease
          </h1>
          <p style={{ color: "#6b7280", fontSize: 18, maxWidth: 640 }}>
            A simple, thoughtful way to invite your guests, track responses, and stay focused on what matters most.
          </p>
          <div style={{ marginTop: 24, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <Link
              to="/dashboard"
              style={{
                padding: "12px 24px",
                borderRadius: 10,
                background: "#111827",
                color: "#fff",
                fontWeight: 600,
              }}
            >
              Access Your Dashboard
            </Link>
            <div style={{ color: "#6b7280" }}>No technical setup required</div>
          </div>
        </section>

        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 24, marginBottom: 16 }}>How It Works</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {[
              { title: "Add Your Guest List", text: "Upload your guests or add them one by one with ease." },
              { title: "Start Invitations", text: "Begin the invitation flow with a single click." },
              { title: "Track Responses", text: "See confirmations in real time and plan with confidence." },
            ].map((item) => (
              <div key={item.title} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 18 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{item.title}</div>
                <div style={{ color: "#6b7280" }}>{item.text}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 24, marginBottom: 16 }}>Features</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {[
              "Automated Invitations",
              "Real-Time RSVP Tracking",
              "Simple Guest Management",
              "Final Attendance Report",
            ].map((label) => (
              <div key={label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 18 }}>
                <div style={{ fontWeight: 600, color: "#111827" }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 56, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontSize: 24, marginBottom: 8 }}>Designed for Meaningful Events</h2>
          <p style={{ color: "#6b7280", maxWidth: 720 }}>
            This system was built to support intentional, well-organized events — allowing you to focus on your guests,
            your mission, and the experience itself.
          </p>
        </section>

        <section style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: 24, marginBottom: 12 }}>Ready to Get Started?</h2>
          <Link
            to="/dashboard"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              borderRadius: 10,
              background: "#111827",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            Access Your Dashboard
          </Link>
        </section>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<AdminGate><DashboardPage /></AdminGate>} />
        <Route path="/guests" element={<AdminGate><GuestManagementSection /></AdminGate>} />
        <Route path="/rsvp/:token" element={<RsvpPage />} />
      </Routes>
    </BrowserRouter>
  );
}
