import { useEffect, useState } from "react";
import { Bell, Send, Truck, Sparkles, Zap, Star, MapPin, Inbox } from "lucide-react";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";

const TYPES = [
  { key: "collection", label: "Collection", icon: Truck, color: "#6B8E4E" },
  { key: "cleaning", label: "Cleaning", icon: Sparkles, color: "#4A90E2" },
  { key: "alert", label: "Alert", icon: Zap, color: "#E57373" },
  { key: "reward", label: "Reward", icon: Star, color: "#D4A017" },
  { key: "general", label: "General", icon: Bell, color: "#7CB342" },
];

const typeMeta = (key) => TYPES.find((t) => t.key === key) || TYPES[4];

// Mirrors canViewAdminPanel in BRNGYBIN/config/roles.js. The two projects
// share one Firestore and intentionally mirror each other, so keep this in
// step with that file.
const isStaff = (u) => u?.role === "admin" || u?.role === "collector";

/**
 * How many residents have opened a notification.
 *
 * The app records read state per-user in a `readBy` uid array. It used to
 * write ONE shared `read` boolean, which meant the first resident to open a
 * broadcast marked it read for the WHOLE barangay — so the badge that used
 * to sit here could only ever pretend to know. That is why this now counts
 * distinct readers instead of trusting a single flag.
 *
 * Legacy docs still carry `read`. A legacy `read: true` meant everyone had
 * effectively read it, so it counts as the full resident body — matching how
 * the app's isRead() still honours it. A legacy `false` means nobody.
 *
 * Only resident uids are counted, so deleted accounts and staff taps cannot
 * push the number above the denominator.
 */
const countReadByResidents = (n, residentIds) => {
  if (n.read === true) return residentIds.length;
  const readers = new Set(Array.isArray(n.readBy) ? n.readBy : []);
  return residentIds.filter((id) => readers.has(id)).length;
};

const fmtDateTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleString();
};

export default function Notifications() {
  const { userData } = useAuth();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("collection");
  const [selectedSitio, setSelectedSitio] = useState("");
  const [sitios, setSitios] = useState([]);
  const [sent, setSent] = useState([]);
  const [residentIds, setResidentIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [cfg, snap, usersSnap] = await Promise.all([
        db.collection("config").doc("sitios").get(),
        db.collection("notifications").orderBy("createdAt", "desc").limit(20).get(),
        db.collection("users").get(),
      ]);
      setSitios(cfg.exists ? cfg.data().names || [] : []);
      setSent(snap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // Denominator for the read count. Staff can open notifications too,
      // but what an admin wants to know is how many of their RESIDENTS saw
      // it, so staff are excluded from both sides of the ratio.
      setResidentIds(
        usersSnap.docs.filter((d) => !isStaff(d.data())).map((d) => d.id)
      );
    } catch (err) {
      console.log("Error loading notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    if (!title.trim() || !message.trim()) {
      setError("Please fill in the title and message");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await db.collection("notifications").add({
        title: title.trim(),
        message: message.trim(),
        type,
        sitio: selectedSitio || "",
        sentBy: userData?.name || "Admin",
        createdAt: new Date().toISOString(),
        // No `read` flag. Read state is per-user in a `readBy` uid array
        // written by the app, so a broadcast starts unread for everyone
        // simply by having no readers yet. Writing `read: false` here would
        // be dead weight that only invites the old shared-flag bug back.
      });
      setTitle("");
      setMessage("");
      setSuccess("Notification sent!");
      await load();
    } catch (err) {
      console.log("Error sending notification:", err);
      setError("Failed to send. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Notifications</h2>
          <p className="muted">Push an alert to residents — all sitios or a single one.</p>
        </div>
      </div>

      <div className="two-col">
        {/* Composer */}
        <section className="card">
          <div className="card-head">
            <h3>Compose</h3>
          </div>

          {error && <div className="banner banner-error">{error}</div>}
          {success && <div className="banner banner-success">{success}</div>}

          <div className="field">
            <span>Type</span>
            <div className="chip-row">
              {TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={"chip" + (type === t.key ? " active" : "")}
                  style={type === t.key ? { background: t.color, borderColor: t.color } : null}
                  onClick={() => setType(t.key)}
                >
                  <t.icon size={14} /> {t.label}
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span>Title *</span>
            <input
              type="text"
              placeholder="e.g. Pickup delayed today"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Message *</span>
            <textarea
              rows={4}
              placeholder="Write your message here…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>

          <div className="field">
            <span>
              <MapPin size={13} /> Sitio
            </span>
            <div className="chip-row">
              <button
                type="button"
                className={"chip" + (selectedSitio === "" ? " active" : "")}
                onClick={() => setSelectedSitio("")}
              >
                All Sitios
              </button>
              {sitios.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={"chip" + (selectedSitio === name ? " active" : "")}
                  onClick={() => setSelectedSitio(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-primary btn-block" onClick={send} disabled={submitting}>
            {submitting ? "Sending…" : <><Send size={16} /> Send notification</>}
          </button>
        </section>

        {/* Sent list */}
        <section className="card">
          <div className="card-head">
            <h3>Recently sent ({sent.length})</h3>
          </div>

          {loading ? (
            <div className="page-loading">
              <div className="spinner" />
            </div>
          ) : sent.length === 0 ? (
            <div className="empty">
              <Inbox size={40} />
              <p className="empty-title">Nothing sent yet</p>
              <p className="empty-sub">Your notifications will appear here.</p>
            </div>
          ) : (
            sent.map((n) => {
              const meta = typeMeta(n.type);
              const Icon = meta.icon;
              const readers = countReadByResidents(n, residentIds);
              return (
                <div className="list-row" key={n.id}>
                  <div className="list-icon" style={{ background: meta.color + "22", color: meta.color }}>
                    <Icon size={18} />
                  </div>
                  <div className="list-main">
                    <div className="list-title">{n.title}</div>
                    <div className="list-sub">{n.message}</div>
                    <div className="list-sub dim">
                      {fmtDateTime(n.createdAt)} · {n.sitio || "All sitios"} · by {n.sentBy || "Admin"}
                    </div>
                  </div>
                  {/* A count, not a boolean. "0 of 120 read" tells the
                      admin whether a broadcast actually landed; a bare
                      "unread" never did. */}
                  <span
                    className={"badge " + (readers > 0 ? "badge-green" : "badge-grey")}
                    title={`${readers} of ${residentIds.length} residents have opened this`}
                  >
                    {readers} of {residentIds.length} read
                  </span>
                </div>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
