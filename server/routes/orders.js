import { Router } from "express";
import PDFDocument from "pdfkit";
import { param } from "express-validator";
import Order from "../models/Order.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError, validateRequest } from "../middleware/errors.js";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).lean();
    if (!order) return res.status(404).json({ error: "Order not found." });
    res.json({ order });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/:id/invoice",
  requireAuth,
  [
    param("id").isMongoId().withMessage("Invalid order reference."),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const order = await Order.findOne({
        _id: req.params.id,
        user: req.user.id,
      }).lean();
      if (!order) throw new AppError(404, "Order not found.");
      if (order.paymentStatus !== "paid")
        throw new AppError(
          409,
          "An invoice is available after payment is verified.",
        );

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="aurevo-invoice-${order._id}.pdf"`,
      );
      const document = new PDFDocument({ size: "A4", margin: 56 });
      document.on("error", next);
      document.pipe(res);
      document
        .fontSize(22)
        .fillColor("#4b1d8f")
        .text("AUREVO", { continued: true });
      document.fontSize(10).fillColor("#555").text("  ·  TIME, REIMAGINED.");
      document
        .moveDown()
        .fontSize(18)
        .fillColor("#222")
        .text("Payment invoice");
      document.fontSize(10).text(`Order reference: ${order.id}`);
      document.text(
        `Date: ${new Date(order.createdAt).toLocaleDateString("en-IN")}`,
      );
      document.moveDown().fontSize(12).text("Delivery address");
      document
        .fontSize(10)
        .text(
          `${order.address.fullName}\n${order.address.line1}${order.address.line2 ? `\n${order.address.line2}` : ""}\n${order.address.city}, ${order.address.state} ${order.address.pincode}\n${order.address.country || "India"}`,
        );
      document.moveDown().fontSize(12).text("Items");
      for (const item of order.items) {
        document
          .fontSize(10)
          .text(
            `${item.name} · ${item.variant} · ${item.quantity} × INR ${item.unitPrice.toFixed(2)} = INR ${(item.quantity * item.unitPrice).toFixed(2)}`,
          );
      }
      document
        .moveDown()
        .fontSize(10)
        .text(`Subtotal: INR ${order.subtotal.toFixed(2)}`);
      document.text(
        `GST (${(order.gstRate * 100).toFixed(0)}%): INR ${order.gstAmount.toFixed(2)}`,
      );
      document.text(`Delivery: INR ${order.deliveryAmount.toFixed(2)}`);
      document
        .moveDown()
        .fontSize(13)
        .fillColor("#4b1d8f")
        .text(`Total paid: INR ${order.totalAmount.toFixed(2)}`);
      document
        .moveDown()
        .fontSize(9)
        .fillColor("#666")
        .text("Payment status: Verified by Razorpay");
      document.text(
        "AUREVO is a fictional sample brand. This invoice is generated from a verified demo order.",
      );
      document.end();
    } catch (error) {
      next(error);
    }
  },
);

export default router;
