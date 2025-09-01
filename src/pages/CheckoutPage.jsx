// src/pages/CheckoutPage.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { createCheckoutSession } from "../services/api.js";
import "./CheckoutPage.css";

export default function CheckoutPage() {
  const { items, clear, subtotalCents } = useCart();
  const [loading, setLoading] = useState(false);
  const total = (subtotalCents / 100).toFixed(2);

  async function handlePay() {
    if (!items.length) return;
    try {
      setLoading(true);
      const { url } = await createCheckoutSession(
        items.map(({ id, qty }) => ({ id, qty }))
      );
      window.location.href = url;
    } catch (err) {
      console.error(err);
      alert("Payment session failed to start. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="checkout container">
      <header className="checkout__header">
        <h1 className="checkout__title">Checkout</h1>
        <Link to="/products" className="checkout__back">
          ← Continue shopping
        </Link>
      </header>

      {items.length === 0 ? (
        <div className="checkout__empty">
          <p>Your cart is empty.</p>
          <Link to="/products" className="btn btn--primary">Browse products</Link>
        </div>
      ) : (
        <div className="checkout__grid">
          {/* Left: Line items */}
          <section className="card items">
            <ul className="items__list">
              {items.map((it) => (
                <li key={it.id} className="items__row">
                  <div className="items__thumb">
                    {it.image ? (
                      <img src={it.image} alt={it.name} />
                    ) : (
                      <div className="items__placeholder" aria-hidden />
                    )}
                  </div>
                  <div className="items__info">
                    <div className="items__name">{it.name}</div>
                    <div className="items__meta">
                      Qty: <strong>{it.qty}</strong>
                    </div>
                  </div>
                  <div className="items__price">
                    ${(it.priceCents / 100).toFixed(2)}
                  </div>
                  <div className="items__lineTotal">
                    ${(it.priceCents * it.qty / 100).toFixed(2)}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Right: Summary */}
          <aside className="card summary">
            <h2 className="summary__title">Order Summary</h2>
            <div className="summary__row">
              <span>Subtotal</span>
              <span className="summary__value">${total}</span>
            </div>
            <div className="summary__row summary__row--muted">
              <span>Taxes & shipping</span>
              <span className="summary__value">Calculated at Stripe</span>
            </div>
            <div className="summary__divider" />
            <div className="summary__row summary__total">
              <span>Total</span>
              <span className="summary__value">${total}</span>
            </div>

            <button
              className="btn btn--primary btn--block"
              onClick={handlePay}
              disabled={loading}
            >
              {loading ? "Starting checkout…" : "Pay with Stripe"}
            </button>
            <button className="btn btn--ghost btn--block" onClick={clear}>
              Clear cart
            </button>

            <p className="summary__note">
              Use Stripe test card <code>4242 4242 4242 4242</code>, any future
              expiry, any CVC.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}