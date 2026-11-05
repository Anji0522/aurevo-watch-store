import { Router } from "express";
import { body } from "express-validator";
import Cart from "../models/Cart.js";
import Watch from "../models/Watch.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError, validateRequest } from "../middleware/errors.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate("items.watch").lean();
    res.json({ items: cart?.items || [] });
  } catch (error) { next(error); }
});

router.post("/items", [
  body("watchId").isMongoId().withMessage("Invalid watch."),
  body("variant").trim().isLength({ min: 1, max: 60 }).withMessage("Choose a valid variant."),
  body("quantity").isInt({ min: 1, max: 10 }).withMessage("Quantity must be between 1 and 10."),
  validateRequest,
], async (req, res, next) => {
  try {
    const watch = await Watch.findById(req.body.watchId);
    if (!watch) throw new AppError(404, "Timepiece not found.");
    if (req.body.quantity > watch.stock) throw new AppError(409, "Requested quantity is not in stock.");
    if (watch.variants.length && !watch.variants.some((variant) => variant.name === req.body.variant)) {
      throw new AppError(400, "That variant is not available.");
    }
    const cart = await Cart.findOneAndUpdate(
      { user: req.user.id },
      { $setOnInsert: { user: req.user.id } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    const existing = cart.items.find((item) => item.watch.equals(watch._id) && item.variant === req.body.variant);
    const quantity = (existing?.quantity || 0) + Number(req.body.quantity);
    if (quantity > Math.min(10, watch.stock)) throw new AppError(409, "Cart quantity exceeds available stock.");
    if (existing) existing.quantity = quantity;
    else cart.items.push({ watch: watch._id, variant: req.body.variant, quantity });
    await cart.save();
    await cart.populate("items.watch");
    res.json({ items: cart.items });
  } catch (error) { next(error); }
});

router.patch("/items/:watchId", [
  body("quantity").isInt({ min: 1, max: 10 }).withMessage("Quantity must be between 1 and 10."),
  body("variant").optional().trim().isLength({ min: 1, max: 60 }),
  validateRequest,
], async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    const item = cart?.items.find((entry) => entry.watch.equals(req.params.watchId) && (!req.body.variant || entry.variant === req.body.variant));
    if (!item) throw new AppError(404, "Cart item not found.");
    const watch = await Watch.findById(item.watch);
    if (!watch || Number(req.body.quantity) > watch.stock) throw new AppError(409, "Requested quantity is not in stock.");
    item.quantity = Number(req.body.quantity);
    await cart.save();
    await cart.populate("items.watch");
    res.json({ items: cart.items });
  } catch (error) { next(error); }
});

router.delete("/items/:watchId", async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.json({ items: [] });
    cart.items = cart.items.filter((item) => !item.watch.equals(req.params.watchId));
    await cart.save();
    res.json({ items: cart.items });
  } catch (error) { next(error); }
});

router.delete("/", async (req, res, next) => {
  try {
    await Cart.findOneAndUpdate({ user: req.user.id }, { $set: { items: [] } });
    res.status(204).end();
  } catch (error) { next(error); }
});

export default router;
