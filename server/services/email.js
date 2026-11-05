import nodemailer from "nodemailer";
import Order from "../models/Order.js";

export function isEmailConfigured() {
  return Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD && process.env.EMAIL_FROM);
}

export async function sendOrderConfirmation(orderId) {
  if (!isEmailConfigured()) return false;
  const order = await Order.findById(orderId).populate("user", "email name").lean();
  if (!order?.user?.email) throw new Error("Cannot send the order confirmation: customer email is unavailable.");
  const transport = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === "true",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
  });
  await transport.sendMail({
    from: process.env.EMAIL_FROM,
    to: order.user.email,
    subject: `AUREVO order confirmed · ${order._id}`,
    text: `Hello ${order.user.name},\n\nYour AUREVO payment has been verified and your order ${order._id} is confirmed.\n\nTotal: INR ${order.totalAmount.toFixed(2)}\n\nYour invoice is available in My Orders after signing in.\n\nAUREVO · Time, Reimagined.`,
  });
  return true;
}
