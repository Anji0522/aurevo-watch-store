import { Router } from "express";
import { body, param, query } from "express-validator";
import Order from "../models/Order.js";
import Review from "../models/Review.js";
import Watch from "../models/Watch.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError, validateRequest } from "../middleware/errors.js";
import { summarizeRatingGroups, summarizeRatings } from "../utils/reviewRatings.js";

const router = Router();

router.get("/:watchId", [
  param("watchId").isMongoId().withMessage("Invalid watch."),
  query("sort").optional().isIn(["recent", "helpful", "rating-high", "rating-low"]).withMessage("Invalid review sort."),
  query("stars").optional().isInt({ min: 1, max: 5 }).withMessage("Star filter must be from 1 to 5."),
  query("verified").optional().isBoolean().withMessage("Invalid verified-purchase filter."),
  validateRequest,
], async (req, res, next) => {
  try {
    const watch = await Watch.findById(req.params.watchId).select("_id");
    if (!watch) throw new AppError(404, "Timepiece not found.");
    const filter = { watch: watch._id };
    if (req.query.stars) filter.rating = Number(req.query.stars);
    if (req.query.verified === "true") filter.verifiedPurchase = true;
    if (req.query.verified === "false") filter.verifiedPurchase = false;
    const sort = req.query.sort === "helpful" ? { helpfulVotes: -1, createdAt: -1 }
      : req.query.sort === "rating-high" ? { rating: -1, createdAt: -1 }
        : req.query.sort === "rating-low" ? { rating: 1, createdAt: -1 }
          : { createdAt: -1 };

    const [reviews, ratingGroups] = await Promise.all([
      Review.find(filter).populate("user", "name").sort(sort).limit(100).lean(),
      Review.aggregate([
        { $match: { watch: watch._id, isDemo: false } },
        { $group: { _id: "$rating", count: { $sum: 1 }, total: { $sum: "$rating" } } },
      ]),
    ]);
    const safeReviews = reviews.map((review) => ({
      id: review._id,
      rating: review.rating,
      text: review.text,
      displayName: review.isDemo ? "Sample review" : review.user?.name || "Customer",
      isDemo: review.isDemo,
      verifiedPurchase: review.isDemo ? false : review.verifiedPurchase,
      helpfulVotes: review.helpfulVotes,
      createdAt: review.createdAt,
    }));
    res.json({
      ...summarizeRatingGroups(ratingGroups),
      reviews: safeReviews,
      demoCount: reviews.filter((review) => review.isDemo).length,
    });
  } catch (error) { next(error); }
});

router.post("/:watchId", requireAuth, [
  param("watchId").isMongoId().withMessage("Invalid watch."),
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5 stars."),
  body("text").trim().isLength({ min: 10, max: 2000 }).withMessage("Review must be between 10 and 2,000 characters."),
  validateRequest,
], async (req, res, next) => {
  try {
    const watch = await Watch.findById(req.params.watchId);
    if (!watch) throw new AppError(404, "Timepiece not found.");
    const paidOrder = await Order.exists({
      user: req.user.id,
      paymentStatus: "paid",
      "items.watch": watch._id,
    });
    if (!paidOrder) throw new AppError(403, "A paid order for this timepiece is required to leave a review.");
    if (await Review.exists({ user: req.user.id, watch: watch._id, isDemo: false })) {
      throw new AppError(409, "You have already reviewed this timepiece.");
    }

    const review = await Review.create({
      user: req.user.id,
      watch: watch._id,
      rating: Number(req.body.rating),
      text: req.body.text,
      verifiedPurchase: true,
      isDemo: false,
    });
    await Watch.updateOne({ _id: watch._id }, [
      {
        $set: {
          ratingTotal: { $add: [{ $ifNull: ["$ratingTotal", 0] }, review.rating] },
          reviewCount: { $add: [{ $ifNull: ["$reviewCount", 0] }, 1] },
        },
      },
      { $set: { rating: { $round: [{ $divide: ["$ratingTotal", "$reviewCount"] }, 1] } } },
    ]);
    const summary = await Review.aggregate([
      { $match: { watch: watch._id, isDemo: false } },
      { $group: { _id: "$rating", count: { $sum: 1 }, total: { $sum: "$rating" } } },
    ]);
    res.status(201).json({
      review: {
        id: review.id,
        rating: review.rating,
        text: review.text,
        displayName: req.user.name,
        isDemo: false,
        verifiedPurchase: true,
        helpfulVotes: 0,
        createdAt: review.createdAt,
      },
      summary: summarizeRatingGroups(summary),
    });
  } catch (error) { next(error); }
});

router.post("/:watchId/:reviewId/helpful", requireAuth, [
  param("watchId").isMongoId().withMessage("Invalid watch."),
  param("reviewId").isMongoId().withMessage("Invalid review."),
  validateRequest,
], async (req, res, next) => {
  try {
    const review = await Review.findOneAndUpdate(
      { _id: req.params.reviewId, watch: req.params.watchId, helpfulVoters: { $ne: req.user._id } },
      { $addToSet: { helpfulVoters: req.user._id }, $inc: { helpfulVotes: 1 } },
      { new: true },
    );
    if (!review) {
      const existing = await Review.exists({ _id: req.params.reviewId, watch: req.params.watchId });
      if (!existing) throw new AppError(404, "Review not found.");
      return res.status(409).json({ error: "You have already marked this review helpful." });
    }
    res.json({ helpfulVotes: review.helpfulVotes });
  } catch (error) { next(error); }
});

export default router;
