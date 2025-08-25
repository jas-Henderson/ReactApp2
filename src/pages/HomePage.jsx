import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="container">
      <h1>Welcome to Salon Store</h1>
      <p className="notice">Browse professional salon products, add to cart, and complete a secure test payment with Stripe.</p>
      <Link to="/products" className="btn" style={{display:'inline-block',marginTop:12}}>Shop Products</Link>
    </div>
  )
}