import { describe, expect, it } from "vitest";
import { getDemoCatalog } from "./demoCatalog.js";

describe("static demo catalog", () => {
  it("returns all sample watches with demo ratings", () => {
    const result = getDemoCatalog("/watches");
    expect(result).toHaveLength(12);
    expect(result[0]).toMatchObject({ rating: 0, reviewCount: 0 });
  });

  it("applies catalog filters and sorting", () => {
    const result = getDemoCatalog(
      "/watches?collection=Sport&minPrice=60000&sort=price-asc",
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((watch) => watch.collection === "Sport")).toBe(true);
    expect(result.every((watch) => watch.price >= 60000)).toBe(true);
    expect(result[0].price).toBeLessThanOrEqual(
      result[result.length - 1].price,
    );
  });

  it("returns the sample watch matching a product slug", () => {
    expect(getDemoCatalog("/watches/aurevo-chronos")).toMatchObject({
      slug: "aurevo-chronos",
      rating: 0,
      reviewCount: 0,
    });
  });

  it("does not handle unrelated endpoints or unknown products", () => {
    expect(getDemoCatalog("/reviews/123")).toBeUndefined();
    expect(getDemoCatalog("/watches/unknown-watch")).toBeUndefined();
  });
});
