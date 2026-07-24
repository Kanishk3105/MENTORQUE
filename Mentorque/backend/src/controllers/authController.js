import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export async function login(req, res, next) {
  try {
    const { email, password, rememberMe } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: rememberMe ? "30d" : JWT_EXPIRES_IN }
    );
    const { password: _p, ...safe } = user;
    res.json({ user: safe, token });
  } catch (e) {
    next(e);
  }
}

export async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { tags: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    const { password: _p, ...safe } = user;
    res.json({ user: safe });
  } catch (e) {
    next(e);
  }
}
