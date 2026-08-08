import { z } from "zod";
import { sourceTypes } from "../models/Knowledge.js";

export const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
export const optionalDate = z.string().datetime().optional().or(z.literal(""));
const flexibleFocusArea = z.string().trim().min(1).max(160);
const flexibleReminderFrequency = z.string().trim().min(1).max(80);

export const sourceInput = z.object({
  type: z.enum(sourceTypes),
  url: z.string().url().optional().or(z.literal("")),
  title: z.string().min(1).max(300).optional(),
  creatorName: z.string().max(200).optional(),
  publisher: z.string().max(200).optional(),
  series: z.string().max(200).optional(),
  episodeNumber: z.string().max(80).optional(),
  guests: z.array(z.string().min(1).max(160)).max(12).optional(),
  language: z.string().max(20).optional(),
  rawText: z.string().max(500000).optional(),
  focusArea: flexibleFocusArea.optional(),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
});
export const entryInput = z.object({
  title: z.string().min(1).optional(),
  captainName: z.string().trim().min(2).max(160).optional(),
  focusArea: flexibleFocusArea.optional(),
  centralThesis: z.string().optional(),
  summary: z.string().optional(),
  whyItMattersToMe: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["inbox", "distilled", "applied", "archived"]).optional(),
  nextReviewAt: optionalDate,
});
export const actionInput = z.object({
  text: z.string().min(1),
  status: z.enum(["open", "completed", "dismissed"]).optional(),
  dueAt: optionalDate,
  reminderFrequency: flexibleReminderFrequency.optional(),
});
export const creatorInput = z.object({
  name: z.string().min(1),
  type: z.enum(["person", "channel", "publication"]).optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  youtubeChannelUrl: z.string().url().optional().or(z.literal("")),
  bio: z.string().optional(),
  focusAreas: z.array(flexibleFocusArea).optional(),
  defaultTags: z.array(z.string()).optional(),
});
export const shipInput = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(400).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour such as #9bbf91")
    .optional(),
  // Not `.url()` — this is typically a `data:image/svg+xml;base64,...` URI, not an http(s) link.
  imageUrl: z.string().max(500000).optional().or(z.literal("")),
});
export const connectionInput = z.object({
  fromType: z.enum(["source", "entry", "idea"]),
  fromId: id,
  toType: z.enum(["source", "entry", "idea"]),
  toId: id,
  relationship: z
    .enum(["supports", "contradicts", "extends", "applies_to", "related_to"])
    .optional(),
  note: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});
