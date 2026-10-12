// ============================================================
// Single source of truth for app roles and permissions.
// Mirrors BRGYBIN/config/roles.js — keep both files in sync.
//
// The WEB PORTAL is Main Admin only (role === "admin").
// ============================================================

export const ROLES = ["admin", "collector", "user"];

export const ROLE_LABELS = {
  admin: "MAIN ADMIN",
  collector: "COLLECTOR",
  user: "USER",
};

export const ROLE_DESCRIPTIONS = {
  admin: "Full control — create, edit and delete everything",
  collector: "Can add schedules, resolve complaints and complete requests. Cannot delete.",
  user: "Resident — no admin access",
};

export const ROLE_COLORS = {
  admin: "#C62828",
  collector: "#4A90E2",
  user: "#999999",
};

const role = (u) => u?.role;

// ---------- Web portal access: Main Admin only ----------
export const isMainAdmin = (u) => role(u) === "admin";

// ---------- Display helpers ----------
export const roleLabel = (u) =>
  ROLE_LABELS[role(u)] || (role(u) ? String(role(u)).toUpperCase() : "USER");

export const roleColor = (u) => ROLE_COLORS[role(u)] || ROLE_COLORS.user;
