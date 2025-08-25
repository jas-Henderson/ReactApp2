export default function Filters({ query, setQuery, category, setCategory, sort, setSort }) {
  return (
    <div className="row" style={{marginBottom:12}}>
      <input placeholder="Search products..." value={query} onChange={e=>setQuery(e.target.value)} />
      <select value={category} onChange={e=>setCategory(e.target.value)}>
        <option value="">All Categories</option>
        <option value="Hair Care">Hair Care</option>
        <option value="Styling">Styling</option>
        <option value="Tools">Tools</option>
        <option value="Color">Color</option>
      </select>
      <select value={sort} onChange={e=>setSort(e.target.value)}>
        <option value="newest">Newest</option>
        <option value="price-asc">Price ↑</option>
        <option value="price-desc">Price ↓</option>
      </select>
    </div>
  )
}