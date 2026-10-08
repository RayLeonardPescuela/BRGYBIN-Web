import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  MessageSquare,
  Truck,
  CalendarDays,
  QrCode,
  Megaphone,
  ChevronRight,
  MapPin,
  Inbox,
} from "lucide-react";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";

const DEFAULT_ANNOUNCEMENTS = [
  "Segregation is mandatory in our barangay!",
  "Earn points by reporting missed pickups.",
  "Community clean-up this Sunday 7AM",
];

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

// Schedule dates may be "2026-06-26", "June 26" or "Jun 26, 2026"
const parseScheduleDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();

  const raw = String(value).trim();
  if (!raw) return null;

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);

  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const formatPickupLabel = (date) => {
  const label = `${MONTH_ABBR[date.getMonth()]} ${date.getDate()}`;
  const year = date.getFullYear();
  return year === new Date().getFullYear() ? label : `${label}, ${year}`;
};

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const fmtDate = (value) => {
  if (!value) return "Unknown date";
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
};

function StatCard({ icon: Icon, color, value, label }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: color + "22", color }}>
        <Icon size={24} />
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function Empty({ icon: Icon, title, sub }) {
  return (
    <div className="empty">
      <Inbox size={40} />
      <p className="empty-title">{title}</p>
      <p className="empty-sub">{sub}</p>
    </div>
  );
}

export default function Dashboard() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    pendingComplaints: 0,
    pendingRequests: 0,
    scans: 0,
    nextPickup: "--",
  });
  const [announcements, setAnnouncements] = useState(DEFAULT_ANNOUNCEMENTS);
  const [annIndex, setAnnIndex] = useState(0);
  const [recent, setRecent] = useState([]);
  const [upcoming, setUpcoming] = useState([]);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnnIndex((i) => (i + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [announcements]);

  const fetchAll = async () => {
    try {
      const [usersSnap, complaintsSnap, requestsSnap, schedSnap, redSnap, annSnap] =
        await Promise.all([
          db.collection("users").get(),
          db.collection("complaints").get(),
          db.collection("pickupRequests").where("status", "==", "pending").get(),
          db
            .collection("schedules")
            .where("type", "==", "collection")
            .where("status", "==", "scheduled")
            .get(),
          db.collection("redemptions").get(),
          db.collection("announcements").orderBy("createdAt", "desc").limit(10).get(),
        ]);

      let pendingComplaints = 0;
      complaintsSnap.docs.forEach((d) => {
        if (d.data().status === "pending") pendingComplaints++;
      });

      const today = startOfToday();
      const up = schedSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .map((s) => ({ ...s, parsed: parseScheduleDate(s.date) }))
        .filter((s) => s.parsed && s.parsed >= today)
        .sort((a, b) => a.parsed - b.parsed);

      setUpcoming(up.slice(0, 5));
      setStats({
        users: usersSnap.size,
        pendingComplaints,
        pendingRequests: requestsSnap.size,
        scans: redSnap.size,
        nextPickup: up.length ? formatPickupLabel(up[0].parsed) : "--",
      });

      if (!annSnap.empty) {
        setAnnouncements(annSnap.docs.map((d) => d.data().message).filter(Boolean));
      }

      setRecent(
        complaintsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5)
      );
    } catch (error) {
      console.log("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>
            {greeting()}, {userData?.name || "Admin"}
          </h2>
          <p className="muted">Here's what's happening in the barangay today.</p>
        </div>
      </div>

      <div className="announce-banner">
        <Megaphone size={20} />
        <span className="announce-text" key={annIndex}>
          {announcements[annIndex]}
        </span>
        <img className="announce-truck" src="/images/garbagetruck.png" alt="" />
      </div>

      <div className="stats-grid">
        <StatCard icon={Users} color="#4A90E2" value={stats.users} label="Total Users" />
        <StatCard icon={Truck} color="#6B8E4E" value={stats.nextPickup} label="Next Pickup" />
        <StatCard
          icon={MessageSquare}
          color="#E57373"
          value={stats.pendingComplaints}
          label="Pending Complaints"
        />
        <StatCard
          icon={CalendarDays}
          color="#FFB74D"
          value={stats.pendingRequests}
          label="Pickup Requests"
        />
        <StatCard icon={QrCode} color="#6B8E4E" value={stats.scans} label="Total Scans" />
      </div>

      <div className="two-col">
        <section className="card">
          <div className="card-head">
            <h3>Recent Complaints</h3>
            <Link className="link" to="/complaints">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <Empty icon={MessageSquare} title="No complaints" sub="All clear!" />
          ) : (
            recent.map((c) => (
              <div className="list-row" key={c.id}>
                <div className="list-icon red">
                  <MessageSquare size={18} />
                </div>
                <div className="list-main">
                  <div className="list-title">{c.title || (c.message || "").substring(0, 40)}</div>
                  <div className="list-sub">
                    {c.userName || "Anonymous"} · {c.sitio || "--"} · {fmtDate(c.createdAt)}
                  </div>
                </div>
                <span
                  className={
                    "badge " + (c.status === "resolved" ? "badge-green" : "badge-orange")
                  }
                >
                  {c.status || "pending"}
                </span>
              </div>
            ))
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h3>Upcoming Collections</h3>
            <Link className="link" to="/schedules">
              Manage <ChevronRight size={14} />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <Empty icon={Truck} title="No upcoming pickups" sub="Add one in Schedules" />
          ) : (
            upcoming.map((s) => (
              <div className="list-row" key={s.id}>
                <div className="list-icon green">
                  <Truck size={18} />
                </div>
                <div className="list-main">
                  <div className="list-title">
                    {formatPickupLabel(s.parsed)}
                    {s.time ? ` · ${s.time}` : ""}
                  </div>
                  <div className="list-sub">
                    <MapPin size={12} /> {s.sitio || "--"}
                    {s.area ? ` · ${s.area}` : ""}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
