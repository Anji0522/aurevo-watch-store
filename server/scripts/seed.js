import "dotenv/config";
import mongoose from "mongoose";
import Watch from "../models/Watch.js";
import { watches } from "../data/watches.js";

if (!process.env.MONGODB_URI) {
  throw new Error("Set MONGODB_URI in .env before seeding the database.");
}

try {
  await mongoose.connect(process.env.MONGODB_URI);
  for (const { id, ...watch } of watches) {
    await Watch.updateOne(
      { slug: watch.slug },
      {
        $set: {
          ...watch,
          rating: 0,
          reviewCount: 0,
          variants: watch.colors.map((name) => ({ name, dialColor: name, strapColor: name })),
          model3d: "procedural-watch",
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, runValidators: true },
    );
  }
  console.log(`Seeded ${watches.length} sample watches; review metrics reset until genuine reviews exist.`);
} finally {
  await mongoose.disconnect();
}
