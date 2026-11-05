# AUREVO — Time, Reimagined.

AUREVO is a JavaScript-only MERN storefront project: MongoDB, Express, React, and Node.js. The catalog is browsable in read-only demo mode; authentication requires your own `JWT_SECRET` and a MongoDB connection. Razorpay server APIs are implemented in test mode and require your own test credentials; checkout UI is not wired yet.

## Stack

- MongoDB + Mongoose for product persistence
- Express + Node.js REST API
- React 18 + Vite frontend
- Plain JavaScript (ES modules); no TypeScript
- Three.js + React Three Fiber + Drei procedural watch model, lazy-loaded in the hero and product detail
- Framer Motion, GSAP/ScrollTrigger, Lenis, Lottie, and canvas-confetti for interactions and transitions
- Server-side Anthropic streaming for Aria; no API key or prompt is bundled into the browser

## Local setup

1. Install Node.js 20+ and MongoDB Community Server (or obtain a MongoDB Atlas URI).
2. Run `npm install`.
3. Copy `.env.example` to `.env`; configure `MONGODB_URI`, `JWT_SECRET` (at least 32 random characters), and `CLIENT_URL`. Add Razorpay test credentials and a webhook secret only when testing payments.
4. Run `npm run dev`. The React app is at `http://localhost:5173` and the API at `http://localhost:5000`.
5. Run `npm run seed` to insert or update the 12 sample watch records and clearly marked sample reviews.

Without `MONGODB_URI`, the API serves the sample catalog in read-only demo mode; this does not create orders or claim successful payments.
Without `JWT_SECRET`, auth endpoints that create or validate a session remain unavailable rather than using a fallback signing key.

## API

- `GET /api/health` — API and database/demo status
- `GET /api/watches` — browse catalog; supports collection, search, price/material/rating filters, and sorting
- `GET /api/watches/:slug` — product detail
- `/api/auth` — register, login, logout, current user, and CSRF token
- `/api/cart` and `/api/wishlist` — authenticated user cart and wishlist
- `GET /api/orders` — authenticated order history (order creation awaits verified payment phase)
- `POST /api/payments/create-order` — server-priced order using MongoDB catalog values; requires authentication, CSRF token, and `Idempotency-Key`
- `POST /api/payments/verify` — validates the checkout HMAC, fetches provider payment state, and settles payment/stock in a Mongo transaction
- `POST /api/payments/webhook` — raw-body webhook signature verification and event idempotency
- `GET /api/reviews/:watchId` — public reviews, sort/filter, real-customer rating distribution, demo-review labels
- `POST /api/reviews/:watchId` — one review per user, permitted only after a paid order for that watch
- `POST /api/reviews/:watchId/:reviewId/helpful` — one helpful vote per authenticated user
- `POST /api/ai/chat` — rate-limited SSE chat with live catalogue/order context and safe policy bounds

Only Razorpay test-mode key IDs (`rzp_test_...`) are accepted. Amounts are calculated server-side from catalog prices with 18% GST and optional ₹499 express delivery. Payment settlement needs a MongoDB replica set (Atlas provides one); the demo catalog mode cannot create orders or payments. Never place secret keys in Vite/client variables.
Aria requires both `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL`. When either is missing or the provider fails, the server streams a friendly fallback. Unknown store policies are not guessed; Aria directs visitors to Contact.

## Project layout

```text
client/                 React + Vite storefront
  public/favicon.svg    AUREVO favicon
  src/components/3d/    Procedural Three.js watch viewer
  src/App.jsx           Storefront and demo cart interactions
  src/styles.css        Responsive storefront styles
server/
  data/watches.js       12-watch sample catalog
  models/               Watch, User, Cart, Wishlist, Order, Review, PaymentEvent schemas
  middleware/           Auth, CSRF, validation, and centralized errors
  routes/               Auth, catalog, cart, wishlist, orders, and Razorpay routes
  services/             Razorpay client and transactional payment settlement
  scripts/seed.js       Explicit catalog seed script
  index.js              Express API setup
tests/                  Node test runner and Supertest API checks
.env.example            Local configuration template
```

## Before launch

This is a fictional brand with sample catalogue content. Seeded sample reviews have `isDemo: true`, are labelled “Sample review,” and do not affect customer rating totals. Product ratings stay at zero until genuine reviews exist. Production checkout, payment verification, account recovery, product photography/model licensing, delivery, taxes, and provider credentials must be configured and tested before taking orders. No cash-on-delivery or other cash-payment flow is implemented. Never accept a client-side payment success as proof of payment.
