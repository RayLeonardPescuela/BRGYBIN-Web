import { useEffect, useState } from "react";
import { QrCode, ScanLine, Star, Search, Inbox } from "lucide-react";
import { db } from "../config/firebase";

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Collection day is stored as "YYYY-MM-DD" (sortable string)
const formatDay = (row) => {
  if (row.day && /^\d{4}-\d{2}-\d{2}$/.test(row.day)) {
    const [y, m, d] = row.day.split("-").map(Number);
    return `${MONTH_ABBR[m - 1]} ${d}, ${y}`;
  }
  const date = row.createdAt ? new Date(row.createdAt) : null;
  if (date && !isNaN(date.getTime())) return date.toLocaleDateString();
  return "Unknown date";
};

const dayTime = (row) => {
  if (row.day && /^\d{4}-\d{2}-\d{2}$/.test(row.day)) {
    const [y, m, d] = row.day.split("-").map(Number);
    return new Date(y, m - 1, d).getTime();
  }
  const t = row.createdAt ? new Date(row.createdAt).getTime() : 0;
  return isNaN(t) ? 0 : t;
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

export default function History() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Only collector-generated QR docs (the fixed-preset system);
        // Main Admin's custom QRs don't carry createdByRole.
        const [qrSnap, userSnap] = await Promise.all([
          db.collection("rewards").where("createdByRole", "==", "collector").get(),
          db.collection("users").get(),
        ]);
        if (!alive) return;

        const names = {};
        userSnap.docs.forEach((d) => {
          const u = d.data();
          names[d.id] = u.name || u.email || "Unnamed";
        });

        const list = qrSnap.docs.map((d) => {
          const r = d.data();
          const scannedBy = Array.isArray(r.scannedBy) ? r.scannedBy : [];
          return {
            id: d.id,
            day: r.day || "",
            createdAt: r.createdAt,
            points: typeof r.points === "number" ? r.points : 0,
            collector: names[r.createdBy] || "Unknown collector",
            scanners: scannedBy.map((uid) => names[uid] || "Removed account"),
          };
        });

        list.sort((a, b) => dayTime(b) - dayTime(a));
        setRows(list);
      } catch (error) {
        console.log("Error loading QR history:", error);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const term = query.trim().toLowerCase();
  const filtered = term
    ? rows.filter((r) => r.collector.toLowerCase().includes(term))
    : rows;

  const totalScans = rows.reduce((sum, r) => sum + r.scanners.length, 0);
  const totalMinted = rows.reduce(
    (sum, r) => sum + r.points * r.scanners.length,
    0
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Collector QR History</h2>
          <p className="muted">
            Fixed-points QR codes: who generated them and who scanned them.
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          icon={QrCode}
          color="#6B8E4E"
          value={rows.length}
          label="QR codes generated"
        />
        <StatCard
          icon={ScanLine}
          color="#4A90E2"
          value={totalScans}
          label="Total scans"
        />
        <StatCard
          icon={Star}
          color="#d4a017"
          value={totalMinted}
          label="Points minted"
        />
      </div>

      {loading ? (
        <div className="page-loading">
          <div className="spinner" />
        </div>
      ) : rows.length === 0 ? (
        <div className="card">
          <div className="empty">
            <Inbox size={40} />
            <p className="empty-title">No collector QR codes yet</p>
            <p className="empty-sub">
              History appears once collectors generate their daily fixed-points
              QR codes.
            </p>
          </div>
        </div>
      ) : (
        <>
          <label className="field" style={{ maxWidth: 360 }}>
            <span>Filter by collector</span>
            <input
              type="text"
              placeholder="e.g. Juan Dela Cruz"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          <section className="card">
            <div className="card-head">
              <h3>
                <QrCode size={18} /> Activity ({filtered.length})
              </h3>
            </div>

            {filtered.length === 0 ? (
              <div className="empty">
                <Search size={40} />
                <p className="empty-title">No matching collectors</p>
                <p className="empty-sub">Try a different name.</p>
              </div>
            ) : (
              filtered.map((row) => {
                const scans = row.scanners.length;
                return (
                  <div className="list-row" key={row.id}>
                    <div className="list-icon green">
                      <QrCode size={18} />
                    </div>
                    <div className="list-main">
                      <div className="list-title">{row.collector}</div>
                      <div className="list-sub">
                        {formatDay(row)} ·{" "}
                        {scans === 0
                          ? "No scans yet"
                          : `${scans} scan${scans > 1 ? "s" : ""} · ${
                              row.points * scans
                            } pts given`}
                      </div>
                      {scans > 0 && (
                        <div
                          className="list-sub"
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={row.scanners.join(", ")}
                        >
                          Scanned by: {row.scanners.join(", ")}
                        </div>
                      )}
                    </div>
                    <span className="badge badge-olive">{row.points} pts</span>
                  </div>
                );
              })
            )}
          </section>
        </>
      )}
    </div>
  );
}
