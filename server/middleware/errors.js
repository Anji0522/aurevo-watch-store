import { validationResult } from "express-validator";

export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function validateRequest(req, _res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return next(new AppError(400, result.array({ onlyFirstError: true }).map((entry) => entry.msg).join(" ")));
  }
  next();
}

export function notFoundHandler(req, _res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.path}`));
}

export function errorHandler(error, _req, res, _next) {
  if (res.headersSent) return;
  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body must be valid JSON." });
  }
  if (error?.code === 11000) {
    return res.status(409).json({ error: "A record with that value already exists." });
  }
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500 && !(error instanceof AppError)) console.error(error);
  res.status(status).json({ error: status >= 500 ? "The request could not be completed." : error.message });
}
