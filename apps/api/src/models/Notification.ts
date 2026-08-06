import { Schema, model } from "mongoose";

/**
 * A reader's durable, aggregated inbox. Entry ids make fan-out idempotent:
 * retrying a publish can never inflate the unread count.
 */
export const ReaderNotification = model(
  "ReaderNotification",
  new Schema(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true,
      },
      unreadEntryIds: {
        type: [{ type: Schema.Types.ObjectId, ref: "KnowledgeEntry" }],
        default: [],
      },
      latestEntryTitle: { type: String, default: "" },
      latestPublishedAt: Date,
      readAt: Date,
    },
    { timestamps: true },
  ),
);
