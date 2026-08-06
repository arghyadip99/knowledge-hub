import { z } from "zod";
import { sourceTypes } from "../models/Knowledge.js";

const optionalDate = z
  .string()
  .refine(
    (value) => !Number.isNaN(Date.parse(value)),
    "Expected an ISO date or date-time",
  )
  .optional()
  .nullable()
  .or(z.literal(""));
const timestampShape = z
  .object({
    startSeconds: z.number().nonnegative().optional().nullable(),
    endSeconds: z.number().nonnegative().optional().nullable(),
    label: z.string().max(40).optional().nullable(),
  })
  .nullable()
  .optional();
const timestamp = z.preprocess((value) => {
  if (typeof value === "number") return { startSeconds: value };
  if (typeof value !== "string") return value;
  const parts = value.split(":").map(Number);
  if (!parts.length || parts.some(Number.isNaN)) return value;
  const seconds =
    parts.length === 3
      ? parts[0] * 3600 + parts[1] * 60 + parts[2]
      : parts.length === 2
        ? parts[0] * 60 + parts[1]
        : parts[0];
  return { startSeconds: seconds };
}, timestampShape);

const tags = (max: number) =>
  z.preprocess((value) => {
    if (!Array.isArray(value)) return value;
    const values = value
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter(Boolean);
    return [...new Set(values)].slice(0, max);
  }, z.array(z.string().min(1).max(50)).max(max).default([]));

export const curatedLessonSchema = z.object({
  title: z.string().min(4).max(180),
  explanation: z.string().min(20).max(3000),
  // Knowledge categories evolve; preserve the author's vocabulary instead of rejecting it.
  type: z.string().trim().min(1).max(80).default("principle"),
  importance: z.number().int().min(1).max(5).default(3),
  confidence: z.number().min(0).max(1).default(0.9),
  evidence: z.string().max(700).optional().nullable(),
  timestamp,
  practicalApplication: z.string().max(1200).optional().nullable(),
  tags: tags(12),
  approved: z.boolean().default(true),
});

const curatedQuoteSchema = z.object({
  text: z.string().min(3).max(1000),
  speaker: z.string().max(160).optional().nullable(),
  context: z.string().max(800).optional().nullable(),
  timestamp,
  approved: z.boolean().default(true),
});
const flexibleFocusArea = z.string().trim().min(1).max(160);
const flexibleReminderFrequency = z.string().trim().min(1).max(80);
const actionSchema = z.object({
  text: z.string().min(3).max(500),
  dueAt: optionalDate,
  reminderFrequency: flexibleReminderFrequency.default("once"),
  lessonIndex: z.number().int().nonnegative().optional().nullable(),
});

export const knowledgeImportSchema = z.object({
  source: z.preprocess((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return value;
    const source = value as Record<string, unknown>;
    return {
      ...source,
      // ChatGPT commonly uses these more natural aliases. Normalize them at
      // the compatibility boundary, while the database remains canonical.
      type: source.type === "course" ? "document" : source.type,
      publishedAt: source.publishedAt ?? source.publishedDate,
    };
  }, z.object({
    type: z.enum(sourceTypes).default("youtube"),
    title: z.string().min(3).max(300),
    url: z.string().url().optional().or(z.literal("")),
    creator: z.string().min(2).max(200),
    publisher: z.string().max(200).optional(),
    series: z.string().max(200).optional(),
    episodeNumber: z.string().max(80).optional(),
    guests: z.array(z.string().min(1).max(160)).max(12).default([]),
    publishedAt: optionalDate,
    durationSeconds: z.number().int().positive().optional().nullable(),
    language: z.string().max(20).default("en"),
    focusArea: flexibleFocusArea.optional(),
    rawTranscript: z.string().max(500000).optional(),
  })),
  knowledge: z.object({
    centralThesis: z.string().min(20).max(2000),
    summary: z.string().min(50).max(8000),
    captainName: z.string().min(2).max(160).optional(),
    whyItMattersToMe: z.string().max(2000).optional(),
    tags: tags(30),
    shipNames: z.array(flexibleFocusArea).max(12).default([]),
    status: z.enum(["inbox", "distilled", "applied"]).default("distilled"),
    nextReviewAt: optionalDate,
  }),
  lessons: z.array(curatedLessonSchema).min(1).max(50),
  quotes: z.array(curatedQuoteSchema).max(20).default([]),
  actions: z.array(actionSchema).max(20).default([]),
  externalId: z.string().min(1).max(150).optional(),
  origin: z
    .enum(["manual-chatgpt", "manual", "migration"])
    .default("manual-chatgpt"),
});

export const bulkKnowledgeImportSchema = z.object({
  apiVersion: z.literal("v1").default("v1"),
  imports: z.array(knowledgeImportSchema).min(1).max(25),
  continueOnError: z.boolean().default(true),
});
export type KnowledgeImport = z.infer<typeof knowledgeImportSchema>;
