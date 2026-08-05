import { Schema, model } from "mongoose";

export const focusAreas = [
  "Neuroscience",
  "Psychology",
  "Indian Startups",
  "Spirituality & Tantra",
  "Self Improvement",
  "General",
] as const;
export const sourceTypes = [
  "youtube",
  "podcast",
  "article",
  "newsletter",
  "book",
  "note",
  "document",
] as const;

const timestamps = { timestamps: true };
const localOwner = { type: String, default: "local-owner", immutable: true };

export const Creator = model(
  "Creator",
  new Schema(
    {
      ownerId: localOwner,
      name: { type: String, required: true, trim: true },
      type: {
        type: String,
        enum: ["person", "channel", "publication"],
        default: "person",
      },
      websiteUrl: String,
      youtubeChannelUrl: String,
      bio: String,
      focusAreas: { type: [String], default: [] },
      defaultTags: { type: [String], default: [] },
    },
    timestamps,
  ),
);

export const Ship = model(
  "Ship",
  new Schema(
    {
      ownerId: localOwner,
      name: { type: String, required: true, trim: true },
      captainName: { type: String, default: "", trim: true },
      description: { type: String, default: "" },
      color: { type: String, default: "#9bbf91" },
      archivedAt: Date,
    },
    timestamps,
  ),
);
Ship.schema.index({ ownerId: 1, name: 1 }, { unique: true });

export const Source = model(
  "Source",
  new Schema(
    {
      ownerId: localOwner,
      type: { type: String, enum: sourceTypes, required: true },
      url: { type: String, default: "" },
      title: { type: String, required: true, trim: true },
      creatorId: { type: Schema.Types.ObjectId, ref: "Creator" },
      creatorName: { type: String, default: "" },
      publisher: String,
      series: String,
      episodeNumber: String,
      guests: { type: [String], default: [] },
      thumbnailUrl: String,
      publishedAt: Date,
      durationSeconds: Number,
      language: { type: String, default: "en" },
      rawText: { type: String, default: "" },
      transcriptStatus: {
        type: String,
        enum: ["not_needed", "pending", "available", "unavailable"],
        default: "pending",
      },
      status: {
        type: String,
        enum: [
          "draft",
          "queued",
          "processing",
          "ready_for_review",
          "approved",
          "rejected",
          "archived",
          "failed",
        ],
        default: "draft",
      },
      archivedAt: Date,
      focusArea: { type: String, trim: true, default: "General" },
      ingestionMetadata: { type: Schema.Types.Mixed, default: {} },
      failureReason: String,
    },
    timestamps,
  ),
);
Source.schema.index({ title: "text", creatorName: "text", rawText: "text" });
Source.schema.index({ ownerId: 1, status: 1, updatedAt: -1 });

export const TranscriptChunk = model(
  "TranscriptChunk",
  new Schema(
    {
      sourceId: {
        type: Schema.Types.ObjectId,
        ref: "Source",
        required: true,
        index: true,
      },
      position: { type: Number, required: true },
      startSeconds: Number,
      endSeconds: Number,
      text: { type: String, required: true },
      tokenCount: Number,
      embedding: { type: [Number], default: [] },
    },
    timestamps,
  ),
);

export const KnowledgeEntry = model(
  "KnowledgeEntry",
  new Schema(
    {
      ownerId: localOwner,
      sourceId: {
        type: Schema.Types.ObjectId,
        ref: "Source",
        required: true,
        unique: true,
      },
      title: { type: String, required: true },
      shipIds: [{ type: Schema.Types.ObjectId, ref: "Ship" }],
      focusArea: { type: String, trim: true },
      status: {
        type: String,
        enum: ["inbox", "distilled", "applied", "archived"],
        default: "inbox",
      },
      centralThesis: { type: String, default: "" },
      summary: { type: String, default: "" },
      whyItMattersToMe: { type: String, default: "" },
      confidence: { type: Number, min: 0, max: 1, default: 0.5 },
      approvedAt: Date,
      archivedAt: Date,
      lastReviewedAt: Date,
      nextReviewAt: Date,
      tags: { type: [String], default: [] },
    },
    timestamps,
  ),
);
KnowledgeEntry.schema.index({
  title: "text",
  centralThesis: "text",
  summary: "text",
  tags: "text",
});

export const Idea = model(
  "Idea",
  new Schema(
    {
      knowledgeEntryId: {
        type: Schema.Types.ObjectId,
        ref: "KnowledgeEntry",
        required: true,
        index: true,
      },
      title: { type: String, required: true },
      explanation: String,
      evidenceChunkIds: [
        { type: Schema.Types.ObjectId, ref: "TranscriptChunk" },
      ],
      timestampReferences: { type: [Number], default: [] },
      evidence: String,
      practicalApplication: String,
      tags: { type: [String], default: [] },
      order: Number,
      importance: { type: Number, min: 1, max: 5, default: 3 },
      ideaType: {
        type: String,
        enum: [
          "principle",
          "framework",
          "claim",
          "question",
          "story",
          "protocol",
        ],
        default: "principle",
      },
      confidence: { type: Number, min: 0, max: 1, default: 0.5 },
      approved: { type: Boolean, default: false },
    },
    timestamps,
  ),
);

export const Action = model(
  "Action",
  new Schema(
    {
      knowledgeEntryId: {
        type: Schema.Types.ObjectId,
        ref: "KnowledgeEntry",
        required: true,
        index: true,
      },
      ideaId: { type: Schema.Types.ObjectId, ref: "Idea" },
      text: { type: String, required: true },
      status: {
        type: String,
        enum: ["open", "completed", "dismissed"],
        default: "open",
      },
      dueAt: Date,
      reminderFrequency: { type: String, trim: true, default: "once" },
      completedAt: Date,
    },
    timestamps,
  ),
);

export const Quote = model(
  "Quote",
  new Schema(
    {
      sourceId: { type: Schema.Types.ObjectId, ref: "Source", required: true },
      knowledgeEntryId: {
        type: Schema.Types.ObjectId,
        ref: "KnowledgeEntry",
        required: true,
      },
      text: { type: String, required: true },
      speaker: String,
      startSeconds: Number,
      endSeconds: Number,
      context: String,
      approved: { type: Boolean, default: false },
    },
    timestamps,
  ),
);

export const Connection = model(
  "Connection",
  new Schema(
    {
      ownerId: localOwner,
      fromType: {
        type: String,
        enum: ["source", "entry", "idea"],
        required: true,
      },
      fromId: { type: Schema.Types.ObjectId, required: true },
      toType: {
        type: String,
        enum: ["source", "entry", "idea"],
        required: true,
      },
      toId: { type: Schema.Types.ObjectId, required: true },
      relationship: {
        type: String,
        enum: [
          "supports",
          "contradicts",
          "extends",
          "applies_to",
          "related_to",
        ],
        default: "related_to",
      },
      note: String,
      confidence: { type: Number, min: 0, max: 1, default: 0.5 },
    },
    timestamps,
  ),
);

export const AiRun = model(
  "AiRun",
  new Schema(
    {
      sourceId: {
        type: Schema.Types.ObjectId,
        ref: "Source",
        required: true,
        index: true,
      },
      provider: { type: String, required: true },
      model: String,
      taskType: { type: String, required: true },
      promptVersion: { type: String, default: "v1" },
      inputTokens: Number,
      outputTokens: Number,
      costEstimate: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ["queued", "running", "completed", "failed"],
        default: "queued",
      },
      rawOutput: Schema.Types.Mixed,
      error: String,
    },
    timestamps,
  ),
);

export const Review = model(
  "Review",
  new Schema(
    {
      knowledgeEntryId: {
        type: Schema.Types.ObjectId,
        ref: "KnowledgeEntry",
        required: true,
        index: true,
      },
      reviewedAt: { type: Date, default: Date.now },
      reflection: String,
      didIApplyIt: Boolean,
      outcome: String,
      nextReviewAt: Date,
    },
    timestamps,
  ),
);

export const QuizAttempt = model(
  "QuizAttempt",
  new Schema(
    {
      knowledgeEntryId: {
        type: Schema.Types.ObjectId,
        ref: "KnowledgeEntry",
        required: true,
        index: true,
      },
      ideaId: {
        type: Schema.Types.ObjectId,
        ref: "Idea",
        required: true,
        index: true,
      },
      recalled: { type: Boolean, required: true },
      confidence: { type: Number, min: 1, max: 5 },
      answer: String,
    },
    timestamps,
  ),
);

export const ImportBatch = model(
  "ImportBatch",
  new Schema(
    {
      ownerId: localOwner,
      apiVersion: { type: String, default: "v1" },
      status: {
        type: String,
        enum: ["completed", "partial", "failed"],
        required: true,
      },
      requested: { type: Number, required: true },
      created: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      sourceIds: [{ type: Schema.Types.ObjectId, ref: "Source" }],
      errors: { type: [Schema.Types.Mixed], default: [] },
      origin: { type: String, default: "manual-chatgpt" },
    },
    timestamps,
  ),
);
