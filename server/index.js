import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import { rateLimit } from "express-rate-limit";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import watchRoutes from "./routes/watches.js";
import cartRoutes from "./routes/cart.js";
import wishlistRoutes from "./routes/wishlist.js";
import orderRoutes from "./routes/orders.js";
import paymentRoutes, { handleRazorpayWebhook } from "./routes/payments.js";
import reviewRoutes from "./routes/reviews.js";
import aiRoutes from "./routes/ai.js";
import { csrfProtection } from "./middleware/csrf.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";

const app = express();
const port = Number(process.env.PORT) || 5000;

if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";
const apiLimiter = rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: "draft-8", legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 12, standardHeaders: "draft-8", legacyHeaders: false });

app.use(helmet());
app.use(cors({ origin: allowedOrigin, credentials: true, methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type", "X-CSRF-Token", "Idempotency-Key"] }));
app.use(cookieParser());
app.use("/api", apiLimiter);
app.post("/api/payments/webhook", express.raw({ type: "application/json", limit: "100kb" }), handleRazorpayWebhook);
app.use(express.json({ limit: "20kb" }));
app.use(mongoSanitize());
app.use(csrfProtection);
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "demo" });
});

app.use("/api/auth/register", authLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/watches", watchRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/ai", aiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("Connected to MongoDB.");
    } catch (error) {
      console.error("MongoDB connection failed:", error.message);
      process.exitCode = 1;
      return;
    }
  } else {
    console.warn("MONGODB_URI is not configured; catalog reads are in read-only demo mode.");
  }
  app.listen(port, () => console.log(`AUREVO API listening on http://localhost:${port}`));
}

if (process.env.NODE_ENV !== "test") start();

export default app;
