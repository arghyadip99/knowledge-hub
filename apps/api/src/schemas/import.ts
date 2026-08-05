import { z } from 'zod';
import { sourceTypes } from '../models/Knowledge.js';

const optionalDate = z.string().datetime().optional().or(z.literal(''));
const timestamp = z.object({ startSeconds: z.number().nonnegative().optional(), endSeconds: z.number().nonnegative().optional(), label: z.string().max(40).optional() });

export const curatedLessonSchema = z.object({
  title: z.string().min(4).max(180),
  explanation: z.string().min(20).max(3000),
  type: z.enum(['principle', 'framework', 'claim', 'question', 'story', 'protocol']).default('principle'),
  importance: z.number().int().min(1).max(5).default(3),
  confidence: z.number().min(0).max(1).default(0.9),
  evidence: z.string().max(700).optional(),
  timestamp: timestamp.optional(),
  practicalApplication: z.string().max(1200).optional(),
  tags: z.array(z.string().min(1).max(50)).max(8).default([]),
  approved: z.boolean().default(true)
});

const curatedQuoteSchema = z.object({ text: z.string().min(3).max(1000), speaker: z.string().max(160).optional(), context: z.string().max(800).optional(), timestamp: timestamp.optional(), approved: z.boolean().default(true) });
const flexibleFocusArea = z.string().trim().min(1).max(160);
const flexibleReminderFrequency = z.string().trim().min(1).max(80);
const actionSchema = z.object({ text: z.string().min(3).max(500), dueAt: optionalDate, reminderFrequency: flexibleReminderFrequency.default('once'), lessonIndex: z.number().int().nonnegative().optional() });

export const knowledgeImportSchema = z.object({
  source: z.object({
    type: z.enum(sourceTypes).default('youtube'), title: z.string().min(3).max(300), url: z.string().url().optional().or(z.literal('')), creator: z.string().min(2).max(200), publisher: z.string().max(200).optional(), series: z.string().max(200).optional(), episodeNumber: z.string().max(80).optional(), guests: z.array(z.string().min(1).max(160)).max(12).default([]),
    publishedAt: optionalDate, durationSeconds: z.number().int().positive().optional(), language: z.string().max(20).default('en'), focusArea: flexibleFocusArea.optional(), rawTranscript: z.string().max(500000).optional()
  }),
  knowledge: z.object({
    centralThesis: z.string().min(20).max(2000), summary: z.string().min(50).max(8000), whyItMattersToMe: z.string().max(2000).optional(), tags: z.array(z.string().min(1).max(50)).max(15).default([]), shipNames: z.array(flexibleFocusArea).max(12).default([]), status: z.enum(['inbox', 'distilled', 'applied']).default('distilled'), nextReviewAt: optionalDate
  }),
  lessons: z.array(curatedLessonSchema).min(1).max(50), quotes: z.array(curatedQuoteSchema).max(20).default([]), actions: z.array(actionSchema).max(20).default([]),
  externalId: z.string().min(1).max(150).optional(), origin: z.enum(['manual-chatgpt', 'manual', 'migration']).default('manual-chatgpt')
});

export const bulkKnowledgeImportSchema = z.object({ apiVersion: z.literal('v1').default('v1'), imports: z.array(knowledgeImportSchema).min(1).max(25), continueOnError: z.boolean().default(true) });
export type KnowledgeImport = z.infer<typeof knowledgeImportSchema>;
