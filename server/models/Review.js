import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required() {
        return !this.isDemo;
      },
    },
    watch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Watch",
      required: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 2000,
    },
    displayName: { type: String, trim: true, maxlength: 100 },
    verifiedPurchase: { type: Boolean, default: false },
    helpfulVotes: { type: Number, default: 0, min: 0 },
    helpfulVoters: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      select: false,
      default: [],
    },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

reviewSchema.index(
  { user: 1, watch: 1 },
  { unique: true, partialFilterExpression: { isDemo: false } },
);

export default mongoose.models.Review || mongoose.model("Review", reviewSchema);
