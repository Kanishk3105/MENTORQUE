import { Router } from "express";
import { login, me } from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";

export const authRoutes = Router();

// Seed-only accounts: no public registration. Admin creates users/mentors via /api/admin/create-user.
authRoutes.post("/login", login);
authRoutes.get("/me", authenticate, me);
