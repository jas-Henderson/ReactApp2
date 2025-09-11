// src/pages/AdminDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  adminListProducts,
  deleteProduct,
  adminListAlerts,
  resolveAlert,
} from "../services/api.js";
import { listAdmins, setAdminNotify } from "../services/admin.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function AdminDashboard() {
  const { getIdToken } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [alerts, setAlerts] = useState({ unresolved: [], recentResolved: [] });
  const [admins, setAdmins] = useState([]); // ← recipients
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [showAlerts, setShowAlerts] = useState(false); // modal

  // ---------- data loaders ----------
  const loadProducts = async () => {
    const token = await getIdToken();
    const data = await adminListProducts(token);
    setProducts(data?.products || []);
  };

  const loadAlerts = async () => {
    const token = await getIdToken();
    const data = await adminListAlerts(token);
    setAlerts({
      unresolved: data?.unresolved || [],
      recentResolved: data?.recentResolved || [],
    });
  };

  const loadAdmins = async () => {
    const token = await getIdToken();
    const { admins: list = [] } = await listAdmins(token);
    setAdmins(list);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadProducts(), loadAlerts(), loadAdmins()]);
    } catch (e) {
      console.error("AdminDashboard load:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-open the Notification Center when there are alerts
  useEffect(() => {
    if (!loading && alerts.unresolved.length > 0) setShowAlerts(true);
  }, [loading, alerts.unresolved.length]);

  // ---------- derived ----------
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        (p.tags || []).some((t) => String(t).toLowerCase().includes(q))
    );
  }, [products, query]);

  // ---------- actions ----------
  const onDelete = async (p) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    setBusy(true);
    try {
      const token = await getIdToken();
      await deleteProduct(p.id, token);
      await loadProducts();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const onResolve = async (alertId) => {
    setBusy(true);
    try {
      const token = await getIdToken();
      await resolveAlert(alertId, token);
      await loadAlerts();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Resolve failed");
    } finally {
      setBusy(false);
    }
  };

  const onToggleNotify = async (adminUser, next) => {
    setBusy(true);
    try {
      const token = await getIdToken();
      await setAdminNotify(adminUser.uid, next, token);
      // optimistic UI: update local list
      setAdmins((prev) =>
        prev.map((a) => (a.uid === adminUser.uid ? { ...a, notify: next } : a))
      );
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || e.message || "Update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      {/* Header row */}
      <div
        className="row"
        style={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <h2 style={{ margin: 0 }}>Admin Dashboard</h2>
        <div className="row" style={{ gap: 8 }}>
          <input
            placeholder="Search products"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: 260 }}
          />
          <button className="btn secondary" onClick={loadAll} disabled={loading || busy}>
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button className="btn" onClick={() => navigate("/admin/products/new")}>
            + New Product
          </button>
          {/* Notification Center trigger (shows count badge) */}
          <button
            className="btn secondary"
            onClick={() => setShowAlerts(true)}
            title="Open Notification Center"
          >
            🔔 Alerts
            {alerts.unresolved.length > 0 && (
              <span
                className="badge"
                style={{
                  marginLeft: 6,
                  background: "#b20000",
                  color: "white",
                  border: "1px solid #ffbfbf",
                }}
              >
                {alerts.unresolved.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Inline Alerts strip */}
      {alerts.unresolved.length > 0 && (
        <div
          className="card"
          style={{
            padding: 12,
            marginTop: 16,
            borderColor: "#ffe1a6",
            background: "#fff8e6",
          }}
        >
          <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
            <h3 style={{ margin: 0 }}>Low-stock Alerts</h3>
            <span className="badge">{alerts.unresolved.length}</span>
            <button className="btn secondary" onClick={() => setShowAlerts(true)}>
              View all
            </button>
          </div>

          <div className="row" style={{ flexDirection: "column", gap: 8, marginTop: 8 }}>
            {alerts.unresolved.slice(0, 3).map((a) => (
              <div
                key={a.id}
                className="row"
                style={{
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderTop: "1px dashed #f1d9a8",
                }}
              >
                <div>
                  <strong>{a.productName || "Unnamed product"}</strong>{" "}
                  <span style={{ opacity: 0.7 }}>
                    — qty on hand: <b>{a.inventory ?? "?"}</b>
                  </span>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button
                    className="btn secondary"
                    onClick={() => navigate(`/admin/products/${a.productId}`)}
                  >
                    View product
                  </button>
                  <button className="btn" onClick={() => onResolve(a.id)} disabled={busy}>
                    Resolve
                  </button>
                </div>
              </div>
            ))}
            {alerts.unresolved.length > 3 && (
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>
                +{alerts.unresolved.length - 3} more — open Notification Center
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recipients / Admins who receive emails */}
      <div className="card" style={{ padding: 12, marginTop: 16 }}>
        <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
          <h3 style={{ margin: 0 }}>Alert Recipients</h3>
          <span className="badge">{admins.length}</span>
        </div>

        {admins.length === 0 ? (
          <p style={{ marginTop: 8, opacity: 0.7 }}>
            No admin users found. Grant admin using your setup endpoint, then refresh.
          </p>
        ) : (
          <div className="row" style={{ flexDirection: "column", gap: 8, marginTop: 8 }}>
            {admins.map((a) => (
              <div
                key={a.uid}
                className="row"
                style={{
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderTop: "1px solid #eee",
                }}
              >
                <div style={{ display: "grid" }}>
                  <strong>{a.email || "(no email on file)"}</strong>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>{a.uid}</span>
                </div>
                <label className="row" style={{ gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 14 }}>Receive email alerts</span>
                  <input
                    type="checkbox"
                    checked={!!a.notify}
                    onChange={(e) => onToggleNotify(a, e.target.checked)}
                    disabled={busy}
                  />
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recently resolved (optional hint) */}
      {alerts.recentResolved?.length > 0 && (
        <div className="notice" style={{ marginTop: 12 }}>
          Recently resolved:{" "}
          {alerts.recentResolved
            .slice(0, 3)
            .map((a) => a.productName || "Unnamed")
            .join(", ")}
          {alerts.recentResolved.length > 3 ? "…" : ""}
        </div>
      )}

      {/* Products */}
      {loading ? (
        <p style={{ marginTop: 16 }}>Loading products…</p>
      ) : filtered.length === 0 ? (
        <p style={{ marginTop: 16 }}>No products match your search.</p>
      ) : (
        <div className="grid" style={{ marginTop: 16 }}>
          {filtered.map((p) => {
            const qty = typeof p.inventory === "number" ? p.inventory : null;
            const low = typeof qty === "number" && qty < 5;
            return (
              <div key={p.id} className="card">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.name} />
                ) : (
                  <div
                    style={{
                      height: 200,
                      background: "#f5f5f5",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <span style={{ opacity: 0.6 }}>No image</span>
                  </div>
                )}
                <div className="card-body">
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <h3 style={{ margin: 0 }}>{p.name}</h3>
                    <div className="price">${(p.priceCents / 100).toFixed(2)}</div>
                  </div>

                  <div className="row" style={{ gap: 8, marginTop: 6, alignItems: "center" }}>
                    <span className="badge">{p.category || "Uncategorized"}</span>
                    <span
                      className="badge"
                      title="Inventory on hand"
                      style={{
                        background: low ? "#ffe8e8" : "#f5f5f5",
                        color: low ? "#b20000" : "inherit",
                        border: low ? "1px solid #ffc5c5" : "none",
                      }}
                    >
                      {qty === null ? "Inv: —" : `Inv: ${qty}`}
                    </span>
                  </div>

                  <div className="row" style={{ gap: 8, marginTop: 10 }}>
                    <button
                      className="btn secondary"
                      onClick={() => navigate(`/admin/products/${p.id}`)}
                    >
                      Edit
                    </button>
                    <button className="btn secondary" onClick={() => onDelete(p)} disabled={busy}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= Notification Center (Modal) ================= */}
      {showAlerts && (
        <div
          role="dialog"
          aria-modal="true"
          className="alert-modal-backdrop"
          onClick={(e) => {
            if (e.target.classList.contains("alert-modal-backdrop")) setShowAlerts(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="card"
            style={{
              width: "min(720px, 92vw)",
              maxHeight: "80vh",
              overflow: "auto",
              padding: 16,
              animation: "pop 140ms ease-out",
            }}
          >
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Notification Center</h3>
              <button className="btn secondary" onClick={() => setShowAlerts(false)}>
                Close
              </button>
            </div>

            {alerts.unresolved.length === 0 ? (
              <p style={{ marginTop: 12 }}>No active alerts 🎉</p>
            ) : (
              <div style={{ marginTop: 12 }}>
                {alerts.unresolved.map((a) => (
                  <div
                    key={a.id}
                    className="row"
                    style={{
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 0",
                      borderTop: "1px solid #eee",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{a.productName || "Unnamed product"}</div>
                      <div style={{ fontSize: 13, opacity: 0.75 }}>
                        Low stock — current qty: <b>{a.inventory ?? "?"}</b>
                      </div>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <button
                        className="btn secondary"
                        onClick={() => {
                          setShowAlerts(false);
                          navigate(`/admin/products/${a.productId}`);
                        }}
                      >
                        View product
                      </button>
                      <button className="btn" onClick={() => onResolve(a.id)} disabled={busy}>
                        Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {alerts.recentResolved?.length > 0 && (
              <div className="notice" style={{ marginTop: 12 }}>
                Recently resolved:{" "}
                {alerts.recentResolved
                  .slice(0, 5)
                  .map((a) => a.productName || "Unnamed")
                  .join(", ")}
                {alerts.recentResolved.length > 5 ? "…" : ""}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}