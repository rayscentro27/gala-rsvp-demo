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
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1>Gala Demo</h1>
      <p>Select a page:</p>
      <div style={{ display: "flex", gap: 12 }}>
        <Link to="/dashboard">Admin Dashboard</Link>
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
