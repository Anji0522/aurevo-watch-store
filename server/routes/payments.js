import { Router } from "express";
import { randomUUID } from "node:crypto";
import { body, header } from "express-validator";
import Order from "../models/Order.js";
import PaymentEvent from "../models/PaymentEvent.js";
import Watch from "../models/Watch.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError, validateRequest } from "../middleware/errors.js";
import {
  calculateOrderAmounts,
  priceCheckoutItems,
  toPaise,
} from "../utils/pricing.js";
import { getRazorpayClient } from "../services/razorpay.js";
import {
  confirmCapturedPayment,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from "../services/paymentSettlement.js";

const router = Router();
const paymentMethods = ["upi", "card", "netbanking", "wallet", "emi"];
const checkoutValidation = [
  body("items")
    .isArray({ min: 1, max: 20 })
    .withMessage("Add between 1 and 20 items to checkout."),
  body("items.*.watchId").isMongoId().withMessage("Invalid watch in checkout."),
  body("items.*.variant")
    .trim()
    .isLength({ min: 1, max: 60 })
    .withMessage("Choose a valid watch variant."),
  body("items.*.quantity")
    .isInt({ min: 1, max: 10 })
    .withMessage("Quantity must be between 1 and 10."),
  body("address.fullName")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Enter the recipient name."),
  body("address.phone")
    .trim()
    .matches(/^[+0-9 ()-]{8,20}$/)
    .withMessage("Enter a valid phone number."),
  body("address.line1")
    .trim()
    .isLength({ min: 3, max: 150 })
    .withMessage("Enter a delivery address."),
  body("address.line2").optional().trim().isLength({ max: 150 }),
  body("address.city")
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("Enter a city."),
  body("address.state")
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("Enter a state."),
  body("address.pincode")
    .matches(/^[1-9][0-9]{5}$/)
    .withMessage("Enter a valid six-digit Indian pincode."),
  body("deliveryMethod")
    .optional()
    .isIn(["standard", "express"])
    .withMessage("Choose a valid delivery method."),
  body("paymentMethod")
    .isIn(paymentMethods)
    .withMessage("Choose an available online payment method."),
  header("Idempotency-Key")
    .matches(/^[A-Za-z0-9._:-]{8,100}$/)
    .withMessage("A valid Idempotency-Key header is required."),
  validateRequest,
];

function paymentResponse(order) {
  return {
    orderId: order.id,
    razorpayOrderId: order.razorpayOrderId,
    amount: toPaise(order.totalAmount),
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
    amounts: {
      subtotal: order.subtotal,
      gstRate: order.gstRate,
      gstAmount: order.gstAmount,
      deliveryAmount: order.deliveryAmount,
      totalAmount: order.totalAmount,
    },
  };
}

router.post(
  "/create-order",
  requireAuth,
  checkoutValidation,
  async (req, res, next) => {
    let order;
    try {
      const razorpay = getRazorpayClient();
      const idempotencyKey = `${req.user.id}:${req.get("Idempotency-Key")}`;
      const priorOrder = await Order.findOne({
        idempotencyKey,
        user: req.user.id,
      });
      if (priorOrder) {
        if (priorOrder.paymentStatus === "paid")
          throw new AppError(
            409,
            "This checkout attempt has already been paid.",
          );
        if (
          !priorOrder.razorpayOrderId ||
          priorOrder.paymentStatus === "failed"
        ) {
          throw new AppError(
            409,
            "This checkout attempt cannot be reused. Create a new payment attempt.",
          );
        }
        return res.status(200).json(paymentResponse(priorOrder));
      }

      const watchIds = [...new Set(req.body.items.map((item) => item.watchId))];
      const catalog = await Watch.find({ _id: { $in: watchIds } }).lean();
      const items = priceCheckoutItems(req.body.items, catalog);
      const deliveryMethod = req.body.deliveryMethod || "standard";
      const amounts = calculateOrderAmounts(items, deliveryMethod);
      order = await Order.create({
        user: req.user.id,
        items,
        address: req.body.address,
        deliveryMethod,
        ...amounts,
        paymentMethod: req.body.paymentMethod,
        paymentStatus: "pending",
        idempotencyKey,
        statusTimeline: [
          { status: "awaiting_payment", note: "Awaiting online payment." },
        ],
      });
      const providerOrder = await razorpay.orders.create({
        amount: toPaise(amounts.totalAmount),
        currency: "INR",
        receipt: `aurevo_${randomUUID().replaceAll("-", "")}`,
        notes: { aurevoOrderId: order.id },
      });
      order.razorpayOrderId = providerOrder.id;
      await order.save();
      res.status(201).json(paymentResponse(order));
    } catch (error) {
      if (order && !order.razorpayOrderId)
        await Order.deleteOne({ _id: order._id });
      next(error);
    }
  },
);

router.post(
  "/verify",
  requireAuth,
  [
    body("razorpay_order_id")
      .matches(/^order_[A-Za-z0-9]+$/)
      .withMessage("Invalid payment order."),
    body("razorpay_payment_id")
      .matches(/^pay_[A-Za-z0-9]+$/)
      .withMessage("Invalid payment reference."),
    body("razorpay_signature")
      .isHexadecimal()
      .isLength({ min: 64, max: 64 })
      .withMessage("Invalid payment signature."),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        req.body;
      if (
        !verifyCheckoutSignature(
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
        )
      ) {
        throw new AppError(400, "Payment signature verification failed.");
      }
      const order = await confirmCapturedPayment({
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        userId: req.user.id,
      });
      res.json({
        orderId: order.id,
        status: order.status,
        paymentStatus: order.paymentStatus,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/failure",
  requireAuth,
  [
    body("razorpay_order_id")
      .matches(/^order_[A-Za-z0-9]+$/)
      .withMessage("Invalid payment order."),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const order = await Order.findOneAndUpdate(
        {
          user: req.user.id,
          razorpayOrderId: req.body.razorpay_order_id,
          paymentStatus: "pending",
        },
        {
          $set: { paymentStatus: "failed" },
          $push: {
            statusTimeline: {
              status: "awaiting_payment",
              note: "Payment attempt failed.",
            },
          },
        },
        { new: true },
      );
      if (!order) {
        const existing = await Order.findOne({
          user: req.user.id,
          razorpayOrderId: req.body.razorpay_order_id,
        });
        if (!existing) throw new AppError(404, "Payment order not found.");
        if (existing.paymentStatus === "paid")
          throw new AppError(409, "This payment has already succeeded.");
        return res.json({
          orderId: existing.id,
          paymentStatus: existing.paymentStatus,
        });
      }
      res.json({ orderId: order.id, paymentStatus: order.paymentStatus });
    } catch (error) {
      next(error);
    }
  },
);

export async function handleRazorpayWebhook(req, res, next) {
  try {
    const signature = req.get("x-razorpay-signature");
    const eventId = req.get("x-razorpay-event-id");
    if (!verifyWebhookSignature(req.body, signature))
      throw new AppError(400, "Webhook signature verification failed.");
    if (!eventId || eventId.length > 200)
      throw new AppError(400, "Missing payment event identifier.");
    const event = JSON.parse(req.body.toString("utf8"));
    const eventRecord = await PaymentEvent.findOneAndUpdate(
      { eventId },
      { $setOnInsert: { eventId, eventType: event.event } },
      { upsert: true, new: true },
    );
    if (eventRecord.status === "completed")
      return res.json({ received: true, duplicate: true });

    if (event.event === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      if (!payment?.order_id || !payment?.id)
        throw new AppError(400, "Malformed captured payment event.");
      await confirmCapturedPayment({
        razorpayOrderId: payment.order_id,
        razorpayPaymentId: payment.id,
      });
    } else if (event.event === "payment.failed") {
      const payment = event.payload?.payment?.entity;
      if (!payment?.order_id)
        throw new AppError(400, "Malformed failed payment event.");
      await Order.updateOne(
        { razorpayOrderId: payment.order_id, paymentStatus: "pending" },
        {
          $set: { paymentStatus: "failed" },
          $push: {
            statusTimeline: {
              status: "awaiting_payment",
              note: "Razorpay reported a failed payment.",
            },
          },
        },
      );
    }
    eventRecord.status = "completed";
    await eventRecord.save();
    res.json({ received: true });
  } catch (error) {
    next(error);
  }
}

export default router;
