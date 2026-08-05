import { Router } from "express";
import { z } from "zod";
import { User, type UserRole } from "../models/User.js";
import {
  createSession,
  hashPassword,
  verifyGoogleToken,
  verifyPassword,
} from "../services/auth.js";
import { asyncRoute } from "../http/routeUtils.js";
import { requireAuth, type AuthenticatedRequest } from "../http/auth.js";

const signupInput = z.object({
  email: z.string().email().max(200),
  username: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, _ or -"),
  displayName: z.string().trim().min(2).max(100),
  password: z.string().min(10).max(200),
});
const loginInput = z.object({
  identity: z.string().trim().min(3).max(200),
  password: z.string().min(1).max(200),
});
const googleInput = z.object({ idToken: z.string().min(20) });
const publicUser = (user: {
  _id: unknown;
  email: string;
  username: string;
  displayName: string;
  role: UserRole;
}) => ({
  id: String(user._id),
  email: user.email,
  username: user.username,
  displayName: user.displayName,
  role: user.role,
});
const responseFor = (user: {
  _id: unknown;
  email: string;
  username: string;
  displayName: string;
  role: UserRole;
}) => ({
  token: createSession({
    sub: String(user._id),
    email: user.email,
    role: user.role,
  }),
  user: publicUser(user),
});

async function initialRole(): Promise<UserRole> {
  return (await User.countDocuments()) === 0 ? "admin" : "reader";
}

export const authRoutes = Router();

authRoutes.post(
  "/signup",
  asyncRoute(async (req, res) => {
    const data = signupInput.parse(req.body);
    const duplicate = await User.exists({
      $or: [
        { email: data.email.toLowerCase() },
        { username: data.username.toLowerCase() },
      ],
    });
    if (duplicate)
      return res.status(409).json({
        message: "An account with that email or username already exists",
      });
    const user = await User.create({
      email: data.email,
      username: data.username,
      displayName: data.displayName,
      passwordHash: await hashPassword(data.password),
      role: await initialRole(),
      lastLoginAt: new Date(),
    });
    res.status(201).json(responseFor(user));
  }),
);

authRoutes.post(
  "/login",
  asyncRoute(async (req, res) => {
    const data = loginInput.parse(req.body);
    const user = await User.findOne({
      $or: [
        { email: data.identity.toLowerCase() },
        { username: data.identity.toLowerCase() },
      ],
    }).select("+passwordHash");
    if (
      !user?.passwordHash ||
      !(await verifyPassword(data.password, user.passwordHash))
    )
      return res
        .status(401)
        .json({ message: "Invalid email, username, or password" });
    user.lastLoginAt = new Date();
    await user.save();
    res.json(responseFor(user));
  }),
);

authRoutes.post(
  "/google",
  asyncRoute(async (req, res) => {
    const profile = await verifyGoogleToken(
      googleInput.parse(req.body).idToken,
    );
    let user = await User.findOne({
      $or: [{ googleSubject: profile.subject }, { email: profile.email }],
    });
    if (!user)
      user = await User.create({
        email: profile.email,
        username:
          profile.email
            .split("@")[0]
            .replace(/[^a-zA-Z0-9_-]/g, "-")
            .slice(0, 35) || `user-${Date.now()}`,
        displayName: profile.displayName,
        googleSubject: profile.subject,
        role: await initialRole(),
      });
    else {
      user.googleSubject = profile.subject;
      user.lastLoginAt = new Date();
      await user.save();
    }
    res.json(responseFor(user));
  }),
);

authRoutes.get(
  "/me",
  requireAuth,
  asyncRoute(async (req: AuthenticatedRequest, res) => {
    const user = await User.findById(req.user?.id).lean();
    if (!user)
      return res.status(401).json({ message: "Account no longer exists" });
    res.json({ user: publicUser(user) });
  }),
);
