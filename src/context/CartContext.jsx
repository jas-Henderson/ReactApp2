import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";

const CartCtx = createContext(null);
const LS_KEY = "cart_v1";

function loadCart() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Array.isArray(parsed.items)) return parsed.items;
  } catch {}
  return [];
}

export function CartProvider({ children }) {
  const [open, setOpen] = useState(false);
  // hydrate from localStorage once at mount
  const [items, setItems] = useState(() => loadCart()); // [{id, name, priceCents, qty, image}]

  // persist to localStorage whenever items change
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ items }));
    } catch {}
  }, [items]);

  // optional: cross-tab sync
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === LS_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && Array.isArray(parsed.items)) {
            setItems(parsed.items);
          }
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((p) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === p.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [
        ...prev,
        {
          id: p.id,
          name: p.name,
          priceCents: p.priceCents,
          image: p.images?.[0] || "",
          qty: 1,
        },
      ];
    });
    setOpen(true);
  }, []);

  const remove = useCallback(
    (id) => setItems((prev) => prev.filter((i) => i.id !== id)),
    []
  );

  const setQty = useCallback((id, qty) => {
    const n = Number(qty);
    const safe = Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: safe } : i)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const subtotalCents = useMemo(
    () => items.reduce((s, i) => s + i.priceCents * i.qty, 0),
    [items]
  );
  const cartCount = useMemo(
    () => items.reduce((s, i) => s + i.qty, 0),
    [items]
  );
  const toggleCart = useCallback(() => setOpen((o) => !o), []);

  return (
    <CartCtx.Provider
      value={{
        open,
        toggleCart,
        items,
        add,
        remove,
        setQty,
        clear,
        subtotalCents,
        cartCount,
      }}
    >
      {children}
      {open && <CartDrawer />}
    </CartCtx.Provider>
  );
}

export const useCart = () => useContext(CartCtx);

function CartDrawer() {
  const { items, remove, setQty, toggleCart, subtotalCents } = useCart();
  return (
    <aside className="sidebar">
      <h3>Your Cart</h3>
      {items.length === 0 ? (
        <p>Cart is empty.</p>
      ) : (
        items.map((i) => (
          <div key={i.id} className="line">
            <div>
              <div style={{ fontWeight: 600 }}>{i.name}</div>
              <div>${(i.priceCents / 100).toFixed(2)}</div>
            </div>
            <div>
              <input
                type="number"
                min="1"
                value={i.qty}
                onChange={(e) => setQty(i.id, e.target.value)}
                style={{ width: 64 }}
              />
              <button
                className="btn secondary"
                onClick={() => remove(i.id)}
                style={{ marginLeft: 8 }}
              >
                Remove
              </button>
            </div>
          </div>
        ))
      )}
      <div className="total">Subtotal: ${(subtotalCents / 100).toFixed(2)}</div>
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn" onClick={() => (window.location.href = "/checkout")}>
          Checkout
        </button>
        <button className="btn secondary" onClick={toggleCart}>
          Close
        </button>
      </div>
    </aside>
  );
}