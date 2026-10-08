import { useEffect, useState } from "react";
import {
  MapPin,
  UserCog,
  Trash2,
  Plus,
  Pencil,
  Inbox,
  Star,
} from "lucide-react";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import {
  ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_COLORS,
} from "../config/roles";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";

export default function Users() {
  const { user } = useAuth();
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [sitios, setSitios] = useState([]);
  const [loading, setLoading] = useState(true);

  // Role picker
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState(null);
  const [pickedRole, setPickedRole] = useState("user");
  const [savingRole, setSavingRole] = useState(false);
  const [roleError, setRoleError] = useState("");

  // Sitio modal (add / edit)
  const [sitioModal, setSitioModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [sitioName, setSitioName] = useState("");
  const [savingSitio, setSavingSitio] = useState(false);
  const [sitioError, setSitioError] = useState("");

  const [confirm, setConfirm] = useState(null);
  const [busyConfirm, setBusyConfirm] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [uSnap, cfg] = await Promise.all([
        db.collection("users").get(),
        db.collection("config").doc("sitios").get(),
      ]);
      setUsers(uSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setSitios(cfg.exists ? cfg.data().names || [] : []);
    } catch (error) {
      console.log("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSitios = async (names) => {
    await db.collection("config").doc("sitios").set({ names });
    setSitios(names);
  };

  // ---------- roles ----------
  const openRolePicker = (u) => {
    setRoleTarget(u);
    setPickedRole(u.role || "user");
    setRoleError("");
    setRoleModalOpen(true);
  };

  const saveRole = async () => {
    if (!roleTarget) return;
    if (pickedRole === roleTarget.role) {
      setRoleModalOpen(false);
      return;
    }
    setSavingRole(true);
    setRoleError("");
    try {
      await db.collection("users").doc(roleTarget.id).update({ role: pickedRole });
      setRoleModalOpen(false);
      await fetchAll();
    } catch (error) {
      console.log("Error updating role:", error);
      setRoleError("Failed to update role. Please try again.");
    } finally {
      setSavingRole(false);
    }
  };

  // ---------- delete user ----------
  const askDeleteUser = (u) => {
    if (u.id === user?.uid) {
      setConfirm({
        title: "Not allowed",
        message: "You can't delete your own account.",
        confirmLabel: "OK",
        danger: false,
        action: async () => {},
      });
      return;
    }
    setConfirm({
      title: "Delete user",
      message: `Delete ${u.name || u.email}? This cannot be undone.`,
      action: async () => {
        await db.collection("users").doc(u.id).delete();
        await fetchAll();
      },
    });
  };

  // ---------- sitios ----------
  const openAddSitio = () => {
    setEditingIndex(null);
    setSitioName("");
    setSitioError("");
    setSitioModal(true);
  };

  const openEditSitio = (index) => {
    setEditingIndex(index);
    setSitioName(sitios[index]);
    setSitioError("");
    setSitioModal(true);
  };

  const saveSitio = async () => {
    const name = sitioName.trim();
    if (!name) {
      setSitioError("Sitio name cannot be empty");
      return;
    }
    const duplicate = sitios.some(
      (s, i) => i !== editingIndex && s.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      setSitioError("A sitio with this name already exists");
      return;
    }

    setSavingSitio(true);
    try {
      const updated = [...sitios];
      if (editingIndex === null) updated.push(name);
      else updated[editingIndex] = name;
      await saveSitios(updated);
      setSitioModal(false);
    } catch (error) {
      console.log("Error saving sitio:", error);
      setSitioError("Failed to save. Please try again.");
    } finally {
      setSavingSitio(false);
    }
  };

  const askDeleteSitio = (index) =>
    setConfirm({
      title: "Delete sitio",
      message: `Delete “${sitios[index]}”? Residents registered here keep their sitio until edited.`,
      action: async () => {
        const updated = sitios.filter((_, i) => i !== index);
        await saveSitios(updated);
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
          <h2>Users & Sitios</h2>
          <p className="muted">Assign roles and manage the barangay's sitio list.</p>
        </div>
        {tab === "sitios" && (
          <button className="btn btn-primary" onClick={openAddSitio}>
            <Plus size={16} /> Add sitio
          </button>
        )}
      </div>

      <div className="tabs">
        <button
          className={tab === "users" ? "tab active" : "tab"}
          onClick={() => setTab("users")}
        >
          Users ({users.length})
        </button>
        <button
          className={tab === "sitios" ? "tab active" : "tab"}
          onClick={() => setTab("sitios")}
        >
          <MapPin size={16} /> Sitios ({sitios.length})
        </button>
      </div>

      {loading ? (
        <div className="page-loading">
          <div className="spinner" />
        </div>
      ) : tab === "users" ? (
        users.length === 0 ? (
          <div className="card">
            <div className="empty">
              <Inbox size={40} />
              <p className="empty-title">No users yet</p>
            </div>
          </div>
        ) : (
          <div className="card">
            {users.map((u) => (
              <div className="user-row" key={u.id}>
                <div className="avatar lg">
                  {(u.name || u.email || "U").trim().charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                  <div className="user-name">
                    {u.name || "Unnamed"}
                    {u.id === user?.uid && <span className="you-chip">you</span>}
                  </div>
                  <div className="user-email">{u.email}</div>
                </div>
                <span
                  className="badge"
                  style={{ background: (ROLE_COLORS[u.role] || ROLE_COLORS.user) + "22", color: ROLE_COLORS[u.role] || ROLE_COLORS.user }}
                >
                  {ROLE_LABELS[u.role] || "USER"}
                </span>
                <span className="points">
                  <Star size={14} /> {u.points || 0}
                </span>
                <div className="row-actions">
                  <button
                    className="icon-btn"
                    title="Change role"
                    onClick={() => openRolePicker(u)}
                  >
                    <UserCog size={17} />
                  </button>
                  <button
                    className="icon-btn danger"
                    title="Delete user"
                    onClick={() => askDeleteUser(u)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : sitios.length === 0 ? (
        <div className="card">
          <div className="empty">
            <MapPin size={40} />
            <p className="empty-title">No sitios yet</p>
            <p className="empty-sub">Add one with the button above.</p>
          </div>
        </div>
      ) : (
        <div className="card">
          {sitios.map((name, index) => (
            <div className="user-row" key={`${name}-${index}`}>
              <div className="avatar lg green">
                <MapPin size={20} />
              </div>
              <div className="user-info">
                <div className="user-name">{name}</div>
                <div className="user-email">Sitio</div>
              </div>
              <div className="row-actions">
                <button
                  className="icon-btn"
                  title="Edit sitio"
                  onClick={() => openEditSitio(index)}
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="icon-btn danger"
                  title="Delete sitio"
                  onClick={() => askDeleteSitio(index)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Role picker */}
      <Modal
        open={roleModalOpen}
        title="Change role"
        onClose={() => setRoleModalOpen(false)}
        width={520}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setRoleModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={saveRole} disabled={savingRole}>
              {savingRole ? "Saving…" : "Save role"}
            </button>
          </>
        }
      >
        {roleError && <div className="banner banner-error">{roleError}</div>}
        <p className="modal-sub">{roleTarget?.name}</p>

        <div className="role-list">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              className={"role-option" + (pickedRole === r ? " active" : "")}
              onClick={() => setPickedRole(r)}
            >
              <span className="role-dot" style={{ background: ROLE_COLORS[r] }} />
              <span className="role-text">
                <span className="role-name">{ROLE_LABELS[r]}</span>
                <span className="role-desc">{ROLE_DESCRIPTIONS[r]}</span>
              </span>
              <span className={"radio" + (pickedRole === r ? " on" : "")} />
            </button>
          ))}
        </div>
      </Modal>

      {/* Sitio add/edit */}
      <Modal
        open={sitioModal}
        title={editingIndex === null ? "Add sitio" : "Edit sitio"}
        onClose={() => setSitioModal(false)}
        width={430}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setSitioModal(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={saveSitio} disabled={savingSitio}>
              {savingSitio ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        {sitioError && <div className="banner banner-error">{sitioError}</div>}
        <label className="field">
          <span>Sitio name</span>
          <input
            type="text"
            placeholder="e.g. Sitio Maligaya"
            value={sitioName}
            onChange={(e) => setSitioName(e.target.value)}
            autoFocus
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
