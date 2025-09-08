// src/components/ProductForm.jsx
import { useRef, useState } from "react";
import { uploadProductImage } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const empty = {
  name: "",
  description: "",
  priceCents: 0,
  category: "Hair Care",
  tags: [],
  inStock: true,
  images: [],
};

export default function ProductForm({ initial, onSave, onCancel, saving }) {
  const { getIdToken } = useAuth();
  const [values, setValues] = useState(() => initial ? { ...empty, ...initial } : empty);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: values.name.trim(),
      description: values.description?.trim() || "",
      priceCents: Math.max(0, Math.round(Number(values.priceCents) || 0)),
      category: values.category || "Hair Care",
      tags: (Array.isArray(values.tags) ? values.tags : String(values.tags || "")
        .split(",")
        .map(t => t.trim())
        .filter(Boolean)),
      inStock: Boolean(values.inStock),
      images: values.images || [],
    };
    await onSave(payload);
  };

  const doUpload = async () => {
    const f = fileRef.current?.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const token = await getIdToken();
      const { url } = await uploadProductImage(f, token);
      set("images", [...(values.images || []), url]);
    } catch (err) {
      alert(err?.response?.data?.error || err.message || "Upload failed");
    } finally {
      // clear input & state
      if (fileRef.current) fileRef.current.value = "";
      setUploading(false);
    }
  };

  const removeImage = (idx) => {
    const copy = [...(values.images || [])];
    copy.splice(idx, 1);
    set("images", copy);
  };

  return (
    <form onSubmit={handleSubmit} className="column" style={{ gap: 12 }}>
      <h3 style={{ marginTop: 0 }}>{initial ? "Edit Product" : "New Product"}</h3>

      <label className="column">
        <span>Name</span>
        <input required value={values.name} onChange={(e) => set("name", e.target.value)} />
      </label>

      <div className="row" style={{ gap: 12 }}>
        <label className="column" style={{ flex: 1 }}>
          <span>Price (USD)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={(values.priceCents / 100).toFixed(2)}
            onChange={(e) => set("priceCents", Math.round(Number(e.target.value || 0) * 100))}
          />
        </label>

        <label className="column" style={{ flex: 1 }}>
          <span>Category</span>
          <input value={values.category} onChange={(e) => set("category", e.target.value)} />
        </label>
      </div>

      <label className="column">
        <span>Description</span>
        <textarea rows="3" value={values.description} onChange={(e) => set("description", e.target.value)} />
      </label>

      <label className="column">
        <span>Tags (comma separated)</span>
        <input
          value={Array.isArray(values.tags) ? values.tags.join(", ") : values.tags}
          onChange={(e) => set("tags", e.target.value)}
        />
      </label>

      <label className="row" style={{ alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          checked={values.inStock}
          onChange={(e) => set("inStock", e.target.checked)}
        />
        <span>In stock</span>
      </label>

      <div className="column" style={{ gap: 8 }}>
        <span>Images</span>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {(values.images || []).map((url, idx) => (
            <div key={idx} className="card" style={{ width: 120 }}>
              <img src={url} alt="" style={{ height: 80, objectFit: "cover" }} />
              <button
                type="button"
                className="btn secondary"
                onClick={() => removeImage(idx)}
                style={{ margin: 8 }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="row" style={{ gap: 8 }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
          />
          <button
            type="button"
            className="btn secondary"
            onClick={doUpload}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : "Upload Image"}
          </button>
        </div>
      </div>

      <div className="row" style={{ gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        <button type="button" className="btn secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button className="btn" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}