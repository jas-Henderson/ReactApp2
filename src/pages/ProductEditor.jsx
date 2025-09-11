// src/pages/ProductEditor.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getProduct,
  createProduct,
  updateProduct,
  uploadProductImage,
} from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProductEditor() {
  const { id } = useParams();                       // "new" or a product id
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { getIdToken } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceDollars, setPriceDollars] = useState(""); // shown to user
  const [category, setCategory] = useState("Hair Care");
  const [tagsInput, setTagsInput] = useState("");       // comma separated
  const [inStock, setInStock] = useState(true);
  const [inventory, setInventory] = useState(0);
  const [images, setImages] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // load when editing
  useEffect(() => {
    async function load() {
      if (isNew) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const p = await getProduct(id);
        setName(p.name || "");
        setDescription(p.description || "");
        setPriceDollars(formatDollars(p.priceCents));
        setCategory(p.category || "Hair Care");
        setTagsInput(Array.isArray(p.tags) ? p.tags.join(", ") : "");
        setInStock(Boolean(p.inStock));
        setInventory(Number(p.inventory || 0));
        setImages(Array.isArray(p.images) ? p.images : []);
      } catch (e) {
        setError(e?.response?.data?.error || e.message || "Failed to load product.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, isNew]);

  // derived tags array
  const tags = useMemo(
    () =>
      tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [tagsInput]
  );

  // image upload
  async function onPickImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setSaving(true);
      const token = await getIdToken();
      const { url } = await uploadProductImage(file, token);
      setImages((prev) => [...prev, url]);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Image upload failed.");
    } finally {
      setSaving(false);
      e.target.value = ""; // allow re-uploading the same file
    }
  }

  function removeImage(url) {
    setImages((prev) => prev.filter((u) => u !== url));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      setSaving(true);
      const token = await getIdToken();

      const payload = {
        name: name.trim(),
        description,
        priceCents: dollarsToCents(priceDollars),
        category,
        tags,
        inStock,
        inventory: Number.isFinite(+inventory) ? +inventory : 0,
        images,
      };

      if (!payload.name) throw new Error("Please enter a product name.");
      if (!Number.isFinite(payload.priceCents))
        throw new Error("Please enter a valid price (e.g. 19.99).");

      if (isNew) {
        const created = await createProduct(payload, token);
        // after create, go to detail-edit or back to list; choose dashboard:
        navigate("/admin", { replace: true });
      } else {
        await updateProduct(id, payload, token);
        navigate("/admin", { replace: true });
      }
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>{isNew ? "New Product" : "Edit Product"}</h2>
        <button className="btn secondary" onClick={() => navigate(-1)} disabled={saving}>
          Back
        </button>
      </div>

      {loading ? (
        <p style={{ marginTop: 16 }}>Loading…</p>
      ) : (
        <form onSubmit={onSubmit} className="card" style={{ padding: 16, marginTop: 12 }}>
          {error && (
            <div className="notice" style={{ background: "#fff4f4", borderColor: "#ffd5d5", marginBottom: 12 }}>
              {error}
            </div>
          )}

          <label className="column" style={{ gap: 6 }}>
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>

          <label className="column" style={{ gap: 6, marginTop: 12 }}>
            <span>Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{ resize: "vertical" }}
            />
          </label>

          <div className="row" style={{ gap: 12, marginTop: 12 }}>
            <label className="column" style={{ gap: 6, flex: 1 }}>
              <span>Price (USD)</span>
              <input
                inputMode="decimal"
                placeholder="e.g. 19.99"
                value={priceDollars}
                onChange={(e) => setPriceDollars(e.target.value)}
                required
              />
            </label>

            <label className="column" style={{ gap: 6, width: 200 }}>
              <span>Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option>Hair Care</option>
                <option>Styling</option>
                <option>Tools</option>
                <option>Color</option>
              </select>
            </label>

            <label className="column" style={{ gap: 6, width: 160 }}>
              <span>Inventory</span>
              <input
                type="number"
                min="0"
                step="1"
                value={inventory}
                onChange={(e) => setInventory(e.target.value)}
              />
            </label>
          </div>

          <div className="row" style={{ gap: 12, marginTop: 12 }}>
            <label className="column" style={{ gap: 6, flex: 1 }}>
              <span>Tags (comma separated)</span>
              <input
                placeholder="argan, smoothing, purple"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
            </label>

            <label className="row" style={{ alignItems: "center", gap: 8, marginTop: 22 }}>
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
              />
              <span>In stock</span>
            </label>
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Images</h3>
              <label className="btn secondary" style={{ cursor: "pointer" }}>
                Upload…
                <input type="file" accept="image/*" onChange={onPickImage} style={{ display: "none" }} />
              </label>
            </div>

            {images.length === 0 ? (
              <div className="notice" style={{ marginTop: 8 }}>No images uploaded.</div>
            ) : (
              <div className="grid" style={{ marginTop: 8 }}>
                {images.map((url) => (
                  <div key={url} className="card" style={{ overflow: "hidden" }}>
                    <img src={url} alt="Product" style={{ height: 180, objectFit: "cover", width: "100%" }} />
                    <div className="card-body">
                      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, opacity: 0.7, overflowWrap: "anywhere" }}>{url}</span>
                        <button type="button" className="btn secondary" onClick={() => removeImage(url)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="row" style={{ gap: 8, marginTop: 16 }}>
            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Saving…" : isNew ? "Create Product" : "Save Changes"}
            </button>
            <button className="btn secondary" type="button" onClick={() => navigate(-1)} disabled={saving}>
              Cancel
            </button>
          </div>

          {Number(inventory) < 5 && (
            <p style={{ marginTop: 12, fontSize: 13, color: "#b45309" }}>
              ⚠️ Inventory is below the low-stock threshold (5). A low-stock alert will be generated.
            </p>
          )}
        </form>
      )}
    </div>
  );
}

/* ---------------- helpers ---------------- */
function dollarsToCents(v) {
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
}
function formatDollars(cents) {
  if (!Number.isFinite(cents)) return "";
  return (cents / 100).toFixed(2);
}