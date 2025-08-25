export default function ProductCard({ product, onAdd }) {
  return (
    <div className="card">
      <img src={product.images?.[0] || 'https://picsum.photos/seed/salon/600/400'} alt={product.name}/>
      <div className="card-body">
        <div style={{display:'flex',justifyContent:'space-between',gap:8}}>
          <div style={{fontWeight:700}}>{product.name}</div>
          <div className="price">${(product.priceCents/100).toFixed(2)}</div>
        </div>
        <div className="row">
          <span className="badge">{product.category}</span>
          {product.tags?.slice(0,2).map(t => <span key={t} className="badge">{t}</span>)}
        </div>
        <button className="btn" onClick={() => onAdd(product)}>Add to Cart</button>
      </div>
    </div>
  )
}