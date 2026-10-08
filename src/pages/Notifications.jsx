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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [cfg, snap] = await Promise.all([
        db.collection("config").doc("sitios").get(),
        db.collection("notifications").orderBy("createdAt", "desc").limit(20).get(),
      ]);
      setSitios(cfg.exists ? cfg.data().names || [] : []);
      setSent(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
        read: false,
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
                  <span className={"badge " + (n.read ? "badge-green" : "badge-grey")}>
                    {n.read ? "read" : "unread"}
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
