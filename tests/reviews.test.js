import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Review from "../server/models/Review.js";
import { summarizeRatings } from "../server/utils/reviewRatings.js";
import { sampleReviews } from "../server/data/sampleReviews.js";

test("rating summary excludes sample/demo reviews", () => {
  const summary = summarizeRatings([
    { rating: 5, isDemo: true },
    { rating: 4, isDemo: false },
    { rating: 2, isDemo: false },
  ]);
  assert.deepEqual(summary, {
    average: 3,
    total: 2,
    distribution: { 5: 0, 4: 1, 3: 0, 2: 1, 1: 0 },
  });
});

test("rating summary returns zero counts before real customer reviews", () => {
  assert.deepEqual(summarizeRatings([{ rating: 5, isDemo: true }]), {
    average: 0,
    total: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });
});

test("sample review seed records are explicitly labelled demo content", () => {
  assert.ok(sampleReviews.length > 0);
  assert.ok(
    sampleReviews.every((review) =>
      review.text.startsWith("Sample review for layout testing:"),
    ),
  );
});

test("demo review documents do not require a fictitious user account", () => {
  const review = new Review({
    watch: new mongoose.Types.ObjectId(),
    rating: 5,
    text: "Sample review text for layout testing only.",
    displayName: "Sample review",
    isDemo: true,
  });
  assert.equal(review.validateSync(), undefined);
});

test("customer reviews require a user, valid rating, and bounded text", () => {
  const review = new Review({
    watch: new mongoose.Types.ObjectId(),
    rating: 6,
    text: "short",
    isDemo: false,
  });
  const error = review.validateSync();
  assert.ok(error.errors.user);
  assert.ok(error.errors.rating);
  assert.ok(error.errors.text);
});
