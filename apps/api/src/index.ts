import "dotenv/config";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import swaggerUi from "swagger-ui-express";
import { z } from "zod";
import {
  Action,
  AiRun,
  Connection,
  Creator,
  Idea,
  ImportBatch,
  KnowledgeEntry,
  QuizAttempt,
  Quote,
  Review,
  Ship,
  Source,
  TranscriptChunk,
  focusAreas,
  sourceTypes,
} from "./models/Knowledge.js";
import { openapi } from "./docs/openapi.js";
import { bulkKnowledgeImportSchema } from "./schemas/import.js";
import { importKnowledge, recordImportBatch } from "./services/bulkImport.js";
import { hydrateYoutubeSource, processSource } from "./services/ingestion.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));
const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const date = z.string().datetime().optional().or(z.literal(""));
const flexibleFocusArea = z.string().trim().min(1).max(160);
const flexibleReminderFrequency = z.string().trim().min(1).max(80);
const sourceInput = z.object({
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
});
const entryInput = z.object({
  title: z.string().min(1).optional(),
  focusArea: flexibleFocusArea.optional(),
  centralThesis: z.string().optional(),
  summary: z.string().optional(),
  whyItMattersToMe: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["inbox", "distilled", "applied", "archived"]).optional(),
  nextReviewAt: date,
});
const actionInput = z.object({
  text: z.string().min(1),
  status: z.enum(["open", "completed", "dismissed"]).optional(),
  dueAt: date,
  reminderFrequency: flexibleReminderFrequency.optional(),
});
const creatorInput = z.object({
  name: z.string().min(1),
  type: z.enum(["person", "channel", "publication"]).optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  youtubeChannelUrl: z.string().url().optional().or(z.literal("")),
  bio: z.string().optional(),
  focusAreas: z.array(flexibleFocusArea).optional(),
  defaultTags: z.array(z.string()).optional(),
});
const shipInput = z.object({
  name: z.string().trim().min(1).max(80),
  captainName: z.string().trim().max(160).optional(),
  description: z.string().max(400).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour such as #9bbf91")
    .optional(),
});
const connectionInput = z.object({
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
const safe = (data: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(data).filter(
      ([, value]) => value !== "" && value !== undefined,
    ),
  );
const asyncRoute =
  (route: (req: express.Request, res: express.Response) => Promise<unknown>) =>
  (req: express.Request, res: express.Response, next: express.NextFunction) =>
    route(req, res).catch(next);

app.get("/health", (_req, res) =>
  res.json({
    ok: true,
    ai: {
      provider: "ollama",
      configured: Boolean(process.env.OLLAMA_BASE_URL || true),
      model: process.env.OLLAMA_MODEL || "qwen2.5:7b",
    },
  }),
);
app.get("/api/config", (_req, res) =>
  res.json({
    providers: [
      {
        id: "ollama",
        configured: true,
        model: process.env.OLLAMA_MODEL || "qwen2.5:7b",
        baseUrl:
          process.env.OLLAMA_BASE_URL || "http://host.docker.internal:11434",
      },
      { id: "gemini", configured: Boolean(process.env.GEMINI_API_KEY) },
      { id: "groq", configured: Boolean(process.env.GROQ_API_KEY) },
    ],
  }),
);
app.get("/api/areas", (_req, res) => res.json(focusAreas));
app.get("/api/docs/openapi.json", (_req, res) => res.json(openapi));
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(openapi, { customSiteTitle: "Knowledge Hub API Docs" }),
);

app.post(
  "/api/v1/imports/knowledge",
  asyncRoute(async (req, res) => {
    const payload = bulkKnowledgeImportSchema.parse(req.body);
    const results: {
      sourceId?: string;
      entryId?: string;
      lessons?: number;
      quotes?: number;
      actions?: number;
      error?: string;
    }[] = [];
    for (const item of payload.imports) {
      try {
        results.push(await importKnowledge(item));
      } catch (error) {
        results.push({
          error: error instanceof Error ? error.message : "Import failed",
        });
        if (!payload.continueOnError) break;
      }
    }
    const batch = await recordImportBatch(
      payload.imports.length,
      results,
      payload.imports[0]?.origin,
    );
    res
      .status(batch.failed ? 207 : 201)
      .json({
        batchId: batch._id,
        status: batch.status,
        requested: batch.requested,
        created: batch.created,
        failed: batch.failed,
        results,
      });
  }),
);
app.get(
  "/api/v1/imports",
  asyncRoute(async (_req, res) =>
    res.json(await ImportBatch.find().sort({ createdAt: -1 }).limit(50).lean()),
  ),
);

app.get(
  "/api/ships",
  asyncRoute(async (req, res) => {
    const filter =
      req.query.archived === "true"
        ? { archivedAt: { $ne: null } }
        : { archivedAt: null };
    const ships = await Ship.find(filter).sort({ name: 1 }).lean();
    const counts = await KnowledgeEntry.aggregate([
      { $match: { status: { $ne: "archived" } } },
      { $unwind: "$shipIds" },
      { $group: { _id: "$shipIds", count: { $sum: 1 } } },
    ]);
    const countById = new Map(
      counts.map((item) => [String(item._id), item.count]),
    );
    res.json(
      ships.map((ship) => ({
        ...ship,
        cardCount: countById.get(String(ship._id)) || 0,
      })),
    );
  }),
);
app.post(
  "/api/ships",
  asyncRoute(async (req, res) =>
    res
      .status(201)
      .json(
        await Ship.create({
          ownerId: "local-owner",
          ...safe(shipInput.parse(req.body)),
        }),
      ),
  ),
);
app.patch(
  "/api/ships/:id",
  asyncRoute(async (req, res) => {
    const ship = await Ship.findByIdAndUpdate(
      id.parse(req.params.id),
      safe(shipInput.partial().parse(req.body)),
      { new: true, runValidators: true },
    );
    if (!ship) return res.status(404).json({ message: "Ship not found" });
    res.json(ship);
  }),
);
app.delete(
  "/api/ships/:id",
  asyncRoute(async (req, res) => {
    const shipId = id.parse(req.params.id);
    const ship = await Ship.findByIdAndUpdate(
      shipId,
      { archivedAt: new Date() },
      { new: true },
    );
    if (!ship) return res.status(404).json({ message: "Ship not found" });
    await KnowledgeEntry.updateMany(
      { shipIds: shipId },
      { $pull: { shipIds: shipId } },
    );
    res.status(204).end();
  }),
);

app.get(
  "/api/sources",
  asyncRoute(async (req, res) => {
    const filter: Record<string, unknown> = req.query.status
      ? { status: req.query.status }
      : { status: { $ne: "archived" } };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.search) filter.$text = { $search: String(req.query.search) };
    res.json(await Source.find(filter).sort({ updatedAt: -1 }).lean());
  }),
);
app.post(
  "/api/sources",
  asyncRoute(async (req, res) => {
    const data = safe(sourceInput.parse(req.body));
    const source = await Source.create({
      ...data,
      title: data.title || "Untitled source",
    });
    if (source.type === "youtube" && source.url)
      await hydrateYoutubeSource(String(source._id));
    res.status(201).json(await Source.findById(source._id));
  }),
);
app.get(
  "/api/sources/duplicates",
  asyncRoute(async (req, res) => {
    const url = String(req.query.url || "").trim();
    const title = String(req.query.title || "").trim();
    if (!url && !title) return res.json([]);
    const clauses: Record<string, unknown>[] = [];
    if (url) clauses.push({ url });
    if (title)
      clauses.push({
        title: {
          $regex: title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          $options: "i",
        },
      });
    res.json(
      await Source.find({ $or: clauses, status: { $ne: "archived" } })
        .select("title url creatorName type series episodeNumber")
        .limit(8)
        .lean(),
    );
  }),
);
app.get(
  "/api/sources/:id",
  asyncRoute(async (req, res) => {
    const sourceId = id.parse(req.params.id);
    const source = await Source.findById(sourceId).lean();
    if (!source) return res.status(404).json({ message: "Source not found" });
    const [entry, chunks, runs] = await Promise.all([
      KnowledgeEntry.findOne({ sourceId }).lean(),
      TranscriptChunk.find({ sourceId }).sort({ position: 1 }).lean(),
      AiRun.find({ sourceId }).sort({ createdAt: -1 }).lean(),
    ]);
    const [ideas, quotes, actions] = entry
      ? await Promise.all([
          Idea.find({ knowledgeEntryId: entry._id }).lean(),
          Quote.find({ knowledgeEntryId: entry._id }).lean(),
          Action.find({ knowledgeEntryId: entry._id }).lean(),
        ])
      : [[], [], []];
    res.json({ source, entry, chunks, ideas, quotes, actions, runs });
  }),
);
app.patch(
  "/api/sources/:id",
  asyncRoute(async (req, res) => {
    const sourceId = id.parse(req.params.id);
    const source = await Source.findByIdAndUpdate(
      sourceId,
      safe(sourceInput.partial().parse(req.body)),
      { new: true, runValidators: true },
    );
    if (!source) return res.status(404).json({ message: "Source not found" });
    res.json(source);
  }),
);
app.post(
  "/api/sources/:id/process",
  asyncRoute(async (req, res) => {
    const sourceId = id.parse(req.params.id);
    const source = await Source.findById(sourceId);
    if (!source) return res.status(404).json({ message: "Source not found" });
    source.status = "queued";
    source.failureReason = undefined;
    await source.save();
    void processSource(sourceId);
    res.status(202).json({ message: "AI distillation queued", sourceId });
  }),
);
app.post(
  "/api/sources/:id/approve",
  asyncRoute(async (req, res) => {
    const sourceId = id.parse(req.params.id);
    const [source, entry] = await Promise.all([
      Source.findById(sourceId),
      KnowledgeEntry.findOne({ sourceId }),
    ]);
    if (!source || !entry)
      return res
        .status(404)
        .json({ message: "A processed source is required before approval" });
    const now = new Date();
    source.status = "approved";
    entry.status = "distilled";
    entry.approvedAt = now;
    entry.nextReviewAt = new Date(now.getTime() + 7 * 86400000);
    await Promise.all([
      source.save(),
      entry.save(),
      Idea.updateMany({ knowledgeEntryId: entry._id }, { approved: true }),
      Quote.updateMany({ knowledgeEntryId: entry._id }, { approved: true }),
    ]);
    res.json({ source, entry });
  }),
);
app.post(
  "/api/sources/:id/reject",
  asyncRoute(async (req, res) => {
    const source = await Source.findByIdAndUpdate(
      id.parse(req.params.id),
      { status: "rejected" },
      { new: true },
    );
    if (!source) return res.status(404).json({ message: "Source not found" });
    res.json(source);
  }),
);
app.delete(
  "/api/sources/:id",
  asyncRoute(async (req, res) => {
    const sourceId = id.parse(req.params.id);
    const entry = await KnowledgeEntry.findOne({ sourceId });
    await Promise.all([
      Source.findByIdAndDelete(sourceId),
      TranscriptChunk.deleteMany({ sourceId }),
      AiRun.deleteMany({ sourceId }),
      Quote.deleteMany({ sourceId }),
      entry
        ? Idea.deleteMany({ knowledgeEntryId: entry._id })
        : Promise.resolve(),
      entry
        ? Action.deleteMany({ knowledgeEntryId: entry._id })
        : Promise.resolve(),
      KnowledgeEntry.deleteOne({ sourceId }),
    ]);
    res.status(204).end();
  }),
);

app.get(
  "/api/knowledge",
  asyncRoute(async (req, res) => {
    const filter: Record<string, unknown> = req.query.status
      ? { status: req.query.status }
      : { status: { $ne: "archived" } };
    if (req.query.ship) filter.shipIds = id.parse(String(req.query.ship));
    if (req.query.search) filter.$text = { $search: String(req.query.search) };
    const entries = await KnowledgeEntry.find(filter)
      .sort({ updatedAt: -1 })
      .lean();
    const shipIds = entries.flatMap((entry) => entry.shipIds || []);
    const ships = await Ship.find({ _id: { $in: shipIds } }).lean();
    const shipsById = new Map(ships.map((ship) => [String(ship._id), ship]));
    const results = await Promise.all(
      entries.map(async (entry) => ({
        ...entry,
        ships: (entry.shipIds || [])
          .map((shipId) => shipsById.get(String(shipId)))
          .filter(Boolean),
        source: await Source.findById(entry.sourceId).lean(),
        ideas: await Idea.find({ knowledgeEntryId: entry._id }).lean(),
        actions: await Action.find({ knowledgeEntryId: entry._id }).lean(),
      })),
    );
    res.json(results);
  }),
);
app.get(
  "/api/knowledge/:id",
  asyncRoute(async (req, res) => {
    const entry = await KnowledgeEntry.findById(id.parse(req.params.id)).lean();
    if (!entry)
      return res.status(404).json({ message: "Knowledge entry not found" });
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
    res.json({
      entry,
      source,
      ideas,
      quotes,
      actions,
      reviews,
      connections,
      ships,
    });
  }),
);
app.patch(
  "/api/knowledge/:id",
  asyncRoute(async (req, res) => {
    const entry = await KnowledgeEntry.findByIdAndUpdate(
      id.parse(req.params.id),
      safe(
        entryInput
          .extend({ shipIds: z.array(id).max(12).optional() })
          .parse(req.body),
      ),
      { new: true, runValidators: true },
    );
    if (!entry)
      return res.status(404).json({ message: "Knowledge entry not found" });
    res.json(entry);
  }),
);
app.delete(
  "/api/knowledge/:id",
  asyncRoute(async (req, res) => {
    const entry = await KnowledgeEntry.findById(id.parse(req.params.id));
    if (!entry)
      return res.status(404).json({ message: "Knowledge entry not found" });
    const archivedAt = new Date();
    await Promise.all([
      KnowledgeEntry.updateOne(
        { _id: entry._id },
        { status: "archived", archivedAt },
      ),
      Source.updateOne(
        { _id: entry.sourceId },
        { status: "archived", archivedAt },
      ),
    ]);
    res.status(204).end();
  }),
);
app.post(
  "/api/knowledge/:id/restore",
  asyncRoute(async (req, res) => {
    const entry = await KnowledgeEntry.findById(id.parse(req.params.id));
    if (!entry)
      return res.status(404).json({ message: "Knowledge entry not found" });
    await Promise.all([
      KnowledgeEntry.updateOne(
        { _id: entry._id },
        { $set: { status: "distilled" }, $unset: { archivedAt: "" } },
      ),
      Source.updateOne(
        { _id: entry.sourceId },
        { $set: { status: "approved" }, $unset: { archivedAt: "" } },
      ),
    ]);
    res.json(await KnowledgeEntry.findById(entry._id).lean());
  }),
);
app.post(
  "/api/knowledge/:id/reviews",
  asyncRoute(async (req, res) => {
    const entryId = id.parse(req.params.id);
    const data = z
      .object({
        reflection: z.string().optional(),
        didIApplyIt: z.boolean().optional(),
        outcome: z.string().optional(),
        nextReviewAt: date,
      })
      .parse(req.body);
    const review = await Review.create({
      knowledgeEntryId: entryId,
      ...safe(data),
    });
    await KnowledgeEntry.findByIdAndUpdate(entryId, {
      lastReviewedAt: new Date(),
      nextReviewAt: data.nextReviewAt || new Date(Date.now() + 30 * 86400000),
    });
    res.status(201).json(review);
  }),
);
app.post(
  "/api/knowledge/:id/actions",
  asyncRoute(async (req, res) => {
    const action = await Action.create({
      knowledgeEntryId: id.parse(req.params.id),
      ...safe(actionInput.parse(req.body)),
    });
    res.status(201).json(action);
  }),
);
app.patch(
  "/api/actions/:id",
  asyncRoute(async (req, res) => {
    const data = actionInput.partial().parse(req.body);
    const action = await Action.findByIdAndUpdate(
      id.parse(req.params.id),
      {
        ...safe(data),
        ...(data.status === "completed" ? { completedAt: new Date() } : {}),
      },
      { new: true },
    );
    if (!action) return res.status(404).json({ message: "Action not found" });
    res.json(action);
  }),
);
app.patch(
  "/api/ideas/:id",
  asyncRoute(async (req, res) => {
    const data = z
      .object({
        title: z.string().min(1).optional(),
        explanation: z.string().optional(),
        approved: z.boolean().optional(),
      })
      .parse(req.body);
    const idea = await Idea.findByIdAndUpdate(id.parse(req.params.id), data, {
      new: true,
      runValidators: true,
    });
    if (!idea) return res.status(404).json({ message: "Idea not found" });
    res.json(idea);
  }),
);
app.get(
  "/api/quiz",
  asyncRoute(async (req, res) => {
    const entryFilter: Record<string, unknown> = {
      status: { $in: ["distilled", "applied"] },
    };
    if (req.query.ship) entryFilter.shipIds = id.parse(String(req.query.ship));
    const entries = await KnowledgeEntry.find(entryFilter)
      .select("_id title")
      .lean();
    const entryIds = entries.map((entry) => entry._id);
    const entryById = new Map(
      entries.map((entry) => [String(entry._id), entry]),
    );
    const ideas = await Idea.find({
      knowledgeEntryId: { $in: entryIds },
      approved: true,
    }).lean();
    const shuffled = ideas
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(Number(req.query.limit) || 5, 20));
    res.json(
      shuffled.map((idea) => ({
        ideaId: idea._id,
        entryId: idea.knowledgeEntryId,
        sourceTitle: entryById.get(String(idea.knowledgeEntryId))?.title,
        prompt: `What do you remember about: ${idea.title}?`,
        answer: idea.explanation,
        practicalApplication: idea.practicalApplication,
      })),
    );
  }),
);
app.post(
  "/api/quiz/:ideaId/attempts",
  asyncRoute(async (req, res) => {
    const idea = await Idea.findById(id.parse(req.params.ideaId));
    if (!idea) return res.status(404).json({ message: "Lesson not found" });
    const data = z
      .object({
        recalled: z.boolean(),
        confidence: z.number().int().min(1).max(5).optional(),
        answer: z.string().max(4000).optional(),
      })
      .parse(req.body);
    res
      .status(201)
      .json(
        await QuizAttempt.create({
          ...data,
          ideaId: idea._id,
          knowledgeEntryId: idea.knowledgeEntryId,
        }),
      );
  }),
);
app.get(
  "/api/graph",
  asyncRoute(async (_req, res) => {
    const [entries, ideas, connections] = await Promise.all([
      KnowledgeEntry.find({ status: { $ne: "archived" } })
        .select("title shipIds")
        .lean(),
      Idea.find().select("knowledgeEntryId title").lean(),
      Connection.find().lean(),
    ]);
    res.json({
      nodes: [
        ...entries.map((entry) => ({
          id: String(entry._id),
          label: entry.title,
          type: "entry",
        })),
        ...ideas.map((idea) => ({
          id: String(idea._id),
          label: idea.title,
          type: "idea",
        })),
      ],
      edges: connections.map((connection) => ({
        from: String(connection.fromId),
        to: String(connection.toId),
        relationship: connection.relationship,
        note: connection.note,
      })),
    });
  }),
);
app.patch(
  "/api/quotes/:id",
  asyncRoute(async (req, res) => {
    const data = z
      .object({
        text: z.string().min(1).optional(),
        approved: z.boolean().optional(),
      })
      .parse(req.body);
    const quote = await Quote.findByIdAndUpdate(id.parse(req.params.id), data, {
      new: true,
      runValidators: true,
    });
    if (!quote) return res.status(404).json({ message: "Quote not found" });
    res.json(quote);
  }),
);

app.get(
  "/api/reminders",
  asyncRoute(async (_req, res) => {
    const now = new Date();
    const [actions, reviews] = await Promise.all([
      Action.find({
        status: "open",
        $or: [{ dueAt: { $lte: now } }, { dueAt: null }],
      })
        .sort({ dueAt: 1 })
        .limit(10)
        .lean(),
      KnowledgeEntry.find({
        status: { $in: ["distilled", "applied"] },
        nextReviewAt: { $lte: now },
      })
        .sort({ nextReviewAt: 1 })
        .limit(5)
        .lean(),
    ]);
    res.json({ actions, reviews });
  }),
);
app.get(
  "/api/dashboard",
  asyncRoute(async (_req, res) => {
    const activeEntries = { status: { $ne: "archived" } };
    const [total, distilled, applied, inbox, areas, recent, due] =
      await Promise.all([
        KnowledgeEntry.countDocuments(activeEntries),
        KnowledgeEntry.countDocuments({ status: "distilled" }),
        KnowledgeEntry.countDocuments({ status: "applied" }),
        Source.countDocuments({
          status: {
            $in: ["draft", "queued", "processing", "ready_for_review"],
          },
        }),
        KnowledgeEntry.aggregate([
          { $match: activeEntries },
          { $group: { _id: "$focusArea", count: { $sum: 1 } } },
        ]),
        KnowledgeEntry.find(activeEntries)
          .sort({ updatedAt: -1 })
          .limit(6)
          .lean(),
        Action.countDocuments({ status: "open", dueAt: { $lte: new Date() } }),
      ]);
    res.json({ total, distilled, applied, inbox, due, areas, recent });
  }),
);
app.get(
  "/api/creators",
  asyncRoute(async (_req, res) =>
    res.json(await Creator.find().sort({ name: 1 }).lean()),
  ),
);
app.post(
  "/api/creators",
  asyncRoute(async (req, res) =>
    res
      .status(201)
      .json(await Creator.create(safe(creatorInput.parse(req.body)))),
  ),
);
app.patch(
  "/api/creators/:id",
  asyncRoute(async (req, res) => {
    const creator = await Creator.findByIdAndUpdate(
      id.parse(req.params.id),
      safe(creatorInput.partial().parse(req.body)),
      { new: true, runValidators: true },
    );
    if (!creator) return res.status(404).json({ message: "Creator not found" });
    res.json(creator);
  }),
);
app.delete(
  "/api/creators/:id",
  asyncRoute(async (req, res) => {
    const creator = await Creator.findByIdAndDelete(id.parse(req.params.id));
    if (!creator) return res.status(404).json({ message: "Creator not found" });
    res.status(204).end();
  }),
);
app.get(
  "/api/connections",
  asyncRoute(async (req, res) => {
    const filter: Record<string, unknown> = {};
    if (req.query.id)
      filter.$or = [
        { fromId: id.parse(String(req.query.id)) },
        { toId: id.parse(String(req.query.id)) },
      ];
    res.json(await Connection.find(filter).sort({ updatedAt: -1 }).lean());
  }),
);
app.post(
  "/api/connections",
  asyncRoute(async (req, res) =>
    res
      .status(201)
      .json(await Connection.create(connectionInput.parse(req.body))),
  ),
);
app.patch(
  "/api/connections/:id",
  asyncRoute(async (req, res) => {
    const connection = await Connection.findByIdAndUpdate(
      id.parse(req.params.id),
      connectionInput.partial().parse(req.body),
      { new: true, runValidators: true },
    );
    if (!connection)
      return res.status(404).json({ message: "Connection not found" });
    res.json(connection);
  }),
);
app.delete(
  "/api/connections/:id",
  asyncRoute(async (req, res) => {
    const connection = await Connection.findByIdAndDelete(
      id.parse(req.params.id),
    );
    if (!connection)
      return res.status(404).json({ message: "Connection not found" });
    res.status(204).end();
  }),
);

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error instanceof z.ZodError)
      return res
        .status(400)
        .json({ message: "Validation failed", issues: error.flatten() });
    if (error instanceof mongoose.Error.CastError)
      return res.status(400).json({ message: "Invalid document id" });
    console.error(error);
    res
      .status(500)
      .json({
        message: error instanceof Error ? error.message : "Server error",
      });
  },
);
const port = Number(process.env.PORT || 4000);
async function migrateLegacyFocusAreasToShips() {
  const entries = await KnowledgeEntry.find({
    $or: [{ shipIds: { $exists: false } }, { shipIds: { $size: 0 } }],
  })
    .select("_id focusArea")
    .lean();
  const names = [
    ...new Set(
      entries
        .map((entry) => entry.focusArea)
        .filter((name): name is string => Boolean(name)),
    ),
  ];
  const ships = await Promise.all(
    names.map((name) =>
      Ship.findOneAndUpdate(
        { ownerId: "local-owner", name },
        { $setOnInsert: { ownerId: "local-owner", name } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ),
    ),
  );
  const shipByName = new Map(ships.map((ship) => [ship.name, ship._id]));
  await Promise.all(
    entries.map((entry) =>
      entry.focusArea
        ? KnowledgeEntry.updateOne(
            { _id: entry._id },
            { $set: { shipIds: [shipByName.get(entry.focusArea)] } },
          )
        : Promise.resolve(),
    ),
  );
}
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/knowledge-hub")
  .then(async () => {
    app.listen(port, () => console.log(`Knowledge Hub API on :${port}`));
  })
  .catch(console.error);
