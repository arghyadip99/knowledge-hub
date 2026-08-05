import {
  Action,
  Connection,
  Idea,
  KnowledgeEntry,
  Quote,
  Review,
  Ship,
  Source,
} from "../models/Knowledge.js";

/** Database queries for hydrated knowledge views. Routes should not compose persistence joins. */
export async function findKnowledgeLibrary(filter: Record<string, unknown>) {
  const entries = await KnowledgeEntry.find(filter)
    .sort({ updatedAt: -1 })
    .lean();
  const shipIds = entries.flatMap((entry) => entry.shipIds || []);
  const [ships, sources, ideas, actions] = await Promise.all([
    Ship.find({ _id: { $in: shipIds } }).lean(),
    Source.find({
      _id: { $in: entries.map((entry) => entry.sourceId) },
    }).lean(),
    Idea.find({
      knowledgeEntryId: { $in: entries.map((entry) => entry._id) },
    }).lean(),
    Action.find({
      knowledgeEntryId: { $in: entries.map((entry) => entry._id) },
    }).lean(),
  ]);
  const shipsById = new Map(ships.map((ship) => [String(ship._id), ship]));
  const sourcesById = new Map(
    sources.map((source) => [String(source._id), source]),
  );
  const ideasByEntry = groupById(ideas, "knowledgeEntryId");
  const actionsByEntry = groupById(actions, "knowledgeEntryId");
  return entries.map((entry) => ({
    ...entry,
    ships: (entry.shipIds || [])
      .map((shipId) => shipsById.get(String(shipId)))
      .filter(Boolean),
    source: sourcesById.get(String(entry.sourceId)),
    ideas: ideasByEntry.get(String(entry._id)) || [],
    actions: actionsByEntry.get(String(entry._id)) || [],
  }));
}

export async function findKnowledgeDetail(entryId: string) {
  const entry = await KnowledgeEntry.findById(entryId).lean();
  if (!entry) return null;
  const [source, ideas, quotes, actions, reviews, connections, ships] =
    await Promise.all([
      Source.findById(entry.sourceId).lean(),
      Idea.find({ knowledgeEntryId: entry._id }).lean(),
      Quote.find({ knowledgeEntryId: entry._id }).lean(),
      Action.find({ knowledgeEntryId: entry._id }).lean(),
      Review.find({ knowledgeEntryId: entry._id })
        .sort({ reviewedAt: -1 })
        .lean(),
      Connection.find({
        $or: [{ fromId: entry._id }, { toId: entry._id }],
      }).lean(),
      Ship.find({ _id: { $in: entry.shipIds || [] } }).lean(),
    ]);
  return { entry, source, ideas, quotes, actions, reviews, connections, ships };
}

function groupById<T extends { knowledgeEntryId: unknown }>(
  items: T[],
  key: "knowledgeEntryId",
) {
  return items.reduce((groups, item) => {
    const groupKey = String(item[key]);
    groups.set(groupKey, [...(groups.get(groupKey) || []), item]);
    return groups;
  }, new Map<string, T[]>());
}
