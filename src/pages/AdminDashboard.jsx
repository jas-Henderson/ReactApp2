// src/pages/AdminDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminListProducts, deleteProduct } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function AdminDashboard() {
  const { getIdToken } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    try {
      const token = await getIdToken();
      const data = await adminListProducts(token);
      setProducts(data?.products || []);
    } catch (e) {
      console.error("load products:", e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      (p.tags || []).some(t => String(t).toLowerCase().includes(q))
    );
  }, [products, query]);

  const onDelete = async (p) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    setBusy(true);
    try {
      const token = await getIdToken();
      await deleteProduct(p.id, token);
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Admin Dashboard</h2>
        <div className="row" style={{ gap: 8 }}>
          <input
            placeholder="Search products"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: 260 }}
          />
          <button className="btn secondary" onClick={load} disabled={loading || busy}>
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button className="btn" onClick={() => navigate("/admin/products/new")}>
            + New Product
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ marginTop: 16 }}>Loading products…</p>
      ) : filtered.length === 0 ? (
        <p style={{ marginTop: 16 }}>No products match your search.</p>
      ) : (
        <div className="grid" style={{ marginTop: 16 }}>
          {filtered.map((p) => (
            <div key={p.id} className="card">
              {p.images?.[0] ? (
                <img src={p.images[0]} alt={p.name} />
              ) : (
                <div style={{ height: 200, background: "#f5f5f5", display: "grid", placeItems: "center" }}>
                  <span style={{ opacity: 0.6 }}>No image</span>
                </div>
              )}
              <div className="card-body">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <h3 style={{ margin: 0 }}>{p.name}</h3>
                  <div className="price">${(p.priceCents / 100).toFixed(2)}</div>
                </div>
                <div style={{ opacity: 0.7, fontSize: 14 }}>{p.category}</div>
                <div className="row" style={{ gap: 8, marginTop: 8 }}>
                  <button className="btn secondary" onClick={() => navigate(`/admin/products/${p.id}`)}>
                    Edit
                  </button>
                  <button className="btn secondary" onClick={() => onDelete(p)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}