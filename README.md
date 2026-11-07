# AUREVO — Time, Reimagined.

AUREVO is a JavaScript-only MERN storefront project: MongoDB, Express, React, and Node.js. The catalog is browsable in read-only demo mode. Account, order, review, and payment operations require your own MongoDB connection and provider credentials.

**Live demo:** Not deployed yet. See the [local screenshots](#screenshots) below.

## Features

- Browse and filter a 12-watch sample catalog, including product details and a procedural 3D viewer
- Persistent bag and wishlist, with optional account synchronization
- Account, order, and review flows when MongoDB and a signing secret are configured
- Secure Razorpay test-mode checkout, server-side payment verification, and PDF invoices
- Streaming Aria assistant with a friendly fallback when provider credentials are absent

## Stack

- MongoDB + Mongoose for product persistence
- Express + Node.js REST API
- React 18 + Vite frontend
- React Router and Zustand for storefront routes and persistent bag/wishlist state
- Plain JavaScript (ES modules); no TypeScript
- Three.js + React Three Fiber + Drei procedural watch model, lazy-loaded in the hero and product detail
- Framer Motion, GSAP/ScrollTrigger, Lenis, Lottie, and canvas-confetti for interactions and transitions
- Server-side Anthropic streaming for Aria; no API key or prompt is bundled into the browser
- PDFKit invoices and optional SMTP order-confirmation email

## Screenshots

These are local demo captures; they are not screenshots of a live deployment.

![AUREVO desktop homepage](./screenshots/homepage.png)

![AUREVO desktop shop](./screenshots/shop.png)

![AUREVO mobile homepage](./screenshots/home-mobile.png)

## Local setup

1. Install Node.js 20+ and MongoDB Community Server (or obtain a MongoDB Atlas URI).
2. Run `npm install`.
3. Copy `.env.example` to `.env`; configure `MONGODB_URI`, `JWT_SECRET` (at least 32 random characters), and `CLIENT_URL`. Set `VITE_API_URL` only when the client and API use different origins. Add Razorpay test credentials and a webhook secret only when testing payments.
4. Run `npm run dev`. This starts both the React app at `http://localhost:5173` and the API at `http://localhost:5000`; the Vite frontend proxies `/api` requests to the API. Running `npm run client:dev` alone will leave API requests unavailable.
5. Run `npm run seed` to insert or update the 12 sample watch records and clearly marked sample reviews.

Without `MONGODB_URI`, the API serves the sample catalog in read-only demo mode; checkout is visibly disabled and cannot create orders or claim successful payments.
Without `JWT_SECRET`, auth endpoints that create or validate a session remain unavailable rather than using a fallback signing key.

The storefront includes shop filters/search, product detail with a procedural 3D viewer, bag, wishlist, signup/signin, profile, order history, checkout, order confirmation, and policy/contact pages. The bag and wishlist persist locally for visitors and synchronize to the account when signed in. Checkout requires an account and a connected MongoDB database; Razorpay Checkout is restricted to the selected UPI, card, net banking, wallet, or EMI method. Payment confirmation is displayed only after the server verifies the Razorpay signature and provider payment status. Set SMTP values in `.env` to send confirmation emails. An invoice PDF is available only for a server-verified paid order.

## Usage and scripts

Open `http://localhost:5173` after starting `npm run dev`. The API health check is at `http://localhost:5000/api/health`.

| Command              | Purpose                                           |
| -------------------- | ------------------------------------------------- |
| `npm run dev`        | Start the frontend and API together               |
| `npm start`          | Start the API                                     |
| `npm run client:dev` | Start only Vite (requires a separate API process) |
| `npm run seed`       | Seed the sample catalog and reviews               |
| `npm run build`      | Build the frontend for production                 |
| `npm test`           | Run server and client tests                       |
| `npm run lint`       | Lint application and test code                    |
| `npm run test:e2e`   | Run mocked Playwright journeys                    |

## Environment variables

Copy `.env.example` to `.env`; keep all real values local or in the hosting provider's secret manager. Never use Vite-prefixed variables for secrets.

| Variable                                                                                 | Purpose                                                                       |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `PORT`                                                                                   | API port; Render supplies this automatically                                  |
| `MONGODB_URI`                                                                            | MongoDB connection string (Atlas replica set required for payment settlement) |
| `CLIENT_URL`                                                                             | Exact browser app origin allowed by the API                                   |
| `VITE_API_URL`                                                                           | Public API origin for a separately hosted client; blank for local Vite proxy  |
| `JWT_SECRET`                                                                             | Private session-signing key; use a random value of at least 32 characters     |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`                      | Razorpay test credentials and webhook signature secret                        |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`                                                   | Optional server-side Aria provider credentials                                |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM` | Optional SMTP confirmation email settings                                     |

### Razorpay test payments

Only `rzp_test_...` key IDs are accepted. This repository does not include merchant credentials or real payment details, and browser E2E payment results are mocked. After configuring your own Razorpay test account, use the provider's current test instruments from the [Razorpay Payments documentation](https://razorpay.com/docs/payments/)—never enter a real card or UPI ID in test instructions.

## Verification

```bash
npm test
npm run lint
npm run format:check
npm run build
npm run test:e2e
```

The Playwright suite uses local API, payment, and AI mocks; it does not make real provider requests. Install the browser once with `npx playwright install chromium`. The detailed results and live-provider limitations are in [TEST_REPORT.md](./TEST_REPORT.md).

## API

- `GET /api/health` — API and database/demo status
- `GET /api/watches` — browse catalog; supports collection, search, price/material/rating filters, and sorting
- `GET /api/watches/:slug` — product detail
- `/api/auth` — register, login, logout, current user, and CSRF token
- `PATCH /api/auth/profile` — update the signed-in user's name and phone
- `/api/cart` and `/api/wishlist` — authenticated user cart and wishlist
- `GET /api/orders` — authenticated order history
- `GET /api/orders/:id/invoice` — PDF invoice for a verified paid order
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
  public/logo.svg       Simple SVG wordmark
  src/pages/            Shop, product, account, checkout, order, and policy routes
  src/store/            Persistent bag and wishlist state
  src/api/              Credentialed API and CSRF helper
  src/components/3d/    Procedural Three.js watch viewer
  src/App.jsx           Storefront route table and home page
  src/styles.css        Home page styles
  src/pages.css         Responsive route/page styles
screenshots/            Local desktop and mobile demo captures
server/
  data/watches.js       12-watch sample catalog
  models/               Watch, User, Cart, Wishlist, Order, Review, PaymentEvent schemas
  middleware/           Auth, CSRF, validation, and centralized errors
  routes/               Auth, catalog, cart, wishlist, orders, and Razorpay routes
  services/             Razorpay, transactional settlement, and optional SMTP
  scripts/seed.js       Explicit catalog seed script
  index.js              Express API setup
tests/                  Node test runner and Supertest API checks
e2e/                    Mocked Playwright storefront journeys
client/src/test/        Vitest and Testing Library setup
client/src/**/*.test.jsx Frontend unit tests
eslint.config.js        ESLint configuration
playwright.config.js    Browser test configuration
TEST_REPORT.md          Test results and unverified external integrations
package.json            Development, build, seed, lint, and test scripts
render.yaml             Render API service blueprint
vercel.json             Vite build and SPA fallback configuration
.env.example            Local configuration template
```

## Before launch

This is a fictional brand with sample catalogue content. Seeded sample reviews have `isDemo: true`, are labelled “Sample review,” and do not affect customer rating totals. Product ratings stay at zero until genuine reviews exist. Only Razorpay test keys (`rzp_test_...`) are accepted. Before production, configure and thoroughly test all provider credentials, MongoDB replica-set transactions, email, delivery, tax rules, product photography/model licensing, account recovery, and deployment cookie/CORS settings. Google login, phone OTP, customer photo uploads, and guest checkout are not configured. No cash-on-delivery or other cash-payment flow is implemented. Never accept a client-side payment success as proof of payment.

No public GitHub repository or deployment URL has been configured yet. A MongoDB Atlas URI, Razorpay test credentials, Anthropic credentials, SMTP settings (if email is required), and GitHub/Vercel/Render account authorization are still needed before the real integrations and deployment can be verified.

## Deployment preparation

- `render.yaml` defines the free Render API service. Set its MongoDB Atlas URI and the exact deployed client origin in the Render dashboard; add Razorpay, Anthropic, and SMTP secrets there only when those integrations are enabled.
- `vercel.json` builds the Vite client from the repository root and rewrites client-side routes to `index.html`. Set `VITE_API_URL` in Vercel to the deployed Render API origin, without a trailing slash, then redeploy.
- The API enables credentialed CORS for `CLIENT_URL` and production cookies use `SameSite=None; Secure`. Configure the matching exact client origin before testing sign-in or checkout across the two hosts.
- Render's free service may sleep between requests. Live provider, database transaction, and cross-domain cookie behavior still need smoke testing after credentials and account access are configured.

## License

No license file is currently provided. Obtain permission from the copyright holder before reusing or distributing this project.
