import { Router } from "express";
import { body } from "express-validator";
import Wishlist from "../models/Wishlist.js";
import Watch from "../models/Watch.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError, validateRequest } from "../middleware/errors.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id })
      .populate("watches")
      .lean();
    res.json({ watches: wishlist?.watches || [] });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/items",
  [body("watchId").isMongoId().withMessage("Invalid watch."), validateRequest],
  async (req, res, next) => {
    try {
      if (!(await Watch.exists({ _id: req.body.watchId })))
        throw new AppError(404, "Timepiece not found.");
      const wishlist = await Wishlist.findOneAndUpdate(
        { user: req.user.id },
        {
          $addToSet: { watches: req.body.watchId },
          $setOnInsert: { user: req.user.id },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ).populate("watches");
      res.json({ watches: wishlist.watches });
    } catch (error) {
      next(error);
    }
  },
);

router.delete("/items/:watchId", async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOneAndUpdate(
      { user: req.user.id },
      { $pull: { watches: req.params.watchId } },
      { new: true },
    ).populate("watches");
    res.json({ watches: wishlist?.watches || [] });
  } catch (error) {
    next(error);
  }
});

export default router;
