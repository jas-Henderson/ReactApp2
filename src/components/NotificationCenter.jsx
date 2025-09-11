// src/components/NotificationCenter.jsx
import { useEffect, useState } from "react";
import { adminListAlerts, resolveAlert } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function NotificationCenter() {
  const { getIdToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);

  async function load() {
    setLoading(true);
    try {
      const token = await getIdToken();
      const data = await adminListAlerts(token);
      const list = data?.unresolved || [];
      setAlerts(list);
      // Auto open if there are alerts
      if (list.length > 0) setOpen(true);
    } catch (e) {
      console.error("alerts load:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function markResolved(id) {
    const token = await getIdToken();
    await resolveAlert(id, token);
    setAlerts((arr) => arr.filter((a) => a.id !== id));
  }

  const count = alerts.length;

  return (
    <>
      {/* Bell button */}
      <button
        className="btn secondary"
        onClick={() => setOpen((x) => !x)}
        style={{ position: "relative" }}
        title="Notifications"
      >
        🔔
        {count > 0 && (
          <span
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              background: "#ef4444",
              color: "#fff",
              borderRadius: 12,
              fontSize: 12,
              padding: "2px 6px",
              minWidth: 18,
              textAlign: "center",
            }}
          >
            {count}
          </span>
        )}
      </button>

      {/* Drawer */}
      {open && (
        <div
          className="card"
          style={{
            position: "fixed",
            right: 16,
            top: 72,
            width: 360,
            maxHeight: "70vh",
            overflow: "auto",
            zIndex: 50,
            boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
          }}
        >
          <div
            className="row"
            style={{ justifyContent: "space-between", alignItems: "center", padding: 12 }}
          >
            <strong>Notifications</strong>
            <button className="btn secondary" onClick={() => setOpen(false)}>Close</button>
          </div>

          {loading ? (
            <div style={{ padding: 12 }}>Loading…</div>
          ) : alerts.length === 0 ? (
            <div style={{ padding: 12, opacity: 0.7 }}>No new notifications.</div>
          ) : (
            <div style={{ padding: 12, display: "grid", gap: 10 }}>
              {alerts.map((a) => (
                <div key={a.id} className="card" style={{ padding: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    Low stock: {a.productName || a.productId}
                  </div>
                  <div style={{ fontSize: 14, opacity: 0.8 }}>
                    Inventory: {a.inventory}
                  </div>
                  <div className="row" style={{ marginTop: 8, justifyContent: "flex-end" }}>
                    <button className="btn" onClick={() => markResolved(a.id)}>Mark resolved</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}