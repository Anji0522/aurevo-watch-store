import { Router } from "express";
import Order from "../models/Order.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json({ orders });
  } catch (error) { next(error); }
});

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id }).lean();
    if (!order) return res.status(404).json({ error: "Order not found." });
    res.json({ order });
  } catch (error) { next(error); }
});

export default router;
