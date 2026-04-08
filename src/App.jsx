import './App.css'

import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

import RsvpPage from "./pages/RsvpPage";
import DashboardPage from "./pages/DashboardPage";
import GuestManagementSection from "./pages/GuestManagementSection";

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
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/guests" element={<GuestManagementSection />} />
        <Route path="/rsvp/:token" element={<RsvpPage />} />
      </Routes>
    </BrowserRouter>
  );
}
