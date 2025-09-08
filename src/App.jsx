// src/App.jsx
import { Routes, Route, Link, Navigate } from "react-router-dom";

import HomePage from "./pages/HomePage.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import CheckoutPage from "./pages/CheckoutPage.jsx";
import SuccessPage from "./pages/SuccessPage.jsx";
import CancelPage from "./pages/CancelPage.jsx";

import { useCart } from "./context/CartContext.jsx";

// Admin pages
import AdminLoginPage from "./pages/AdminLoginPage.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import ProductEditor from "./pages/ProductEditor.jsx";
import { useAuth } from "./context/AuthContext.jsx";

// ------------------
// Navigation
// ------------------
function Nav() {
  const { cartCount, toggleCart } = useCart();
  const { user, isAdmin, signOut } = useAuth();

  return (
    <nav className="nav">
      <Link to="/" className="logo">Salon Store</Link>
      <div className="spacer" />

      <Link to="/products">Products</Link>
      {isAdmin && <Link to="/admin" style={{ marginLeft: 12 }}>Admin</Link>}

      {user ? (
        <button onClick={signOut} className="cart-btn" style={{ marginLeft: 12 }}>
          Logout
        </button>
      ) : (
        <Link to="/admin/login" style={{ marginLeft: 12 }}>Admin Login</Link>
      )}

      <button className="cart-btn" onClick={toggleCart} style={{ marginLeft: 12 }}>
        Cart ({cartCount})
      </button>
    </nav>
  );
}

// ------------------
// Protected Route Wrapper
// ------------------
function ProtectedRoute({ children }) {
  const { loading, isAdmin } = useAuth();
  if (loading) {
    return (
      <div className="container">
        <p>Checking permissions…</p>
      </div>
    );
  }
  return isAdmin ? children : <Navigate to="/admin/login" replace />;
}

// ------------------
// App Component
// ------------------
export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/cancel" element={<CancelPage />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products/new"
          element={
            <ProtectedRoute>
              <ProductEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products/:id"
          element={
            <ProtectedRoute>
              <ProductEditor />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}