import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ShieldAlert, LogOut } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Schedules from "./pages/Schedules";
import Complaints from "./pages/Complaints";
import Users from "./pages/Users";
import Rewards from "./pages/Rewards";
import History from "./pages/History";
import Announcements from "./pages/Announcements";
import Notifications from "./pages/Notifications";

function Splash({ text = "Loading…" }) {
  return (
    <div className="splash">
      <div className="spinner" />
      <p>{text}</p>
    </div>
  );
}

function AccessDenied() {
  const { userData, logout } = useAuth();
  return (
    <div className="splash">
      <div className="denied-card">
        <ShieldAlert size={54} color="#E57373" />
        <h2>Main Admin access only</h2>
        <p>
          This portal is for Main Admins. Your account is registered as{" "}
          <strong>{userData?.role || "unknown"}</strong>.
        </p>
        <button className="btn btn-danger" onClick={logout}>
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  );
}

function Protected({ children }) {
  const { user, userData, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  if (!userData) return <Splash text="Loading your account…" />;
  if (userData.role !== "admin") return <AccessDenied />;
  return children;
}

export default function App() {
  const { user, userData, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Splash />;

  // Already signed in as Main Admin -> never show the login page again
  if (user && userData?.role === "admin" && location.pathname === "/login") {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="schedules" element={<Schedules />} />
        <Route path="complaints" element={<Complaints />} />
        <Route path="users" element={<Users />} />
        <Route path="rewards" element={<Rewards />} />
        <Route path="history" element={<History />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="notifications" element={<Notifications />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
