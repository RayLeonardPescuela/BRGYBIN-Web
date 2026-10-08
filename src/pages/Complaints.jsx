import { useEffect, useState } from "react";
import {
  MessageSquare,
  Truck,
  MapPin,
  Check,
  Trash2,
  Inbox,
} from "lucide-react";
import { db } from "../config/firebase";
import ConfirmDialog from "../components/ConfirmDialog";

const fmtDate = (value) => {
  if (!value) return "Unknown date";
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
};

export default function Complaints() {
  const [tab, setTab] = useState("complaints");
  const [complaints, setComplaints] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [busyConfirm, setBusyConfirm] = useState(false);
  const [workingId, setWorkingId] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cSnap, rSnap] = await Promise.all([
        db.collection("complaints").orderBy("createdAt", "desc").get(),
        db.collection("pickupRequests").orderBy("createdAt", "desc").get(),
      ]);
      setComplaints(cSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setRequests(rSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.log("Error loading complaints:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    setWorkingId(id);
    try {
      await db.collection("complaints").doc(id).update({ status });
      await fetchAll();
    } catch (error) {
      console.log("Error updating complaint:", error);
    } finally {
      setWorkingId(null);
    }
  };

  const completeRequest = async (id) => {
    setWorkingId(id);
    try {
      await db.collection("pickupRequests").doc(id).update({ status: "completed" });
      await fetchAll();
    } catch (error) {
      console.log("Error completing request:", error);
    } finally {
      setWorkingId(null);
    }
  };

  const askDeleteComplaint = (item) =>
    setConfirm({
      title: "Delete complaint",
      message: `Delete “${item.title || (item.message || "").substring(0, 40)}” permanently?`,
      action: async () => {
        await db.collection("complaints").doc(item.id).delete();
        await fetchAll();
      },
    });

  const askDeleteRequest = (item) =>
    setConfirm({
      title: "Delete pickup request",
      message: `Delete the request from ${item.userName || "a resident"}${item.date ? ` (${item.date})` : ""}?`,
      action: async () => {
        await db.collection("pickupRequests").doc(item.id).delete();
        await fetchAll();
      },
    });

  const runConfirm = async () => {
    if (!confirm) return;
    setBusyConfirm(true);
    try {
      await confirm.action();
      setConfirm(null);
    } catch (error) {
      console.log("Action failed:", error);
    } finally {
      setBusyConfirm(false);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Complaints & Requests</h2>
          <p className="muted">Resolve resident complaints and complete pickup requests.</p>
        </div>
      </div>

      <div className="tabs">
        <button
          className={tab === "complaints" ? "tab active" : "tab"}
          onClick={() => setTab("complaints")}
        >
          <MessageSquare size={16} /> Complaints ({complaints.length})
        </button>
        <button
          className={tab === "requests" ? "tab active" : "tab"}
          onClick={() => setTab("requests")}
        >
          <Truck size={16} /> Requests ({pendingRequests})
        </button>
      </div>

      {loading ? (
        <div className="page-loading">
          <div className="spinner" />
        </div>
      ) : tab === "complaints" ? (
        complaints.length === 0 ? (
          <div className="card">
            <div className="empty">
              <Inbox size={40} />
              <p className="empty-title">No complaints yet</p>
              <p className="empty-sub">Everything is quiet. 🎉</p>
            </div>
          </div>
        ) : (
          complaints.map((item) => (
            <div className="card" key={item.id}>
              <div className="card-head">
                <div className="who">
                  <div className="list-icon red">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <div className="who-name">
                      {item.userName || "Anonymous"}
                      <span className="who-sitio">
                        <MapPin size={12} /> {item.sitio || "--"}
                      </span>
                    </div>
                    <div className="list-sub">{fmtDate(item.createdAt)}</div>
                  </div>
                </div>
                <div className="badge-group">
                  <span className="badge badge-olive">{item.type || "complaint"}</span>
                  <span
                    className={
                      "badge " + (item.status === "resolved" ? "badge-green" : "badge-orange")
                    }
                  >
                    {item.status || "pending"}
                  </span>
                </div>
              </div>

              <h4 className="card-title">{item.title}</h4>
              <p className="card-text">{item.message}</p>

              <div className="row-actions end">
                {item.status !== "resolved" && (
                  <button
                    className="btn btn-success btn-sm"
                    disabled={workingId === item.id}
                    onClick={() => updateStatus(item.id, "resolved")}
                  >
                    <Check size={15} /> {workingId === item.id ? "Saving…" : "Resolve"}
                  </button>
                )}
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => askDeleteComplaint(item)}
                >
                  <Trash2 size={15} /> Delete
                </button>
              </div>
            </div>
          ))
        )
      ) : requests.length === 0 ? (
        <div className="card">
          <div className="empty">
            <Inbox size={40} />
            <p className="empty-title">No pickup requests</p>
            <p className="empty-sub">Residents haven't requested special pickups.</p>
          </div>
        </div>
      ) : (
        requests.map((item) => (
          <div className="card" key={item.id}>
            <div className="card-head">
              <div className="who">
                <div className="list-icon blue">
                  <Truck size={18} />
                </div>
                <div>
                  <div className="who-name">
                    {item.userName || "Resident"}
                    <span className="who-sitio">
                      <MapPin size={12} /> {item.userSitio || "--"}
                    </span>
                  </div>
                  <div className="list-sub">{fmtDate(item.createdAt)}</div>
                </div>
              </div>
              <span
                className={
                  "badge " + (item.status === "completed" ? "badge-green" : "badge-orange")
                }
              >
                {item.status || "pending"}
              </span>
            </div>

            <div className="detail-grid">
              {item.date && (
                <div className="detail">
                  <span className="detail-label">Preferred date</span>
                  <span className="detail-value">{item.date}</span>
                </div>
              )}
              {item.time && (
                <div className="detail">
                  <span className="detail-label">Time</span>
                  <span className="detail-value">{item.time}</span>
                </div>
              )}
            </div>
            {item.message && <p className="card-text">{item.message}</p>}

            <div className="row-actions end">
              {item.status !== "completed" && (
                <button
                  className="btn btn-success btn-sm"
                  disabled={workingId === item.id}
                  onClick={() => completeRequest(item.id)}
                >
                  <Check size={15} /> {workingId === item.id ? "Saving…" : "Complete"}
                </button>
              )}
              <button className="btn btn-danger btn-sm" onClick={() => askDeleteRequest(item)}>
                <Trash2 size={15} /> Delete
              </button>
            </div>
          </div>
        ))
      )}

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
