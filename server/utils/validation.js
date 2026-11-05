import { body, param, query } from "express-validator";
import { validateRequest } from "../middleware/errors.js";

export const registerValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters."),
  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Enter a valid email address."),
  body("password")
    .isString()
    .isLength({ min: 10, max: 128 })
    .withMessage("Password must be at least 10 characters."),
  validateRequest,
];

export const loginValidation = [
  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Enter a valid email address."),
  body("password")
    .isString()
    .isLength({ min: 1, max: 128 })
    .withMessage("Enter your password."),
  validateRequest,
];

export const watchQueryValidation = [
  query("collection")
    .optional()
    .isIn(["All", "Classic", "Sport", "Smart-Luxe", "Limited Edition"])
    .withMessage("Unknown collection."),
  query("search")
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage("Search text is too long."),
  query("sort")
    .optional()
    .isIn(["featured", "price-asc", "price-desc", "rating"])
    .withMessage("Unknown sort option."),
  query("material")
    .optional()
    .isString()
    .isLength({ max: 80 })
    .withMessage("Material filter is too long."),
  query("minPrice")
    .optional()
    .isInt({ min: 22000, max: 250000 })
    .withMessage("Minimum price is outside the catalog range."),
  query("maxPrice")
    .optional()
    .isInt({ min: 22000, max: 250000 })
    .withMessage("Maximum price is outside the catalog range."),
  query("minRating")
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage("Minimum rating must be between 1 and 5."),
  validateRequest,
];

export const mongoIdParamValidation = [
  param("id").isMongoId().withMessage("Invalid resource ID."),
  validateRequest,
];
