import {
  Action,
  AiRun,
  Idea,
  KnowledgeEntry,
  Quote,
  Source,
  TranscriptChunk,
  focusAreas,
} from "../models/Knowledge.js";
import {
  Candidate,
  extractChunkCandidates,
  fallbackCandidates,
  fallbackSynthesis,
  synthesizeCandidates,
} from "./ai.js";

const chunkText = (text: string, size = 2200) =>
  text
    .match(new RegExp(`[\\s\\S]{1,${size}}(?:\\s|$)`, "g"))
    ?.map((value) => value.trim())
    .filter(Boolean) || [];
const batches = <T>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size),
  );
const stage = async (source: any, run: any, value: Record<string, unknown>) => {
  if (!source) return;
  source.ingestionMetadata = {
    ...(source.ingestionMetadata as object),
    progress: value,
  };
  await source.save();
  run.rawOutput = { ...(run.rawOutput as object), progress: value };
  await run.save();
};

export async function hydrateYoutubeSource(sourceId: string) {
  const source = await Source.findById(sourceId);
  if (!source || source.type !== "youtube" || !source.url) return source;
  try {
    const oembed = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(source.url)}&format=json`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (oembed.ok) {
      const data = (await oembed.json()) as {
        title?: string;
        author_name?: string;
        thumbnail_url?: string;
      };
      source.title = data.title || source.title;
      source.creatorName = data.author_name || source.creatorName;
      source.thumbnailUrl = data.thumbnail_url || source.thumbnailUrl;
    }
  } catch {
    /* optional metadata */
  }
  if (!source.rawText.trim())
    try {
      const packageModule = (await import("youtube-transcript")) as unknown as {
        YoutubeTranscript: {
          fetchTranscript: (url: string) => Promise<{ text: string }[]>;
        };
      };
      const captions = await packageModule.YoutubeTranscript.fetchTranscript(
        source.url,
      );
      source.rawText = captions.map((caption) => caption.text).join(" ");
      source.transcriptStatus = "available";
      source.ingestionMetadata = {
        captionCount: captions.length,
        transcriptOrigin: "youtube-captions",
      };
    } catch {
      source.transcriptStatus = "unavailable";
    }
  await source.save();
  return source;
}

export async function processSource(sourceId: string) {
  const source = await Source.findById(sourceId);
  if (!source) return;
  const run = await AiRun.create({
    sourceId,
    provider: "ollama",
    model: process.env.OLLAMA_MODEL || "qwen2.5:7b",
    taskType: "long-form-distillation",
    status: "running",
    rawOutput: {},
  });
  try {
    source.status = "processing";
    source.failureReason = undefined;
    await source.save();
    if (!source.rawText.trim())
      throw new Error(
        "No transcript or source text is available. Paste a transcript or source text, then process again.",
      );
    await TranscriptChunk.deleteMany({ sourceId });
    const inputChunks = chunkText(source.rawText).map((text, position) => ({
      position,
      text,
    }));
    const createdChunks = await TranscriptChunk.insertMany(
      inputChunks.map((chunk) => ({
        sourceId,
        ...chunk,
        tokenCount: Math.ceil(chunk.text.length / 4),
      })),
    );
    await stage(source, run, {
      stage: "extracting",
      completed: 0,
      total: inputChunks.length,
      message: `Reading ${inputChunks.length} transcript chunks`,
    });
    const candidates: Candidate[] = [];
    let usedFallback = false;
    for (const [batchIndex, batch] of batches(inputChunks, 3).entries()) {
      try {
        candidates.push(...(await extractChunkCandidates(source.title, batch)));
      } catch (error) {
        candidates.push(...fallbackCandidates(batch));
        usedFallback = true;
        run.error =
          error instanceof Error ? error.message : "Chunk extraction fallback";
      }
      await stage(source, run, {
        stage: "extracting",
        completed: Math.min((batchIndex + 1) * 3, inputChunks.length),
        total: inputChunks.length,
        candidates: candidates.length,
        message: `Extracted ${candidates.length} candidate insights`,
      });
    }
    await stage(source, run, {
      stage: "synthesizing",
      completed: inputChunks.length,
      total: inputChunks.length,
      candidates: candidates.length,
      message: "Ranking and merging the strongest ideas",
    });
    let draft;
    try {
      draft = await synthesizeCandidates(source.title, candidates);
    } catch (error) {
      draft = fallbackSynthesis(source.title, candidates);
      usedFallback = true;
      run.error = error instanceof Error ? error.message : "Synthesis fallback";
    }
    const area = focusAreas.includes(
      draft.focusArea as (typeof focusAreas)[number],
    )
      ? (draft.focusArea as (typeof focusAreas)[number])
      : "General";
    const entry = await KnowledgeEntry.findOneAndUpdate(
      { sourceId },
      {
        title: source.title,
        focusArea: area,
        centralThesis: draft.centralThesis,
        summary: draft.summary,
        whyItMattersToMe: draft.whyItMattersToMe,
        confidence: usedFallback ? 0.35 : 0.8,
        tags: draft.tags,
        status: "inbox",
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    await Promise.all([
      Idea.deleteMany({ knowledgeEntryId: entry._id }),
      Quote.deleteMany({ knowledgeEntryId: entry._id }),
      Action.deleteMany({ knowledgeEntryId: entry._id }),
    ]);
    const ideas = await Idea.insertMany(
      draft.ideas.map((idea) => ({
        knowledgeEntryId: entry._id,
        title: idea.title,
        explanation: idea.explanation,
        ideaType: idea.ideaType,
        confidence: idea.confidence,
        evidenceChunkIds: idea.chunkPositions
          .map((position) => createdChunks[position]?._id)
          .filter(Boolean),
      })),
    );
    await Quote.insertMany(
      draft.quotes.map((quote) => ({
        sourceId,
        knowledgeEntryId: entry._id,
        ...quote,
      })),
    );
    await Action.insertMany(
      draft.actions.map((action) => ({
        knowledgeEntryId: entry._id,
        ...action,
      })),
    );
    source.status = "ready_for_review";
    source.transcriptStatus = "available";
    source.focusArea = area;
    source.ingestionMetadata = {
      ...(source.ingestionMetadata as object),
      progress: {
        stage: "complete",
        completed: inputChunks.length,
        total: inputChunks.length,
        candidates: candidates.length,
        ideas: ideas.length,
        message: usedFallback
          ? "Draft ready — some stages used local fallback"
          : "AI draft ready for review",
      },
    };
    await source.save();
    run.status = "completed";
    run.provider = usedFallback ? "ollama+fallback" : "ollama";
    run.rawOutput = {
      entryId: entry._id,
      ideas: ideas.length,
      chunks: createdChunks.length,
      candidates: candidates.length,
      usedFallback,
    };
    await run.save();
  } catch (error) {
    source.status = "failed";
    source.failureReason =
      error instanceof Error ? error.message : "Processing failed";
    await source.save();
    run.status = "failed";
    run.error = source.failureReason;
    await run.save();
  }
}
