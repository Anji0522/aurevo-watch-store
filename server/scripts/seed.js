import "dotenv/config";
import mongoose from "mongoose";
import Watch from "../models/Watch.js";
import Review from "../models/Review.js";
import { watches } from "../data/watches.js";
import { sampleReviews } from "../data/sampleReviews.js";

if (!process.env.MONGODB_URI) {
  throw new Error("Set MONGODB_URI in .env before seeding the database.");
}

try {
  await mongoose.connect(process.env.MONGODB_URI);
  for (const watch of watches) {
    await Watch.updateOne(
      { slug: watch.slug },
      {
        $set: {
          ...watch,
          rating: 0,
          ratingTotal: 0,
          reviewCount: 0,
          variants: watch.colors.map((name) => ({
            name,
            dialColor: name,
            strapColor: name,
          })),
          model3d: "procedural-watch",
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, runValidators: true },
    );
  }
  const seededWatches = await Watch.find({
    slug: { $in: sampleReviews.map((review) => review.watchSlug) },
  })
    .select("_id slug")
    .lean();
  const seededBySlug = new Map(
    seededWatches.map((watch) => [watch.slug, watch._id]),
  );
  await Review.deleteMany({
    isDemo: true,
    watch: { $in: seededWatches.map((watch) => watch._id) },
  });
  await Review.insertMany(
    sampleReviews.map(({ watchSlug, ...review }) => ({
      ...review,
      watch: seededBySlug.get(watchSlug),
      displayName: "Sample review",
      verifiedPurchase: false,
      helpfulVotes: 0,
      isDemo: true,
    })),
  );
  console.log(
    `Seeded ${watches.length} sample watches and ${sampleReviews.length} clearly marked demo reviews.`,
  );
} finally {
  await mongoose.disconnect();
}
