import { useEffect, useState } from "react";
import { Gift, Plus, Trash2, QrCode, Download, RefreshCw, Inbox, X, Check } from "lucide-react";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";

const EMPTY_FORM = { name: "", points: "", description: "", stock: "" };

export default function Rewards() {
  const { userData } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [confirm, setConfirm] = useState(null);
  const [busyConfirm, setBusyConfirm] = useState(false);

  // QR generator
  const [qrPoints, setQrPoints] = useState("");
  const [qrDesc, setQrDesc] = useState("");
  const [qrImage, setQrImage] = useState(null);
  const [qrBusy, setQrBusy] = useState(false);
  const [qrError, setQrError] = useState("");

  // Collector QR presets (config/collectorQr)
  const [collectorPoints, setCollectorPoints] = useState([]);
  const [presetInput, setPresetInput] = useState("");
  const [presetError, setPresetError] = useState("");
  const [presetsLoading, setPresetsLoading] = useState(true);
  const [savingPresets, setSavingPresets] = useState(false);
  const [presetsSaved, setPresetsSaved] = useState(false);

  useEffect(() => {
    fetchItems();
    loadPresets();
  }, []);

  const fetchItems = async () => {
    try {
      const snap = await db.collection("rewardItems").get();
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.log("Error loading rewards:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPresets = async () => {
    try {
      const snap = await db.collection("config").doc("collectorQr").get();
      const list = snap.exists ? snap.data().points || [] : [];
      setCollectorPoints(Array.isArray(list) ? list : []);
    } catch (error) {
      console.log("Error loading presets:", error);
    } finally {
      setPresetsLoading(false);
    }
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  };

  const saveItem = async () => {
    if (!form.name.trim()) {
      setFormError("Item name is required");
      return;
    }
    if (!form.points || parseInt(form.points) <= 0) {
      setFormError("Enter valid points (1 or more)");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await db.collection("rewardItems").add({
        name: form.name.trim(),
        points: parseInt(form.points),
        description: form.description.trim(),
        stock: parseInt(form.stock) || 0,
        createdAt: new Date(),
      });
      setModalOpen(false);
      await fetchItems();
    } catch (error) {
      console.log("Error adding item:", error);
      setFormError("Failed to add item. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (item) =>
    setConfirm({
      title: "Delete reward item",
      message: `Delete “${item.name}”? Residents will no longer see it.`,
      action: async () => {
        await db.collection("rewardItems").doc(item.id).delete();
        await fetchItems();
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

  // ---------- QR generator (same payload format as the mobile app) ----------
  const generateQR = async () => {
    if (!qrPoints || parseInt(qrPoints) <= 0) {
      setQrError("Enter valid points");
      return;
    }
    setQrBusy(true);
    setQrError("");
    try {
      const points = parseInt(qrPoints);
      const rewardData = {
        points,
        description: qrDesc.trim() || `Reward for ${points} points`,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        scannedBy: [],
      };

      const docRef = await db.collection("rewards").add(rewardData);

      const payload = JSON.stringify({
        id: docRef.id,
        points,
        description: rewardData.description,
        createdAt: rewardData.createdAt.toISOString(),
        expiresAt: rewardData.expiresAt.toISOString(),
      });

      setQrImage(
        `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(payload)}`
      );
    } catch (error) {
      console.log("Error generating QR:", error);
      setQrError("Failed to generate QR code");
    } finally {
      setQrBusy(false);
    }
  };

  const resetQR = () => {
    setQrPoints("");
    setQrDesc("");
    setQrImage(null);
    setQrError("");
  };

  const downloadQR = async () => {
    if (!qrImage) return;
    try {
      const res = await fetch(qrImage);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `qr-reward-${qrPoints}pts.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      window.open(qrImage, "_blank");
    }
  };

  // ---------- collector QR presets ----------
  const addPreset = () => {
    const n = parseInt(presetInput, 10);
    if (!n || n < 1) {
      setPresetError("Enter a whole number of 1 or more");
      return;
    }
    if (collectorPoints.includes(n)) {
      setPresetError("That value is already in the list");
      return;
    }
    if (collectorPoints.length >= 12) {
      setPresetError("Maximum of 12 preset values");
      return;
    }
    setPresetError("");
    setCollectorPoints([...collectorPoints, n].sort((a, b) => a - b));
    setPresetInput("");
  };

  const removePreset = (value) => {
    setCollectorPoints((prev) => prev.filter((p) => p !== value));
    setPresetError("");
  };

  const savePresets = async () => {
    setSavingPresets(true);
    setPresetError("");
    try {
      await db.collection("config").doc("collectorQr").set({
        points: collectorPoints,
        updatedBy: userData?.name || "Admin",
        updatedAt: new Date(),
      });
      setPresetsSaved(true);
      setTimeout(() => setPresetsSaved(false), 3000);
    } catch (error) {
      console.log("Error saving presets:", error);
      setPresetError("Failed to save. Please try again.");
    } finally {
      setSavingPresets(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Rewards</h2>
          <p className="muted">Redeemable items and scannable point QR codes.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add item
        </button>
      </div>

      <div className="two-col rewards-layout">
        {/* Items */}
        <section className="card">
          <div className="card-head">
            <h3>Redeemable Items ({items.length})</h3>
          </div>

          {loading ? (
            <div className="page-loading">
              <div className="spinner" />
            </div>
          ) : items.length === 0 ? (
            <div className="empty">
              <Inbox size={40} />
              <p className="empty-title">No reward items yet</p>
              <p className="empty-sub">Tap “Add item” to create the first one.</p>
            </div>
          ) : (
            items.map((item) => (
              <div className="list-row" key={item.id}>
                <div className="list-icon gold">
                  <Gift size={18} />
                </div>
                <div className="list-main">
                  <div className="list-title">{item.name}</div>
                  <div className="list-sub">
                    {item.description || "No description"} · Stock: {item.stock || 0}
                  </div>
                </div>
                <span className="badge badge-olive">{item.points} pts</span>
                <button
                  className="icon-btn danger"
                  title="Delete"
                  onClick={() => askDelete(item)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </section>

        <div className="stack-col">
        {/* QR generator */}
        <section className="card">
          <div className="card-head">
            <h3>
              <QrCode size={18} /> QR Generator
            </h3>
            {qrImage && (
              <button className="btn btn-ghost btn-sm" onClick={resetQR}>
                <RefreshCw size={14} /> Reset
              </button>
            )}
          </div>

          {qrError && <div className="banner banner-error">{qrError}</div>}

          <label className="field">
            <span>Points to award *</span>
            <input
              type="number"
              min="1"
              placeholder="e.g. 50"
              value={qrPoints}
              onChange={(e) => setQrPoints(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Description</span>
            <input
              type="text"
              placeholder="e.g. Clean segregation bonus"
              value={qrDesc}
              onChange={(e) => setQrDesc(e.target.value)}
            />
          </label>

          <button
            className="btn btn-primary btn-block"
            onClick={generateQR}
            disabled={qrBusy}
          >
            {qrBusy ? "Generating…" : <><QrCode size={16} /> Generate QR code</>}
          </button>

          {qrImage && (
            <div className="qr-result">
              <img src={qrImage} alt="Reward QR code" />
              <p className="muted small">
                Valid for 24 hours · Residents scan this in the mobile app
              </p>
              <button className="btn btn-ghost btn-block" onClick={downloadQR}>
                <Download size={16} /> Download PNG
              </button>
            </div>
          )}
        </section>

        {/* Collector QR presets — sits below QR generation */}
        <section className="card">
          <div className="card-head">
            <h3>Collector QR Points</h3>
          </div>
          <p className="muted small" style={{ marginBottom: 14 }}>
            Fixed options collectors choose from when generating their once-a-day QR code.
          </p>

          {presetError && <div className="banner banner-error">{presetError}</div>}
          {presetsSaved && (
            <div className="banner banner-success">
              Saved — collectors will see the new options next time they generate.
            </div>
          )}

          {presetsLoading ? (
            <div className="page-loading">
              <div className="spinner" />
            </div>
          ) : (
            <>
              {collectorPoints.length > 0 ? (
                <div className="chip-row" style={{ marginBottom: 14 }}>
                  {collectorPoints.map((n) => (
                    <span key={n} className="chip active">
                      {n} pts
                      <button
                        className="chip-x"
                        onClick={() => removePreset(n)}
                        aria-label={`Remove ${n} points`}
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="banner banner-error">
                  No presets yet — collectors can't generate QR codes until you add one.
                </div>
              )}

              <div className="preset-add-row">
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 50"
                  value={presetInput}
                  onChange={(e) => {
                    setPresetInput(e.target.value);
                    setPresetError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addPreset();
                  }}
                />
                <button className="btn btn-ghost" onClick={addPreset}>
                  <Plus size={15} /> Add
                </button>
              </div>

              <button
                className="btn btn-primary btn-block"
                onClick={savePresets}
                disabled={savingPresets}
              >
                {savingPresets ? (
                  "Saving…"
                ) : presetsSaved ? (
                  <>
                    <Check size={16} /> Saved
                  </>
                ) : (
                  "Save presets"
                )}
              </button>
            </>
          )}
        </section>
        </div>
      </div>

      {/* Add item modal */}
      <Modal
        open={modalOpen}
        title="Add reward item"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={saveItem} disabled={saving}>
              {saving ? "Saving…" : "Add item"}
            </button>
          </>
        }
      >
        {formError && <div className="banner banner-error">{formError}</div>}

        <label className="field">
          <span>Name *</span>
          <input
            type="text"
            placeholder="e.g. Ecobag"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
          />
        </label>

        <div className="form-grid">
          <label className="field">
            <span>Points *</span>
            <input
              type="number"
              min="1"
              placeholder="e.g. 100"
              value={form.points}
              onChange={(e) => setField("points", e.target.value)}
            />
          </label>
          <label className="field">
            <span>Stock</span>
            <input
              type="number"
              min="0"
              placeholder="e.g. 20"
              value={form.stock}
              onChange={(e) => setField("stock", e.target.value)}
            />
          </label>
        </div>

        <label className="field">
          <span>Description</span>
          <textarea
            rows={3}
            placeholder="Optional…"
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
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
