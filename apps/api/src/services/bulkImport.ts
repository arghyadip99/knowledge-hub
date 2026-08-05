import {
  Action,
  Creator,
  Idea,
  ImportBatch,
  KnowledgeEntry,
  Quote,
  Source,
  TranscriptChunk,
} from "../models/Knowledge.js";
import type { KnowledgeImport } from "../schemas/import.js";

const clean = <T extends Record<string, unknown>>(data: T) =>
  Object.fromEntries(
    Object.entries(data).filter(
      ([, value]) => value !== "" && value !== undefined,
    ),
  );

export async function importKnowledge(payload: KnowledgeImport) {
  let sourceId: string | undefined;
  let entryId: string | undefined;
  try {
    const creator = await Creator.findOneAndUpdate(
      { ownerId: "local-owner", name: payload.source.creator },
      {
        $setOnInsert: {
          name: payload.source.creator,
          type: "person",
          focusAreas: [payload.source.focusArea],
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    const source = await Source.create({
      ownerId: "local-owner",
      type: payload.source.type,
      title: payload.source.title,
      url: payload.source.url || "",
      creatorName: payload.source.creator,
      creatorId: creator._id,
      publisher: payload.source.publisher,
      series: payload.source.series,
      episodeNumber: payload.source.episodeNumber,
      guests: payload.source.guests,
      publishedAt: payload.source.publishedAt || undefined,
      durationSeconds: payload.source.durationSeconds,
      language: payload.source.language,
      rawText: payload.source.rawTranscript || "",
      transcriptStatus: payload.source.rawTranscript
        ? "available"
        : "not_needed",
      status: "approved",
      focusArea: payload.source.focusArea,
      ingestionMetadata: {
        origin: payload.origin,
        externalId: payload.externalId,
        importedAt: new Date(),
      },
    });
    sourceId = String(source._id);
    const entry = await KnowledgeEntry.create({
      ownerId: "local-owner",
      sourceId: source._id,
      title: payload.source.title,
      captainName: payload.knowledge.captainName || payload.source.creator,
      shipIds: [],
      focusArea: payload.source.focusArea,
      status: payload.knowledge.status,
      centralThesis: payload.knowledge.centralThesis,
      summary: payload.knowledge.summary,
      whyItMattersToMe: payload.knowledge.whyItMattersToMe || "",
      tags: payload.knowledge.tags,
      confidence: 0.95,
      approvedAt: new Date(),
      nextReviewAt: payload.knowledge.nextReviewAt || undefined,
    });
    entryId = String(entry._id);
    const chunks = payload.source.rawTranscript
      ? await TranscriptChunk.insertMany([
          {
            sourceId: source._id,
            position: 0,
            text: payload.source.rawTranscript,
            tokenCount: Math.ceil(payload.source.rawTranscript.length / 4),
          },
        ])
      : [];
    const lessons = await Idea.insertMany(
      payload.lessons.map((lesson, index) => ({
        knowledgeEntryId: entry._id,
        title: lesson.title,
        explanation: lesson.explanation,
        ideaType: lesson.type,
        importance: lesson.importance,
        confidence: lesson.confidence,
        evidence: lesson.evidence,
        practicalApplication: lesson.practicalApplication,
        tags: lesson.tags,
        order: index + 1,
        timestampReferences:
          lesson.timestamp?.startSeconds === undefined
            ? []
            : [lesson.timestamp.startSeconds],
        evidenceChunkIds: chunks.length ? [chunks[0]._id] : [],
        approved: lesson.approved,
      })),
    );
    await Quote.insertMany(
      payload.quotes.map((quote) => ({
        sourceId: source._id,
        knowledgeEntryId: entry._id,
        text: quote.text,
        speaker: quote.speaker,
        context: quote.context,
        startSeconds: quote.timestamp?.startSeconds,
        endSeconds: quote.timestamp?.endSeconds,
        approved: quote.approved,
      })),
    );
    await Action.insertMany(
      payload.actions.map((action) => ({
        knowledgeEntryId: entry._id,
        ideaId:
          action.lessonIndex === undefined
            ? undefined
            : lessons[action.lessonIndex]?._id,
        text: action.text,
        dueAt: action.dueAt || undefined,
        reminderFrequency: action.reminderFrequency,
      })),
    );
    return {
      sourceId,
      entryId,
      lessons: lessons.length,
      quotes: payload.quotes.length,
      actions: payload.actions.length,
    };
  } catch (error) {
    if (entryId)
      await Promise.all([
        Idea.deleteMany({ knowledgeEntryId: entryId }),
        Quote.deleteMany({ knowledgeEntryId: entryId }),
        Action.deleteMany({ knowledgeEntryId: entryId }),
        KnowledgeEntry.findByIdAndDelete(entryId),
      ]);
    if (sourceId)
      await Promise.all([
        TranscriptChunk.deleteMany({ sourceId }),
        Source.findByIdAndDelete(sourceId),
      ]);
    throw error;
  }
}

export async function recordImportBatch(
  requested: number,
  results: { sourceId?: string; error?: string }[],
  origin = "manual-chatgpt",
) {
  const sourceIds = results.flatMap((result) =>
    result.sourceId ? [result.sourceId] : [],
  );
  const errors = results.flatMap((result, index) =>
    result.error ? [{ index, message: result.error }] : [],
  );
  return ImportBatch.create({
    status: errors.length
      ? sourceIds.length
        ? "partial"
        : "failed"
      : "completed",
    requested,
    created: sourceIds.length,
    failed: errors.length,
    sourceIds,
    errors,
    origin,
  });
}
