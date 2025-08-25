import { useCart } from '../context/CartContext.jsx'
import { createCheckoutSession } from '../services/api.js'

export default function CheckoutPage() {
  const { items, subtotalCents, clear } = useCart()

  const handleCheckout = async () => {
    if (items.length === 0) return
    const payload = items.map(i => ({ id: i.id, qty: i.qty }))
    const { url } = await createCheckoutSession(payload)
    window.location.href = url
  }

  return (
    <div className="container">
      <h2>Checkout</h2>
      {items.length === 0 ? <p>Your cart is empty.</p> : (
        <>
          {items.map(i => (
            <div key={i.id} className="line">
              <div>{i.name} × {i.qty}</div>
              <div>${((i.qty * i.priceCents)/100).toFixed(2)}</div>
            </div>
          ))}
          <div className="total">Total: ${(subtotalCents/100).toFixed(2)}</div>
          <div className="row" style={{marginTop:12}}>
            <button className="btn" onClick={handleCheckout}>Pay with Stripe</button>
            <button className="btn secondary" onClick={clear}>Clear Cart</button>
          </div>
          <p style={{marginTop:12}}>Use Stripe test card: <b>4242 4242 4242 4242</b>, any future expiry, any CVC.</p>
        </>
      )}
    </div>
  )
}