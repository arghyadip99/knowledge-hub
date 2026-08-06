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
import { KnowledgeEngagement } from "../models/Engagement.js";

/** Database queries for hydrated knowledge views. Routes should not compose persistence joins. */
export async function findKnowledgeLibrary(
  filter: Record<string, unknown>,
  viewerId?: string,
) {
  const entries = await KnowledgeEntry.find(filter)
    .sort({ updatedAt: -1 })
    .lean();
  const shipIds = entries.flatMap((entry) => entry.shipIds || []);
  const [ships, sources, ideas, actions, engagements] = await Promise.all([
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
    KnowledgeEngagement.find({
      knowledgeEntryId: { $in: entries.map((entry) => entry._id) },
    }).lean(),
  ]);
  const shipsById = new Map(ships.map((ship) => [String(ship._id), ship]));
  const sourcesById = new Map(
    sources.map((source) => [String(source._id), source]),
  );
  const ideasByEntry = groupById(ideas, "knowledgeEntryId");
  const actionsByEntry = groupById(actions, "knowledgeEntryId");
  const engagementsByEntry = new Map(
    engagements.map((engagement) => [
      String(engagement.knowledgeEntryId),
      serializeEngagement(engagement, viewerId),
    ]),
  );
  return entries.map((entry) => ({
    ...entry,
    ships: (entry.shipIds || [])
      .map((shipId) => shipsById.get(String(shipId)))
      .filter(Boolean),
    source: sourcesById.get(String(entry.sourceId)),
    ideas: ideasByEntry.get(String(entry._id)) || [],
    actions: actionsByEntry.get(String(entry._id)) || [],
    engagement: engagementsByEntry.get(String(entry._id)) || null,
  }));
}

export async function findKnowledgeDetail(entryId: string, viewerId?: string) {
  const entry = await KnowledgeEntry.findById(entryId).lean();
  if (!entry) return null;
  const [source, ideas, quotes, actions, reviews, connections, ships, engagement] =
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
      KnowledgeEngagement.findOne({ knowledgeEntryId: entry._id }).lean(),
    ]);
  return {
    entry: {
      ...entry,
      engagement: engagement ? serializeEngagement(engagement, viewerId) : null,
    },
    source,
    ideas,
    quotes,
    actions,
    reviews,
    connections,
    ships,
  };
}

export function serializeEngagement(
  engagement: {
    _id: unknown;
    resonatedBy?: unknown[];
    comments?: Array<{
      _id: unknown;
      userId: unknown;
      authorName: string;
      text: string;
      createdAt: Date;
    }>;
    shareCount?: number;
  },
  viewerId?: string,
) {
  const resonatedBy = engagement.resonatedBy || [];
  const comments = engagement.comments || [];
  return {
    id: String(engagement._id),
    resonatedCount: resonatedBy.length,
    commentCount: comments.length,
    shareCount: engagement.shareCount || 0,
    viewerResonated: Boolean(
      viewerId && resonatedBy.some((userId) => String(userId) === viewerId),
    ),
    comments: comments
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((comment) => ({
        id: String(comment._id),
        authorName: comment.authorName,
        text: comment.text,
        createdAt: comment.createdAt,
      })),
  };
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
