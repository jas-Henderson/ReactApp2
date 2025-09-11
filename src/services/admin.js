// src/services/admins.js
import { api } from "./api";

/**
 * Small helper: attach Authorization header if an idToken is provided.
 * If you've already called setAuthToken(idToken) globally, you can omit it.
 */
function withAuth(idToken) {
  return idToken ? { headers: { Authorization: `Bearer ${idToken}` } } : {};
}

/**
 * GET /admin/admins
 * Returns: { admins: [{ id: <uid>, email, notify, createdAt, updatedAt }...] }
 */
export async function listAdmins(idToken) {
  const { data } = await api.get("/admin/admins", withAuth(idToken));
  return data; // { admins: [...] }
}

/**
 * POST /admin/admins/:uid/notify
 * Body: { notify: boolean }
 * Returns: { ok: true }
 */
export async function setAdminNotify(uid, notify, idToken) {
  const { data } = await api.post(
    `/admin/admins/${encodeURIComponent(uid)}/notify`,
    { notify: !!notify },
    withAuth(idToken)
  );
  return data; // { ok: true }
}

/**
 * (Dev-only) POST /admin/grant
 * Body: { email }
 * Header: x-setup-secret: <ADMIN_SETUP_SECRET>
 * Returns: { ok: true, uid }
 *
 * ⚠️ Do NOT use this from production client code. This is meant for
 * local setup or a secure admin tool. If you still call it here,
 * ensure you're in a trusted environment.
 */
export async function grantAdmin(email, setupSecret, idToken) {
  const { data } = await api.post(
    "/admin/grant",
    { email },
    {
      ...(withAuth(idToken) || {}),
      headers: {
        ...(withAuth(idToken).headers || {}),
        "x-setup-secret": setupSecret,
      },
    }
  );
  return data; // { ok: true, uid }
}