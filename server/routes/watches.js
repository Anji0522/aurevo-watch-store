import { Router } from "express";
import mongoose from "mongoose";
import Watch from "../models/Watch.js";
import { watches } from "../data/watches.js";
import { AppError } from "../middleware/errors.js";
import { watchQueryValidation } from "../utils/validation.js";

const router = Router();

function filterCatalog(items, { collection, search, material, minPrice, maxPrice, minRating, sort }) {
  let result = items.filter((watch) =>
    (!collection || collection === "All" || watch.collection === collection) &&
    (!search || watch.name.toLowerCase().includes(search.toLowerCase())) &&
    (!material || watch.specs.material.toLowerCase().includes(material.toLowerCase())) &&
    (!minPrice || watch.price >= Number(minPrice)) &&
    (!maxPrice || watch.price <= Number(maxPrice)) &&
    (!minRating || watch.rating >= Number(minRating))
  );
  if (sort === "price-asc") result = result.toSorted((a, b) => a.price - b.price);
  else if (sort === "price-desc") result = result.toSorted((a, b) => b.price - a.price);
  else if (sort === "rating") result = result.toSorted((a, b) => b.rating - a.rating);
  return result;
}

router.get("/", watchQueryValidation, async (req, res, next) => {
  try {
    const { collection, search, sort, material, minPrice, maxPrice, minRating } = req.query;
    if (mongoose.connection.readyState !== 1) {
      const demoCatalog = watches.map((watch) => ({ ...watch, rating: 0, reviewCount: 0 }));
      return res.json(filterCatalog(demoCatalog, { collection, search, sort, material, minPrice, maxPrice, minRating }));
    }

    const filter = {};
    if (collection && collection !== "All") filter.collection = collection;
    if (search) filter.name = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    if (material) filter["specs.material"] = { $regex: material.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    if (minPrice || maxPrice) filter.price = { ...(minPrice ? { $gte: Number(minPrice) } : {}), ...(maxPrice ? { $lte: Number(maxPrice) } : {}) };
    if (minRating) filter.rating = { $gte: Number(minRating) };
    const query = Watch.find(filter).lean();
    if (sort === "price-asc") query.sort({ price: 1 });
    else if (sort === "price-desc") query.sort({ price: -1 });
    else if (sort === "rating") query.sort({ rating: -1 });
    res.json(await query);
  } catch (error) {
    next(error);
  }
});

router.get("/:slug", async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const source = watches.find((item) => item.slug === req.params.slug);
      const watch = source && { ...source, rating: 0, reviewCount: 0 };
      if (!watch) throw new AppError(404, "Timepiece not found.");
      return res.json(watch);
    }
    const watch = await Watch.findOne({ slug: req.params.slug }).lean();
    if (!watch) throw new AppError(404, "Timepiece not found.");
    res.json(watch);
  } catch (error) {
    next(error);
  }
});

export default router;
