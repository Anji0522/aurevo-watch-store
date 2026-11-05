import { timingSafeEqual } from "node:crypto";
import { AppError } from "./errors.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export function csrfProtection(req, _res, next) {
  if (safeMethods.has(req.method) || req.path === "/api/payments/webhook")
    return next();
  const cookie = req.cookies?.aurevo_csrf;
  const header = req.get("x-csrf-token");
  if (!cookie || !header || cookie.length !== header.length) {
    return next(
      new AppError(403, "Refresh your session security token and try again."),
    );
  }
  const matches = timingSafeEqual(Buffer.from(cookie), Buffer.from(header));
  if (!matches)
    return next(new AppError(403, "Invalid session security token."));
  next();
}
