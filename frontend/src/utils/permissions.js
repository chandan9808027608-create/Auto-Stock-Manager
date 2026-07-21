// Mirrors the backend's ROLE_PERMISSIONS in server.py. "admin" (Super admin)
// always has full access; other roles only see what's listed here.
export const ROLE_NAV_PATHS = {
  stock_supervisor: ["/inventory", "/sales", "/jobs", "/customers", "/team", "/settings"],
  parts_supervisor: ["/spare-parts", "/jobs", "/team", "/settings"],
};

export const ROLE_DEFAULT_PATH = {
  stock_supervisor: "/inventory",
  parts_supervisor: "/spare-parts",
};

export function canAccessPath(role, path) {
  if (!role || role === "admin") return true;
  const allowed = ROLE_NAV_PATHS[role] || [];
  return allowed.some((p) => path === p || path.startsWith(p + "/"));
}

// Job Cards tab is shared: Front desk stock can only view, Parts department has full create/edit/delete access.
export function canEditJobs(role) {
  return !role || role === "admin" || role === "parts_supervisor";
}

export function canDeleteJobs(role) {
  return !role || role === "admin" || role === "parts_supervisor";
}
