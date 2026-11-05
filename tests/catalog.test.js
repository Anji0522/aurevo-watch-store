import test from "node:test";
import assert from "node:assert/strict";
import { watches } from "../server/data/watches.js";

test("catalog contains twelve premium watches", () => {
  assert.equal(watches.length, 12);
  assert.ok(watches.every((watch) => watch.price > 20000));
});

test("catalog records have unique slugs and required product details", () => {
  const slugs = watches.map((watch) => watch.slug);
  assert.equal(new Set(slugs).size, watches.length);
  for (const watch of watches) {
    assert.ok(watch.name);
    assert.ok(watch.description);
    assert.ok(watch.specs.movement);
    assert.ok(watch.specs.caseSize);
    assert.ok(watch.specs.material);
    assert.ok(watch.specs.waterResistance);
    assert.ok(watch.specs.strap);
    assert.ok(watch.specs.warranty);
    assert.ok(watch.colors.length > 0);
    assert.ok(watch.stock >= 0);
    assert.ok(watch.rating >= 0 && watch.rating <= 5);
  }
});

test("catalog covers the requested collections", () => {
  const actual = new Set(watches.map((watch) => watch.collection));
  assert.deepEqual(
    actual,
    new Set(["Classic", "Sport", "Smart-Luxe", "Limited Edition"]),
  );
});

test("catalog ratings are sample metadata, not written testimonials", () => {
  for (const watch of watches) {
    assert.equal(typeof watch.reviewCount, "number");
    assert.ok(watch.reviewCount >= 0);
  }
});
