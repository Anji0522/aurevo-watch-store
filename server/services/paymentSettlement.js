import { createHmac, timingSafeEqual } from "node:crypto";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Watch from "../models/Watch.js";
import { AppError } from "../middleware/errors.js";
import { getRazorpayClient } from "./razorpay.js";

function secureHexEqual(expected, provided) {
  if (typeof provided !== "string" || !/^[a-f0-9]+$/i.test(provided) || expected.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
}

export function verifyCheckoutSignature(orderId, paymentId, signature, secret = process.env.RAZORPAY_KEY_SECRET) {
  if (!secret || !orderId || !paymentId) return false;
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return secureHexEqual(expected, signature);
}

export function verifyWebhookSignature(rawBody, signature, secret = process.env.RAZORPAY_WEBHOOK_SECRET) {
  if (!secret || !Buffer.isBuffer(rawBody)) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return secureHexEqual(expected, signature);
}

export async function confirmCapturedPayment({ razorpayOrderId, razorpayPaymentId, userId }) {
  const razorpay = getRazorpayClient();
  const payment = await razorpay.payments.fetch(razorpayPaymentId);
  if (
    payment.order_id !== razorpayOrderId ||
    payment.currency !== "INR" ||
    !["captured", "authorized"].includes(payment.status)
  ) {
    throw new AppError(400, "The payment provider could not confirm this payment.");
  }

  if (payment.status === "authorized") {
    const captured = await razorpay.payments.capture(razorpayPaymentId, payment.amount, payment.currency);
    if (captured.status !== "captured" || captured.amount !== payment.amount || captured.currency !== "INR") {
      throw new AppError(409, "Payment authorization is awaiting capture.");
    }
  }

  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({ razorpayOrderId, ...(userId ? { user: userId } : {}) }).session(session);
      if (!order) throw new AppError(404, "Payment order not found.");
      const expectedPaise = order.totalAmount * 100;
      if (payment.amount !== expectedPaise) throw new AppError(400, "Payment amount does not match the order.");
      if (order.paymentStatus === "paid") {
        if (order.razorpayPaymentId !== razorpayPaymentId) throw new AppError(409, "This order already has a different successful payment.");
        result = order;
        return;
      }
      if (!["created", "pending", "failed"].includes(order.paymentStatus)) {
        throw new AppError(409, "This order is no longer payable. Start a new checkout attempt.");
      }

      for (const item of order.items) {
        const stockUpdate = await Watch.updateOne(
          { _id: item.watch, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { session },
        );
        if (stockUpdate.modifiedCount !== 1) throw new AppError(409, "Stock changed before payment completed. Contact support for a refund.");
      }

      order.paymentStatus = "paid";
      order.razorpayPaymentId = razorpayPaymentId;
      order.status = "confirmed";
      order.statusTimeline.push({ status: "confirmed", note: "Payment verified by Razorpay." });
      await order.save({ session });
      result = order;
    });
  } finally {
    await session.endSession();
  }
  return result;
}
