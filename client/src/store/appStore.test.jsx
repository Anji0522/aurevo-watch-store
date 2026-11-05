import { beforeEach, describe, expect, it } from "vitest";
import useAurevoStore from "./appStore.js";

const watch = {
  id: "watch-demo",
  slug: "aurevo-chronos",
  name: "Aurevo Chronos",
  price: 48500,
  colors: ["Midnight", "Ivory"],
};

describe("AUREVO storefront state", () => {
  beforeEach(() => {
    localStorage.clear();
    useAurevoStore.setState({
      cart: [],
      wishlist: [],
      user: null,
      sessionReady: false,
    });
  });

  it("increments matching bag variants independently", () => {
    const store = useAurevoStore.getState();
    store.addToCart(watch, "Midnight");
    useAurevoStore.getState().addToCart(watch, "Midnight");
    useAurevoStore.getState().addToCart(watch, "Ivory");

    expect(useAurevoStore.getState().cart).toEqual([
      { ...watch, variant: "Midnight", quantity: 2 },
      { ...watch, id: watch.id, variant: "Ivory", quantity: 1 },
    ]);
  });

  it("toggles a saved product without disturbing the bag", () => {
    useAurevoStore.getState().addToCart(watch);
    useAurevoStore.getState().toggleWishlist(watch.id);
    expect(useAurevoStore.getState().wishlist).toEqual([watch.id]);
    useAurevoStore.getState().toggleWishlist(watch.id);
    expect(useAurevoStore.getState().wishlist).toEqual([]);
    expect(useAurevoStore.getState().cart).toHaveLength(1);
  });

  it("persists guest bag and wishlist state but not account data", () => {
    useAurevoStore.getState().addToCart(watch);
    useAurevoStore.getState().toggleWishlist(watch.id);
    useAurevoStore
      .getState()
      .setUser({ id: "private-user", name: "Aurevo User" });

    const persisted = JSON.parse(localStorage.getItem("aurevo-store"));
    expect(persisted.state).toMatchObject({
      cart: [{ id: watch.id, quantity: 1 }],
      wishlist: [watch.id],
    });
    expect(persisted.state.user).toBeUndefined();
  });
});
