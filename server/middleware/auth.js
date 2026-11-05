import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { AppError } from "./errors.js";

export async function requireAuth(req, _res, next) {
  try {
    const token = req.cookies?.aurevo_session;
    if (!token) throw new AppError(401, "Please sign in to continue.");
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new AppError(503, "Authentication is not configured.");
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) throw new AppError(401, "Your session is no longer valid.");
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return next(new AppError(401, "Please sign in to continue."));
    }
    next(error);
  }
}

export function assertSessionConfig() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new AppError(503, "Authentication is not configured. Set a JWT_SECRET of at least 32 characters.");
  }
}

export function createSessionToken(userId) {
  assertSessionConfig();
  return jwt.sign({ sub: userId.toString() }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

export function sessionCookieOptions() {
  const production = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}
