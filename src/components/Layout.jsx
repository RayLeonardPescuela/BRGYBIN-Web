import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  MessageSquare,
  Users,
  Gift,
  History,
  Megaphone,
  Bell,
  LogOut,
  Leaf,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { roleLabel } from "../config/roles";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/schedules", label: "Schedules", icon: CalendarDays },
  { to: "/complaints", label: "Complaints", icon: MessageSquare },
  { to: "/users", label: "Users", icon: Users },
  { to: "/rewards", label: "Rewards", icon: Gift },
  { to: "/history", label: "History", icon: History },
  { to: "/announcements", label: "Announcements", icon: Megaphone },
  { to: "/notifications", label: "Notifications", icon: Bell },
];

const TITLES = {
  "/": "Dashboard",
  "/schedules": "Schedules",
  "/complaints": "Complaints & Requests",
  "/users": "Users & Sitios",
  "/rewards": "Rewards",
  "/history": "Collector QR History",
  "/announcements": "Announcements",
  "/notifications": "Notifications",
};

export default function Layout() {
  const { userData, logout } = useAuth();
  const location = useLocation();
  const title = TITLES[location.pathname] || "Dashboard";
  const initial = (userData?.name || "A").trim().charAt(0).toUpperCase();

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon logo">
            <img src="/images/garbagecan.png" alt="" />
          </div>
          <div className="brand-text">
            <div className="brand-name">BRNGYBIN</div>
            <div className="brand-sub">Admin Portal</div>
          </div>
        </div>

        <nav className="nav">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
              title={label}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <Leaf size={14} /> BRGY BIN © 2025
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <h1 className="page-title">{title}</h1>

          <div className="topbar-right">
            <div className="user-chip">
              <div className="avatar">{initial}</div>
              <div className="user-meta">
                <span className="user-name">{userData?.name || "Admin"}</span>
                <span className="user-role">{roleLabel(userData)}</span>
              </div>
            </div>
            <button className="btn btn-ghost" onClick={logout}>
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
