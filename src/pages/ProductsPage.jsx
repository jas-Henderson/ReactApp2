import { useEffect, useState } from 'react'
import { listProducts } from '../services/api.js'
import ProductCard from '../components/ProductCard.jsx'
import Filters from '../components/Filters.jsx'
import { useCart } from '../context/CartContext.jsx'

export default function ProductsPage() {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('newest')
  const { add } = useCart()

  useEffect(() => {
    setLoading(true)
    listProducts({ q: query, category, sort }).then(d => {
      setProducts(d.products)
    }).finally(() => setLoading(false))
  }, [query, category, sort])

  return (
    <div className="container">
      <h2>Products</h2>
      <Filters query={query} setQuery={setQuery} category={category} setCategory={setCategory} sort={sort} setSort={setSort}/>
      {loading ? <p>Loading...</p> : (
        <div className="grid">
          {products.map(p => <ProductCard key={p.id} product={p} onAdd={add} />)}
        </div>
      )}
    </div>
  )
}