import { Routes, Route, Link } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import ProductsPage from './pages/ProductsPage.jsx'
import CheckoutPage from './pages/CheckoutPage.jsx'
import SuccessPage from './pages/SuccessPage.jsx'
import CancelPage from './pages/CancelPage.jsx'
import { CartProvider, useCart } from './context/CartContext.jsx'

function Nav() {
  const { cartCount, toggleCart } = useCart()
  return (
    <nav className="nav">
      <Link to="/" className="logo">Salon Store</Link>
      <div className="spacer"/>
      <Link to="/products">Products</Link>
      <button className="cart-btn" onClick={toggleCart}>Cart ({cartCount})</button>
    </nav>
  )
}

export default function App() {
  return (
    <CartProvider>
      <Nav/>
      <Routes>
        <Route path="/" element={<HomePage/>} />
        <Route path="/products" element={<ProductsPage/>} />
        <Route path="/checkout" element={<CheckoutPage/>} />
        <Route path="/success" element={<SuccessPage/>} />
        <Route path="/cancel" element={<CancelPage/>} />
      </Routes>
    </CartProvider>
  )
}