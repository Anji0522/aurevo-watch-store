import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../api/client.js";

const productKey = (product) => product._id || product.id;
const validWatchId = (id) => /^[a-f0-9]{24}$/i.test(id || "");
const cartKey = (item) => `${productKey(item)}:${item.variant}`;

async function syncCartChange(previous, next) {
  const before = new Map(previous.map((item) => [cartKey(item), item]));
  const after = new Map(next.map((item) => [cartKey(item), item]));
  for (const [key, item] of before) {
    if (!validWatchId(productKey(item))) continue;
    const updated = after.get(key);
    if (!updated) {
      await api(
        `/cart/items/${productKey(item)}?variant=${encodeURIComponent(item.variant)}`,
        { method: "DELETE" },
      );
    } else if (updated.quantity !== item.quantity) {
      if (updated.quantity > 0) {
        await api(`/cart/items/${productKey(item)}`, {
          method: "PATCH",
          body: { variant: item.variant, quantity: updated.quantity },
        });
      } else {
        await api(
          `/cart/items/${productKey(item)}?variant=${encodeURIComponent(item.variant)}`,
          { method: "DELETE" },
        );
      }
    }
    after.delete(key);
  }
  for (const item of after.values()) {
    if (validWatchId(productKey(item))) {
      await api("/cart/items", {
        method: "POST",
        body: {
          watchId: productKey(item),
          variant: item.variant,
          quantity: item.quantity,
        },
      });
    }
  }
}

const useAurevoStore = create(
  persist(
    (set, get) => ({
      cart: [],
      wishlist: [],
      user: null,
      sessionReady: false,
      addToCart: (product, variant = product.colors?.[0] || "Midnight") =>
        set((state) => {
          const key = productKey(product);
          const existing = state.cart.find(
            (item) => productKey(item) === key && item.variant === variant,
          );
          const cart = existing
            ? state.cart.map((item) =>
                productKey(item) === key && item.variant === variant
                  ? { ...item, quantity: item.quantity + 1 }
                  : item,
              )
            : [...state.cart, { ...product, id: key, variant, quantity: 1 }];
          if (state.user)
            syncCartChange(state.cart, cart).catch((error) =>
              console.error(
                "Could not sync the bag with your account:",
                error.message,
              ),
            );
          return { cart };
        }),
      setCart: (next) =>
        set((state) => {
          const cart = typeof next === "function" ? next(state.cart) : next;
          if (state.user)
            syncCartChange(state.cart, cart).catch((error) =>
              console.error(
                "Could not sync the bag with your account:",
                error.message,
              ),
            );
          return { cart };
        }),
      toggleWishlist: (id) =>
        set((state) => {
          const removing = state.wishlist.includes(id);
          const wishlist = removing
            ? state.wishlist.filter((item) => item !== id)
            : [...state.wishlist, id];
          if (state.user && validWatchId(id)) {
            const request = removing
              ? api(`/wishlist/items/${id}`, { method: "DELETE" })
              : api("/wishlist/items", {
                  method: "POST",
                  body: { watchId: id },
                });
            request.catch((error) =>
              console.error(
                "Could not sync the wishlist with your account:",
                error.message,
              ),
            );
          }
          return { wishlist };
        }),
      setWishlist: (wishlist) => set({ wishlist }),
      hydrateAccountData: (cart, wishlist) => set({ cart, wishlist }),
      setUser: (user) => set({ user }),
      setSessionReady: (sessionReady) => set({ sessionReady }),
      clearCart: () => {
        if (get().user)
          api("/cart", { method: "DELETE" }).catch((error) =>
            console.error("Could not clear the account bag:", error.message),
          );
        set({ cart: [] });
      },
    }),
    {
      name: "aurevo-store",
      partialize: ({ cart, wishlist }) => ({ cart, wishlist }),
    },
  ),
);

export default useAurevoStore;
