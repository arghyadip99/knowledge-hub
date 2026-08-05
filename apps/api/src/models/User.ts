import { Schema, model } from "mongoose";

export type UserRole = "admin" | "reader";

export const User = model(
  "User",
  new Schema(
    {
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        unique: true,
      },
      username: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        unique: true,
      },
      displayName: { type: String, required: true, trim: true },
      passwordHash: { type: String, select: false },
      googleSubject: { type: String, sparse: true, unique: true },
      role: { type: String, enum: ["admin", "reader"], default: "reader" },
      lastLoginAt: Date,
    },
    { timestamps: true },
  ),
);
