import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  CalendarDays,
  MapPin,
  Inbox,
} from "lucide-react";
import { db } from "../config/firebase";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
const formatDateKey = (year, month, day) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const EMPTY_FORM = { type: "collection", date: "", time: "", area: "", sitio: "", note: "" };

export default function Schedules() {
  const today = useMemo(() => new Date(), []);
  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const [schedules, setSchedules] = useState([]);
  const [sitios, setSitios] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayKey);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [confirm, setConfirm] = useState(null);
  const [busyConfirm, setBusyConfirm] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [snap, cfg] = await Promise.all([
        db.collection("schedules").orderBy("date", "desc").get(),
        db.collection("config").doc("sitios").get(),
      ]);
      setSchedules(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setSitios(cfg.exists ? cfg.data().names || [] : []);
    } catch (error) {
      console.log("Error loading schedules:", error);
    } finally {
      setLoading(false);
    }
  };

  // ---------- calendar ----------
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const cells = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const hasSchedule = (key) => schedules.some((s) => s.date === key);
  const selected = schedules
    .filter((s) => s.date === selectedDate)
    .sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else setCurrentMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else setCurrentMonth((m) => m + 1);
  };
  const goToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(todayKey);
  };

  // ---------- CRUD ----------
  const openAdd = (dateKey) => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date: dateKey || selectedDate });
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditingId(s.id);
    setForm({
      type: s.type || "collection",
      date: s.date || "",
      time: s.time || "",
      area: s.area || "",
      sitio: s.sitio || "",
      note: s.note || "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.date || !form.time.trim()) {
      setFormError("Date and time are required");
      return;
    }
    if (form.type === "collection" && !form.sitio) {
      setFormError("Please select a sitio");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const data = {
        type: form.type,
        date: form.date,
        time: form.time.trim(),
        area: form.area.trim(),
        note: form.note.trim(),
        status: "scheduled",
        sitio: form.type === "collection" ? form.sitio : "",
      };

      if (editingId) {
        await db.collection("schedules").doc(editingId).update(data);
      } else {
        await db.collection("schedules").add({ ...data, createdAt: new Date() });
      }
      setModalOpen(false);
      setSelectedDate(form.date);
      await fetchAll();
    } catch (error) {
      console.log("Error saving schedule:", error);
      setFormError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (s) =>
    setConfirm({
      title: "Delete schedule",
      message: `Delete the ${s.type === "cleaning" ? "cleaning" : "collection"} schedule on ${
        s.date
      }${s.time ? ` at ${s.time}` : ""}?`,
      action: async () => {
        await db.collection("schedules").doc(s.id).delete();
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

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Schedules</h2>
          <p className="muted">Collection & cleaning schedules for every sitio.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openAdd()}>
          <Plus size={16} /> Add schedule
        </button>
      </div>

      {loading ? (
        <div className="page-loading">
          <div className="spinner" />
        </div>
      ) : (
        <div className="sched-layout">
          {/* Calendar */}
          <section className="card calendar-card">
            <div className="cal-nav">
              <button className="icon-btn" onClick={prevMonth} aria-label="Previous month">
                <ChevronLeft size={18} />
              </button>
              <div className="cal-title">
                {MONTHS[currentMonth]} {currentYear}
              </div>
              <button className="icon-btn" onClick={nextMonth} aria-label="Next month">
                <ChevronRight size={18} />
              </button>
              <button className="btn btn-ghost btn-sm" onClick={goToday}>
                Today
              </button>
            </div>

            <div className="cal-grid cal-head">
              {DAYS.map((d) => (
                <div key={d} className="cal-dayname">
                  {d}
                </div>
              ))}
            </div>
            <div className="cal-grid">
              {cells.map((day, i) => {
                if (!day) return <div key={`e${i}`} className="cal-cell cal-empty" />;
                const key = formatDateKey(currentYear, currentMonth, day);
                const cls = ["cal-cell"];
                if (key === todayKey) cls.push("is-today");
                if (key === selectedDate) cls.push("is-selected");
                return (
                  <button key={key} className={cls.join(" ")} onClick={() => setSelectedDate(key)}>
                    <span>{day}</span>
                    {hasSchedule(key) && <i className="cal-dot" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Selected day */}
          <section className="card">
            <div className="card-head">
              <h3>{selectedDate === todayKey ? `Today · ${selectedDate}` : selectedDate}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => openAdd(selectedDate)}>
                <Plus size={14} /> Add
              </button>
            </div>

            {selected.length === 0 ? (
              <div className="empty">
                <Inbox size={40} />
                <p className="empty-title">No schedule for this day</p>
                <p className="empty-sub">Click “Add” to create one.</p>
              </div>
            ) : (
              selected.map((s) => (
                <div className="list-row" key={s.id}>
                  <div className="list-icon green">
                    <CalendarDays size={18} />
                  </div>
                  <div className="list-main">
                    <div className="list-title">
                      {s.type === "cleaning" ? "Cleaning" : "Collection"} · {s.time || "All day"}
                    </div>
                    <div className="list-sub">
                      {s.type !== "cleaning" && (
                        <>
                          <MapPin size={12} /> {s.sitio || "N/A"} ·{" "}
                        </>
                      )}
                      {s.area || "Barangay-wide"}
                      {s.note ? ` — ${s.note}` : ""}
                    </div>
                  </div>
                  <div className="row-actions">
                    <button className="icon-btn" title="Edit" onClick={() => openEdit(s)}>
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-btn danger"
                      title="Delete"
                      onClick={() => askDelete(s)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      )}

      {/* Add / Edit modal */}
      <Modal
        open={modalOpen}
        title={editingId ? "Edit schedule" : "Add schedule"}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Add schedule"}
            </button>
          </>
        }
      >
        {formError && (
          <div className="banner banner-error">
            <span>{formError}</span>
          </div>
        )}

        <div className="field">
          <span>Type</span>
          <div className="seg">
            <button
              className={form.type === "collection" ? "active" : ""}
              onClick={() => setField("type", "collection")}
              type="button"
            >
              Collection
            </button>
            <button
              className={form.type === "cleaning" ? "active" : ""}
              onClick={() => setField("type", "cleaning")}
              type="button"
            >
              Cleaning
            </button>
          </div>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Date *</span>
            <input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} />
          </label>
          <label className="field">
            <span>Time *</span>
            <input
              type="text"
              placeholder="e.g. 7:00 AM"
              value={form.time}
              onChange={(e) => setField("time", e.target.value)}
            />
          </label>
        </div>

        {form.type === "collection" ? (
          <label className="field">
            <span>Sitio *</span>
            <select value={form.sitio} onChange={(e) => setField("sitio", e.target.value)}>
              <option value="">Select a sitio…</option>
              {sitios.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="field">
            <span>Area / Station</span>
            <input
              type="text"
              placeholder="e.g. Purok 1, Court"
              value={form.area}
              onChange={(e) => setField("area", e.target.value)}
            />
          </label>
        )}

        <label className="field">
          <span>Note</span>
          <textarea
            rows={3}
            placeholder="Optional details…"
            value={form.note}
            onChange={(e) => setField("note", e.target.value)}
          />
        </label>
      </Modal>

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
