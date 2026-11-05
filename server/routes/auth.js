import { Router } from "express";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { requireAuth, createSessionToken, sessionCookieOptions, assertSessionConfig } from "../middleware/auth.js";
import { AppError } from "../middleware/errors.js";
import { loginValidation, registerValidation } from "../utils/validation.js";

const router = Router();
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, phone: user.phone, addresses: user.addresses });

router.get("/csrf", (_req, res) => {
  const csrfToken = randomBytes(32).toString("hex");
  res.cookie("aurevo_csrf", csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });
  res.json({ csrfToken });
});

router.post("/register", registerValidation, async (req, res, next) => {
  try {
    assertSessionConfig();
    const { name, email, password } = req.body;
    if (await User.exists({ email })) throw new AppError(409, "An account with that email already exists.");
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
    res.cookie("aurevo_session", createSessionToken(user.id), sessionCookieOptions());
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/login", loginValidation, async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
      throw new AppError(401, "Email or password is incorrect.");
    }
    res.cookie("aurevo_session", createSessionToken(user.id), sessionCookieOptions());
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("aurevo_session", { ...sessionCookieOptions(), maxAge: undefined });
  res.status(204).end();
});

router.get("/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

export default router;
