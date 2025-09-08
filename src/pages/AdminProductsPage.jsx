import { useEffect, useState } from "react";
import { adminListProducts, adminCreateProduct, adminUpdateProduct, adminDeleteProduct, adminGetUploadUrl } from "../services/api";

export default function AdminProductsPage() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // product or null
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setItems(await adminListProducts());
    setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  function startNew() {
    setEditing({ name: "", description: "", priceCents: 0, images: [], category: "Hair Care", tags: [], inStock: true });
  }

  async function handleSave(p) {
    if (p.id) await adminUpdateProduct(p.id, p);
    else {
      const id = await adminCreateProduct(p);
      p.id = id;
    }
    setEditing(null);
    refresh();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this product?")) return;
    await adminDeleteProduct(id);
    refresh();
  }

  return (
    <div className="container">
      <h2>Admin • Products</h2>
      <div style={{marginBottom:12}}>
        <button className="btn" onClick={startNew}>+ New Product</button>
      </div>
      {loading ? <p>Loading…</p> : (
        <div className="grid">
          {items.map(p => (
            <div key={p.id} className="card">
              <img src={p.images?.[0]} alt="" className="product-img" />
              <div style={{fontWeight:600}}>{p.name}</div>
              <div>${(p.priceCents/100).toFixed(2)}</div>
              <div className="row" style={{marginTop:8}}>
                <button className="btn" onClick={()=>setEditing(p)}>Edit</button>
                <button className="btn secondary" onClick={()=>handleDelete(p.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <ProductForm product={editing} onClose={()=>setEditing(null)} onSave={handleSave} />}
    </div>
  );
}

function ProductForm({ product, onClose, onSave }) {
  const [form, setForm] = useState(product);
  const [uploading, setUploading] = useState(false);

  function update(k, v){ setForm(prev => ({...prev, [k]: v})); }

  async function handleFile(e){
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url, publicUrl } = await adminGetUploadUrl(file.name, file.type);
      await fetch(url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      update("images", [publicUrl]); // store the public URL as product image
    } finally {
      setUploading(false);
    }
  }

  function submit(e){ e.preventDefault(); onSave(form); }

  return (
    <div className="modal">
      <div className="modal-card">
        <h3>{form.id ? "Edit" : "New"} Product</h3>
        <form onSubmit={submit}>
          <label>Name<input value={form.name} onChange={e=>update("name", e.target.value)} required/></label>
          <label>Description<textarea value={form.description} onChange={e=>update("description", e.target.value)} /></label>
          <label>Price (USD)
            <input type="number" min="0" step="0.01"
              value={(form.priceCents||0)/100}
              onChange={e=>update("priceCents", Math.round(Number(e.target.value||0)*100))}
              required/>
          </label>
          <label>Category<input value={form.category} onChange={e=>update("category", e.target.value)} /></label>
          <label>Tags (comma separated)
            <input value={(form.tags||[]).join(", ")} onChange={e=>update("tags", e.target.value.split(",").map(s=>s.trim()).filter(Boolean))}/>
          </label>
          <label>In Stock
            <input type="checkbox" checked={!!form.inStock} onChange={e=>update("inStock", e.target.checked)} />
          </label>

          <div style={{marginTop:8}}>
            <input type="file" accept="image/*" onChange={handleFile} />
            {uploading && <span style={{marginLeft:8}}>Uploading…</span>}
            {form.images?.[0] && <div style={{marginTop:8}}><img src={form.images[0]} alt="" style={{width:160,borderRadius:12}}/></div>}
          </div>

          <div className="row" style={{marginTop:12}}>
            <button type="submit" className="btn">Save</button>
            <button type="button" className="btn secondary" onClick={onClose}>Close</button>
          </div>
        </form>
      </div>
    </div>
  );
}