import { Schema, model } from "mongoose";

/**
 * Engagement is intentionally separate from KnowledgeEntry. Existing cards have
 * no engagement document (and are represented as `null`) until the first reader
 * interacts with them.
 */
const commentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true, trim: true, maxlength: 80 },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true, _id: true },
);

export const KnowledgeEngagement = model(
  "KnowledgeEngagement",
  new Schema(
    {
      knowledgeEntryId: {
        type: Schema.Types.ObjectId,
        ref: "KnowledgeEntry",
        required: true,
        unique: true,
        index: true,
      },
      resonatedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
      comments: { type: [commentSchema], default: [] },
      shareCount: { type: Number, default: 0, min: 0 },
    },
    { timestamps: true },
  ),
);
