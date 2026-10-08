import { useEffect, useState } from "react";
import { Megaphone, Plus, Pencil, Trash2, Inbox } from "lucide-react";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import ConfirmDialog from "../components/ConfirmDialog";

const fmtDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
};

export default function Announcements() {
  const { userData } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [busyConfirm, setBusyConfirm] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const snap = await db.collection("announcements").orderBy("createdAt", "desc").get();
      setAnnouncements(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.log("Error loading announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!message.trim()) {
      setError("Please write a message first");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (editingId) {
        await db
          .collection("announcements")
          .doc(editingId)
          .update({ message: message.trim(), updatedAt: new Date().toISOString() });
      } else {
        await db.collection("announcements").add({
          message: message.trim(),
          createdBy: userData?.name || "Admin",
          createdAt: new Date().toISOString(),
        });
      }
      setMessage("");
      setEditingId(null);
      await fetchAnnouncements();
    } catch (err) {
      console.log("Error saving announcement:", err);
      setError("Failed to save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setMessage(item.message || "");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setMessage("");
    setError("");
  };

  const askDelete = (item) =>
    setConfirm({
      title: "Delete announcement",
      message: `Delete “${(item.message || "").substring(0, 60)}”?`,
      action: async () => {
        await db.collection("announcements").doc(item.id).delete();
        if (editingId === item.id) cancelEdit();
        await fetchAnnouncements();
      },
    });

  const runConfirm = async () => {
    if (!confirm) return;
    setBusyConfirm(true);
    try {
      await confirm.action();
      setConfirm(null);
    } catch (err) {
      console.log("Action failed:", err);
    } finally {
      setBusyConfirm(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Announcements</h2>
          <p className="muted">Shown as a rotating banner on every resident's home screen.</p>
        </div>
      </div>

      <section className="card">
        <div className="card-head">
          <h3>{editingId ? "Edit announcement" : "New announcement"}</h3>
          {editingId && (
            <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>
              Cancel edit
            </button>
          )}
        </div>

        {error && <div className="banner banner-error">{error}</div>}

        <textarea
          rows={3}
          placeholder="Enter announcement message…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="composer-actions">
          <button className="btn btn-primary" onClick={save} disabled={submitting}>
            {submitting ? "Saving…" : editingId ? "Update" : "Save announcement"}
          </button>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h3>Posted ({announcements.length})</h3>
        </div>

        {loading ? (
          <div className="page-loading">
            <div className="spinner" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="empty">
            <Inbox size={40} />
            <p className="empty-title">No announcements yet</p>
            <p className="empty-sub">Create the first one above.</p>
          </div>
        ) : (
          announcements.map((item) => (
            <div className="list-row" key={item.id}>
              <div className="list-icon green">
                <Megaphone size={18} />
              </div>
              <div className="list-main">
                <div className="list-title">{item.message}</div>
                <div className="list-sub">
                  {fmtDate(item.createdAt)}
                  {item.createdBy ? ` · ${item.createdBy}` : ""}
                </div>
              </div>
              <div className="row-actions">
                <button className="icon-btn" title="Edit" onClick={() => startEdit(item)}>
                  <Pencil size={16} />
                </button>
                <button
                  className="icon-btn danger"
                  title="Delete"
                  onClick={() => askDelete(item)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel="Delete"
        busy={busyConfirm}
        onCancel={() => setConfirm(null)}
        onConfirm={runConfirm}
      />
    </div>
  );
}
