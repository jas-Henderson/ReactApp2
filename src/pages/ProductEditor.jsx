// src/pages/ProductEditor.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getProduct,
  createProduct,
  updateProduct,
  uploadProductImage,
} from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProductEditor() {
  const { id } = useParams();              // if present => edit mode
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { getIdToken } = useAuth();

  const [values, setValues] = useState({
    name: "",
    description: "",
    priceCents: 0,
    images: [],
    category: "",
    tags: [],
    inStock: true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // load existing product if editing
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const data = await getProduct(id);
        setValues({
          name: data.name || "",
          description: data.description || "",
          priceCents: data.priceCents ?? 0,
          images: Array.isArray(data.images) ? data.images : [],
          category: data.category || "",
          tags: Array.isArray(data.tags) ? data.tags : [],
          inStock: data.inStock ?? true,
        });
      } catch (e) {
        console.error(e);
        setError("Failed to load product.");
      }
    })();
  }, [id, isEdit]);

  function setField(k, v) {
    setValues((s) => ({ ...s, [k]: v }));
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setBusy(true);
      const token = await getIdToken();
      const { url } = await uploadProductImage(file, token);
      setValues((s) => ({ ...s, images: [...(s.images || []), url] }));
    } catch (e) {
      console.error(e);
      setError("Image upload failed.");
    } finally {
      setBusy(false);
      e.target.value = ""; // reset file input
    }
  }

  async function save(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const token = await getIdToken();
      const payload = {
        ...values,
        priceCents: Number(values.priceCents) || 0,
        tags: typeof values.tags === "string"
          ? values.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : values.tags,
      };

      if (isEdit) {
        await updateProduct(id, payload, token);
      } else {
        await createProduct(payload, token);
      }
      navigate("/admin");
    } catch (e) {
      console.error(e);
      setError("Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <h2>{isEdit ? "Edit Product" : "New Product"}</h2>

      <form onSubmit={save} className="card" style={{ padding: 16, gap: 12, display: "grid" }}>
        {error && (
          <div className="notice" style={{ background: "#fff4f4", borderColor: "#ffd5d5" }}>
            {error}
          </div>
        )}

        <label>
          <div>Name</div>
          <input value={values.name} onChange={(e) => setField("name", e.target.value)} required />
        </label>

        <label>
          <div>Description</div>
          <textarea
            value={values.description}
            onChange={(e) => setField("description", e.target.value)}
            rows={4}
          />
        </label>

        <label>
          <div>Price (cents)</div>
          <input
            type="number"
            value={values.priceCents}
            onChange={(e) => setField("priceCents", e.target.value)}
            min={0}
            required
          />
        </label>

        <label>
          <div>Category</div>
          <input value={values.category} onChange={(e) => setField("category", e.target.value)} />
        </label>

        <label>
          <div>Tags (comma-separated)</div>
          <input
            value={Array.isArray(values.tags) ? values.tags.join(", ") : values.tags}
            onChange={(e) => setField("tags", e.target.value)}
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={values.inStock}
            onChange={(e) => setField("inStock", e.target.checked)}
          />
          In stock
        </label>

        {/* Images preview + uploader */}
        <div>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Images</div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px,1fr))" }}>
            {(values.images || []).map((url, i) => (
              <div key={i} className="card" style={{ overflow: "hidden" }}>
                <img src={url} alt={`img-${i}`} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <input type="file" accept="image/*" onChange={handleImageUpload} disabled={busy} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button className="btn secondary" type="button" onClick={() => history.back()} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}