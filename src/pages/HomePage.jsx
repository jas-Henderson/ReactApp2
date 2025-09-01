// src/pages/HomePage.jsx
import { Link } from 'react-router-dom'
import logo from '../assets/Logo.png';

export default function HomePage() {
  return (
    <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
      {/* Logo */}
      <img 
        src={logo} 
        alt="Salon Store Logo" 
        style={{ width: 160, marginBottom: '1.5rem' }} 
      />

      {/* Heading */}
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
        Welcome to <span style={{ color: '#e91e63' }}>Salon Store</span>
      </h1>

      {/* Intro */}
      <p className="notice" style={{ fontSize: '1.2rem', maxWidth: 600, margin: '0 auto 2rem' }}>
        Your one-stop shop for professional salon supplies.  
        Browse products, add them to your cart 🛒, and complete a secure test payment with Stripe 💳.
      </p>

      {/* Call-to-action */}
      <Link 
        to="/products" 
        className="btn" 
        style={{ 
          display: 'inline-block', 
          marginTop: 12, 
          padding: '0.75rem 1.5rem', 
          fontSize: '1.1rem',
          backgroundColor: '#000',
          color: '#fff',
          borderRadius: '6px',
          textDecoration: 'none'
        }}
      >
        Shop Products
      </Link>
    </div>
  )
}