import { KnowledgeEntry, Ship, Source } from "../../models/Knowledge.js";

/** Removes the retired Ship captain field and preserves source authors on cards. */
export async function backfillKnowledgeCaptains() {
  await Ship.collection.updateMany({}, { $unset: { captainName: "" } });
  const entries = await KnowledgeEntry.find({
    captainName: { $in: [null, ""] },
  })
    .select("_id sourceId")
    .lean();
  if (!entries.length) return;
  const sources = await Source.find({
    _id: { $in: entries.map((entry) => entry.sourceId) },
  })
    .select("_id creatorName")
    .lean();
  const captainBySource = new Map(
    sources.map((source) => [String(source._id), source.creatorName]),
  );
  await KnowledgeEntry.bulkWrite(
    entries.map((entry) => ({
      updateOne: {
        filter: { _id: entry._id },
        update: {
          $set: {
            captainName:
              captainBySource.get(String(entry.sourceId)) || "Unknown captain",
          },
        },
      },
    })),
  );
}
