import { watches } from "../server/data/watches.js";

const demoUser = {
  id: "customer-demo",
  name: "Aurevo Test Customer",
  email: "customer@example.test",
  phone: "9876543210",
};
const catalog = watches.map((watch, index) => ({
  ...watch,
  _id: `64a${(index + 1).toString(16).padStart(21, "0")}`,
  rating: 0,
  reviewCount: 0,
  variants: watch.colors.map((name) => ({
    name,
    dialColor: name,
    strapColor: name,
  })),
}));

function serializedCart(state) {
  return state.cart
    .map((item) => ({
      watch: catalog.find((watch) => watch._id === item.watchId),
      variant: item.variant,
      quantity: item.quantity,
    }))
    .filter((item) => item.watch);
}

export async function installApiMocks(
  page,
  { user = null, paymentOutcome = "success" } = {},
) {
  const state = {
    cart: [],
    wishlist: [],
    reviews: [],
    verifiedPayments: 0,
    failedPayments: 0,
    lastCheckout: null,
  };

  await page.route("https://images.unsplash.com/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
    }),
  );
  await page.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ contentType: "text/css", body: "" }),
  );
  await page.addInitScript((outcome) => {
    globalThis.Razorpay = class {
      constructor(options) {
        this.options = options;
        this.failureHandler = null;
      }

      on(event, handler) {
        if (event === "payment.failed") this.failureHandler = handler;
      }

      open() {
        setTimeout(() => {
          if (outcome === "failed") {
            this.failureHandler?.({
              error: { metadata: { order_id: this.options.order_id } },
            });
          } else {
            this.options.handler({
              razorpay_order_id: this.options.order_id,
              razorpay_payment_id: "pay_test123",
              razorpay_signature:
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            });
          }
        }, 0);
      }
    };
  }, paymentOutcome);

  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname;
      const method = request.method();
      const json = (body, status = 200) =>
        route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(body),
        });

      if (path === "/api/auth/csrf")
        return json({ csrfToken: "playwright-csrf-token" });
      if (path === "/api/auth/me") return json({ user });
      if (path === "/api/auth/login" || path === "/api/auth/register")
        return json({ user: demoUser });
      if (path === "/api/auth/logout") return route.fulfill({ status: 204 });
      if (path === "/api/auth/profile" && method === "PATCH")
        return json({ user: { ...demoUser, ...request.postDataJSON() } });
      if (path === "/api/health")
        return json({ status: "ok", database: user ? "connected" : "demo" });

      if (path === "/api/watches" || path === "/api/watches/") {
        let result = [...catalog];
        const collection = url.searchParams.get("collection");
        const search = url.searchParams.get("search")?.toLowerCase();
        const material = url.searchParams.get("material")?.toLowerCase();
        if (collection && collection !== "All")
          result = result.filter((watch) => watch.collection === collection);
        if (search)
          result = result.filter((watch) =>
            watch.name.toLowerCase().includes(search),
          );
        if (material)
          result = result.filter((watch) =>
            watch.specs.material.toLowerCase().includes(material),
          );
        if (url.searchParams.get("sort") === "price-asc")
          result.sort((left, right) => left.price - right.price);
        if (url.searchParams.get("sort") === "price-desc")
          result.sort((left, right) => right.price - left.price);
        return json(result);
      }

      const watchMatch = path.match(/^\/api\/watches\/([^/]+)$/);
      if (watchMatch) {
        const watch = catalog.find(
          (item) => item.slug === decodeURIComponent(watchMatch[1]),
        );
        return watch
          ? json(watch)
          : json({ error: "Timepiece not found." }, 404);
      }

      if (path === "/api/cart" && method === "GET")
        return json({ items: serializedCart(state) });
      if (path === "/api/cart" && method === "DELETE") {
        state.cart = [];
        return route.fulfill({ status: 204 });
      }
      if (path === "/api/cart/items" && method === "POST") {
        const item = request.postDataJSON();
        const existing = state.cart.find(
          (entry) =>
            entry.watchId === item.watchId && entry.variant === item.variant,
        );
        if (existing) existing.quantity = item.quantity;
        else state.cart.push(item);
        return json({ items: serializedCart(state) });
      }
      const cartItemMatch = path.match(/^\/api\/cart\/items\/([^/]+)$/);
      if (cartItemMatch && method === "PATCH") {
        const { quantity, variant } = request.postDataJSON();
        const item = state.cart.find(
          (entry) =>
            entry.watchId === cartItemMatch[1] && entry.variant === variant,
        );
        if (item) item.quantity = quantity;
        return json({ items: serializedCart(state) });
      }
      if (cartItemMatch && method === "DELETE") {
        state.cart = state.cart.filter(
          (entry) =>
            entry.watchId !== cartItemMatch[1] ||
            entry.variant !== url.searchParams.get("variant"),
        );
        return json({ items: serializedCart(state) });
      }

      if (path === "/api/wishlist" && method === "GET")
        return json({
          watches: catalog.filter((watch) =>
            state.wishlist.includes(watch._id),
          ),
        });
      if (path === "/api/wishlist/items" && method === "POST") {
        const { watchId } = request.postDataJSON();
        if (!state.wishlist.includes(watchId)) state.wishlist.push(watchId);
        return json({
          watches: catalog.filter((watch) =>
            state.wishlist.includes(watch._id),
          ),
        });
      }
      const wishlistMatch = path.match(/^\/api\/wishlist\/items\/([^/]+)$/);
      if (wishlistMatch && method === "DELETE") {
        state.wishlist = state.wishlist.filter((id) => id !== wishlistMatch[1]);
        return json({
          watches: catalog.filter((watch) =>
            state.wishlist.includes(watch._id),
          ),
        });
      }

      const reviewMatch = path.match(/^\/api\/reviews\/([^/]+)$/);
      if (reviewMatch && method === "GET") {
        const selected = state.reviews.filter(
          (review) => review.watchId === reviewMatch[1],
        );
        return json({
          average: selected.length
            ? selected.reduce((sum, review) => sum + review.rating, 0) /
              selected.length
            : 0,
          total: selected.length,
          distribution: {
            5: 0,
            4: 0,
            3: 0,
            2: 0,
            1: 0,
            ...Object.fromEntries(
              selected.map((review) => [
                review.rating,
                selected.filter((item) => item.rating === review.rating).length,
              ]),
            ),
          },
          reviews: selected,
          demoCount: 0,
        });
      }
      if (reviewMatch && method === "POST") {
        const review = {
          id: "review-demo",
          rating: request.postDataJSON().rating,
          text: request.postDataJSON().text,
          displayName: user?.name || "Test customer",
          isDemo: false,
          verifiedPurchase: true,
          helpfulVotes: 0,
          createdAt: new Date().toISOString(),
          watchId: reviewMatch[1],
        };
        state.reviews = [
          ...state.reviews.filter((item) => item.watchId !== reviewMatch[1]),
          review,
        ];
        return json(
          {
            review,
            summary: {
              average: review.rating,
              total: 1,
              distribution: {
                5: review.rating === 5 ? 1 : 0,
                4: review.rating === 4 ? 1 : 0,
                3: review.rating === 3 ? 1 : 0,
                2: review.rating === 2 ? 1 : 0,
                1: review.rating === 1 ? 1 : 0,
              },
            },
          },
          201,
        );
      }

      if (path === "/api/ai/chat" && method === "POST") {
        return route.fulfill({
          status: 200,
          headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
          },
          body: 'event: token\ndata: {"text":"Hello from Aria. "}\n\nevent: done\ndata: {}\n\n',
        });
      }
      if (path === "/api/payments/create-order" && method === "POST") {
        state.lastCheckout = request.postDataJSON();
        return json(
          {
            orderId: "65f000000000000000000001",
            razorpayOrderId: "order_test123",
            amount: 5723000,
            currency: "INR",
            keyId: "rzp_test_playwright",
            amounts: {
              subtotal: 48500,
              gstRate: 0.18,
              gstAmount: 8730,
              deliveryAmount: 0,
              totalAmount: 57230,
            },
          },
          201,
        );
      }
      if (path === "/api/payments/verify" && method === "POST") {
        state.verifiedPayments += 1;
        return json({
          orderId: "65f000000000000000000001",
          status: "confirmed",
          paymentStatus: "paid",
        });
      }
      if (path === "/api/payments/failure" && method === "POST") {
        state.failedPayments += 1;
        return json({
          orderId: "65f000000000000000000001",
          paymentStatus: "failed",
        });
      }
      if (path === "/api/orders") return json({ orders: [] });
      if (path === "/api/orders/65f000000000000000000001") {
        return json({
          order: {
            _id: "65f000000000000000000001",
            paymentStatus: "paid",
            status: "confirmed",
            totalAmount: 57230,
            createdAt: new Date().toISOString(),
            items: [],
            statusTimeline: [],
          },
        });
      }
      return json({ error: `No test API mock for ${method} ${path}` }, 404);
    },
  );

  return { state, catalog, demoUser };
}
