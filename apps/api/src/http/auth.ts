import type { NextFunction, Request, Response } from "express";
import { verifySession } from "../services/auth.js";

export type AuthenticatedRequest = Request & {
  user?: { id: string; role: "admin" | "reader"; email: string };
};

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  const session = token ? verifySession(token) : null;
  if (!session) return res.status(401).json({ message: "Sign in is required" });
  req.user = { id: session.sub, role: session.role, email: session.email };
  next();
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  if (req.user?.role !== "admin")
    return res.status(403).json({ message: "Admin access is required" });
  next();
}
