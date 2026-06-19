import { createContext, useContext, useMemo, useState } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('alberca_cart')) || [];
    } catch {
      return [];
    }
  });

  function persist(next) {
    setItems(next);
    localStorage.setItem('alberca_cart', JSON.stringify(next));
  }

  function addItem(product, quantity = 1) {
    const next = [...items];
    const index = next.findIndex((item) => item.product.id === product.id);
    if (index >= 0) {
      next[index] = { ...next[index], quantity: next[index].quantity + quantity };
    } else {
      next.push({ product, quantity });
    }
    persist(next);
  }

  function updateQuantity(productId, quantity) {
    persist(items.map((item) => item.product.id === productId ? { ...item, quantity: Number(quantity) } : item).filter((item) => item.quantity > 0));
  }

  function removeItem(productId) {
    persist(items.filter((item) => item.product.id !== productId));
  }

  function clearCart() {
    persist([]);
  }

  const value = useMemo(() => ({ items, addItem, updateQuantity, removeItem, clearCart }), [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}

