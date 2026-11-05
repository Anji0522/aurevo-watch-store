import { useEffect } from "react";
import { api } from "../api/client.js";
import useAurevoStore from "../store/appStore.js";

const isWatchId = (id) => /^[a-f0-9]{24}$/i.test(id || "");

export default function SessionSync() {
  const user = useAurevoStore((state) => state.user);
  const setUser = useAurevoStore((state) => state.setUser);
  const setSessionReady = useAurevoStore((state) => state.setSessionReady);

  useEffect(() => {
    api("/auth/me")
      .then(({ user: current }) => {
        setUser(current);
        setSessionReady(true);
      })
      .catch((error) => {
        if (error.status === 401) {
          if (!useAurevoStore.getState().user) setUser(null);
        } else {
          console.error(
            "Could not restore the AUREVO account session:",
            error.message,
          );
        }
        setSessionReady(true);
      });
  }, [setUser, setSessionReady]);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    async function synchronizeAccount() {
      try {
        const state = useAurevoStore.getState();
        const [remoteCartResult, remoteWishlistResult] = await Promise.all([
          api("/cart"),
          api("/wishlist"),
        ]);
        const remoteCart = remoteCartResult.items || [];
        const remoteWishlist = remoteWishlistResult.watches || [];
        for (const localItem of state.cart) {
          if (!isWatchId(localItem._id || localItem.id)) continue;
          const remoteItem = remoteCart.find(
            (entry) =>
              entry.watch?._id === (localItem._id || localItem.id) &&
              entry.variant === localItem.variant,
          );
          if (!remoteItem) {
            const result = await api("/cart/items", {
              method: "POST",
              body: {
                watchId: localItem._id || localItem.id,
                variant: localItem.variant,
                quantity: localItem.quantity,
              },
            });
            remoteCart.splice(0, remoteCart.length, ...(result.items || []));
          } else if (localItem.quantity > remoteItem.quantity) {
            const result = await api(
              `/cart/items/${localItem._id || localItem.id}`,
              {
                method: "PATCH",
                body: {
                  variant: localItem.variant,
                  quantity: localItem.quantity,
                },
              },
            );
            remoteCart.splice(0, remoteCart.length, ...(result.items || []));
          }
        }
        for (const id of state.wishlist) {
          if (
            isWatchId(id) &&
            !remoteWishlist.some((watch) => watch._id === id)
          ) {
            const result = await api("/wishlist/items", {
              method: "POST",
              body: { watchId: id },
            });
            remoteWishlist.splice(
              0,
              remoteWishlist.length,
              ...(result.watches || []),
            );
          }
        }
        if (!active) return;
        const [latestCart, latestWishlist] = await Promise.all([
          api("/cart"),
          api("/wishlist"),
        ]);
        const cart = (latestCart.items || [])
          .filter((item) => item.watch)
          .map((item) => ({
            ...item.watch,
            id: item.watch._id,
            variant: item.variant,
            quantity: item.quantity,
          }));
        useAurevoStore.getState().hydrateAccountData(
          cart,
          (latestWishlist.watches || []).map((watch) => watch._id),
        );
      } catch (error) {
        console.error(
          "Could not synchronize this account's bag and wishlist:",
          error.message,
        );
      }
    }
    synchronizeAccount();
    return () => {
      active = false;
    };
  }, [user?.id]);

  return null;
}
