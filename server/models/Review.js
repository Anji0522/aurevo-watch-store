import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  watch: { type: mongoose.Schema.Types.ObjectId, ref: "Watch", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  text: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
  verifiedPurchase: { type: Boolean, default: false },
  helpfulVotes: { type: Number, default: 0, min: 0 },
  isDemo: { type: Boolean, default: false },
}, { timestamps: true });

reviewSchema.index({ user: 1, watch: 1 }, { unique: true, partialFilterExpression: { isDemo: false } });

export default mongoose.models.Review || mongoose.model("Review", reviewSchema);
