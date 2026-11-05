import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    watch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Watch",
      required: true,
    },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    variant: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: { type: [orderItemSchema], required: true },
    address: { type: mongoose.Schema.Types.Mixed, required: true },
    deliveryMethod: {
      type: String,
      enum: ["standard", "express"],
      default: "standard",
    },
    subtotal: { type: Number, required: true, min: 0 },
    gstRate: { type: Number, required: true },
    gstAmount: { type: Number, required: true, min: 0 },
    deliveryAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["INR"], default: "INR" },
    paymentMethod: {
      type: String,
      enum: ["upi", "card", "netbanking", "wallet", "emi"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["created", "pending", "paid", "failed", "refunded"],
      default: "created",
    },
    razorpayOrderId: { type: String, unique: true, sparse: true, index: true },
    razorpayPaymentId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "awaiting_payment",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "awaiting_payment",
    },
    statusTimeline: [
      {
        status: { type: String, required: true },
        at: { type: Date, default: Date.now },
        note: String,
      },
    ],
    idempotencyKey: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

export default mongoose.models.Order || mongoose.model("Order", orderSchema);
