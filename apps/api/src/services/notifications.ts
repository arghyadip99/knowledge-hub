import { ReaderNotification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { Types } from "mongoose";

/**
 * Fan out a publication into compact per-reader inboxes. MongoDB's upsert plus
 * $addToSet is our lightweight durable queue: retries are safe and no external
 * broker is needed for this in-app notification use case.
 */
export async function queuePublishedKnowledge(
  entryId: Types.ObjectId,
  title: string,
  publishedAt = new Date(),
) {
  const readers = await User.find({ role: "reader" }).select("_id").lean();
  if (!readers.length) return;

  await ReaderNotification.bulkWrite(
    readers.map((reader) => ({
      updateOne: {
        filter: { userId: reader._id },
        update: {
          $addToSet: { unreadEntryIds: entryId },
          $set: {
            latestEntryTitle: title,
            latestPublishedAt: publishedAt,
            readAt: null,
          },
        },
        upsert: true,
      },
    })),
  );
}
