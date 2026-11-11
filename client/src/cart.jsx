// Owner: Lennox – FSDP-65 (one cart across many stalls), FSDP-42 (notes per dish)
// The cart lives in the browser (saved in localStorage) until the order is placed.
//   const { lines, count, totalCents, add, setQuantity, setNotes, remove, clear } = useCart();
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CART_KEY = 'hawker-emenu-cart-v1';
const CartContext = createContext(null);

function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
}

export function CartProvider({ children }) {
  // line = { key, itemId, name, priceCents, photoUrl, stallId, stallName, quantity, notes }
  const [lines, setLines] = useState(loadCart);

  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(lines)); } catch { /* storage blocked */ }
  }, [lines]);

  const value = useMemo(() => {
    // Same dish + same notes = one line; different notes = separate lines
    function add(item, stall, quantity = 1, notes = '') {
      const clean = notes.trim();
      setLines((prev) => {
        const key = `${item.id}|${clean}`;
        const found = prev.find((l) => l.key === key);
        if (found) return prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(20, l.quantity + quantity) } : l));
        return [...prev, {
          key, itemId: item.id, name: item.name, priceCents: item.priceCents, photoUrl: item.photoUrl,
          stallId: stall.id, stallName: stall.name, quantity, notes: clean,
        }];
      });
    }
    const setQuantity = (key, quantity) =>
      setLines((prev) => (quantity <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, quantity } : l))));
    const setNotes = (key, notes) =>
      setLines((prev) => prev.map((l) => (l.key === key ? { ...l, notes } : l)));
    const remove = (key) => setLines((prev) => prev.filter((l) => l.key !== key));
    const clear = () => setLines([]);

    // Group lines by stall for the cart page: [{ stallId, stallName, lines, subtotalCents }]
    const byStall = [];
    for (const l of lines) {
      let group = byStall.find((g) => g.stallId === l.stallId);
      if (!group) byStall.push(group = { stallId: l.stallId, stallName: l.stallName, lines: [], subtotalCents: 0 });
      group.lines.push(l);
      group.subtotalCents += l.priceCents * l.quantity;
    }

    return {
      lines, byStall, add, setQuantity, setNotes, remove, clear,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      totalCents: lines.reduce((n, l) => n + l.priceCents * l.quantity, 0),
      quantityOf: (itemId) => lines.filter((l) => l.itemId === itemId).reduce((n, l) => n + l.quantity, 0),
    };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}