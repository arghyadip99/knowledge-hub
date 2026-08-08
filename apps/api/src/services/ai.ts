export type IdeaType =
  | "principle"
  | "framework"
  | "claim"
  | "question"
  | "story"
  | "protocol";
export type Candidate = {
  title: string;
  explanation: string;
  ideaType: IdeaType;
  confidence: number;
  chunkPositions: number[];
  evidenceQuote?: string;
  practicalImplication?: string;
};
export type Distillation = {
  centralThesis: string;
  summary: string;
  whyItMattersToMe: string;
  focusArea: string;
  tags: string[];
  ideas: Candidate[];
  quotes: {
    text: string;
    speaker?: string;
    startSeconds?: number;
    endSeconds?: number;
    context?: string;
  }[];
  actions: {
    text: string;
    reminderFrequency: "once" | "daily" | "weekly" | "monthly";
  }[];
};
type ChunkInput = { position: number; text: string };

const apiKey = () => process.env.OPENROUTER_API_KEY || "";
const model = () => process.env.OPENROUTER_MODEL || "";

/** Free OpenRouter models occasionally wrap JSON in prose or markdown fences despite json_object mode. */
function extractJson<T>(content: string): T {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = (fenced || content).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  const jsonSlice =
    start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate;
  return JSON.parse(jsonSlice) as T;
}

async function askOpenRouter<T>(prompt: string, timeout = 75000): Promise<T> {
  if (!apiKey()) throw new Error("OPENROUTER_API_KEY is not configured");
  if (!model()) throw new Error("OPENROUTER_MODEL is not configured");
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0)
      await new Promise((resolve) =>
        setTimeout(resolve, 1500 * 2 ** (attempt - 1)),
      );
    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey()}`,
            "HTTP-Referer": "https://github.com/knowledge-hub",
            "X-Title": "Knowledge Hub",
          },
          body: JSON.stringify({
            model: model(),
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: prompt }],
          }),
          signal: AbortSignal.timeout(timeout),
        },
      );
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`OpenRouter returned ${response.status}`);
        continue;
      }
      if (!response.ok)
        throw new Error(`OpenRouter returned ${response.status}`);
      const body = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = body.choices?.[0]?.message?.content;
      if (!content) throw new Error("OpenRouter returned no content");
      return extractJson<T>(content);
    } catch (error) {
      lastError = error;
      if (error instanceof SyntaxError) break; // malformed JSON won't fix itself on retry
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("OpenRouter request failed");
}

export async function extractChunkCandidates(
  title: string,
  chunks: ChunkInput[],
): Promise<Candidate[]> {
  const transcript = chunks
    .map((chunk) => `CHUNK ${chunk.position}:\n${chunk.text}`)
    .join("\n\n");
  const result = await askOpenRouter<{ candidates?: Candidate[] }>(
    `You are an exacting knowledge editor processing part of a long podcast: "${title}". Extract only durable, non-obvious, evidence-supported knowledge. Ignore greetings, filler, repetition, unsupported claims, and generic motivation. Return JSON only: {"candidates":[{"title":"short insight","explanation":"clear explanation","ideaType":"principle|framework|claim|question|story|protocol","confidence":0.0,"chunkPositions":[0],"evidenceQuote":"short exact quote","practicalImplication":"optional action"}]}. Return 0 to 4 candidates PER CHUNK. Every candidate must cite the CHUNK number that supports it; never invent an idea.\n\n${transcript}`,
  );
  return (result.candidates || [])
    .filter(
      (candidate) =>
        candidate.title &&
        candidate.explanation &&
        candidate.chunkPositions?.some((position) =>
          chunks.some((chunk) => chunk.position === position),
        ),
    )
    .slice(0, chunks.length * 4);
}

export async function synthesizeCandidates(
  title: string,
  candidates: Candidate[],
): Promise<Distillation> {
  const evidence = candidates
    .map(
      (candidate, index) =>
        `C${index + 1} | chunks:${candidate.chunkPositions.join(",")} | ${candidate.title}: ${candidate.explanation}${candidate.practicalImplication ? ` | implication: ${candidate.practicalImplication}` : ""}`,
    )
    .join("\n");
  const result = await askOpenRouter<Distillation>(
    `You are the final editor for a personal knowledge hub. The source is "${title}". Below are evidence-backed candidate insights extracted from the ENTIRE source. Merge duplicates, reject generic candidates, and choose the 15–20 strongest distinct nuggets when the evidence supports that many. Prefer novelty, practical usefulness, and clear evidence. Return JSON only with exactly: {"centralThesis":"","summary":"","whyItMattersToMe":"","focusArea":"Neuroscience|Psychology|Indian Startups|Spirituality & Tantra|Self Improvement|General","tags":[""],"ideas":[{"title":"","explanation":"","ideaType":"principle|framework|claim|question|story|protocol","confidence":0.0,"chunkPositions":[0],"evidenceQuote":"","practicalImplication":""}],"quotes":[{"text":"","speaker":"","startSeconds":0,"endSeconds":0,"context":""}],"actions":[{"text":"","reminderFrequency":"once|daily|weekly|monthly"}]}. Include 15–20 ideas only if they are genuinely distinct; otherwise return fewer. Cite the supporting chunk positions for every idea. Do not add any fact that is not in the candidate evidence.\n\nCANDIDATE EVIDENCE:\n${evidence.slice(0, 50000)}`,
  );
  return {
    ...result,
    ideas: (result.ideas || [])
      .filter(
        (idea) => idea.title && idea.explanation && idea.chunkPositions?.length,
      )
      .slice(0, 20),
    quotes: (result.quotes || []).slice(0, 7),
    actions: (result.actions || []).slice(0, 7),
    tags: (result.tags || []).slice(0, 10),
  };
}

const sentences = (text: string) =>
  text
    .replace(/\s+/g, " ")
    .match(/[^.!?]+[.!?]+/g)
    ?.map((value) => value.trim())
    .filter((value) => value.length > 25) || [];
export function fallbackCandidates(chunks: ChunkInput[]): Candidate[] {
  return chunks
    .flatMap((chunk) =>
      sentences(chunk.text)
        .slice(0, 2)
        .map((sentence, index) => ({
          title: sentence.slice(0, 110),
          explanation: sentence,
          ideaType: "claim" as IdeaType,
          confidence: 0.25,
          chunkPositions: [chunk.position],
          evidenceQuote: sentence,
          practicalImplication: index === 0 ? "" : undefined,
        })),
    )
    .slice(0, 80);
}
export function fallbackSynthesis(
  title: string,
  candidates: Candidate[],
): Distillation {
  const unique = candidates
    .filter(
      (candidate, index, list) =>
        list.findIndex(
          (other) =>
            other.title.toLowerCase() === candidate.title.toLowerCase(),
        ) === index,
    )
    .slice(0, 20);
  return {
    centralThesis: unique[0]?.explanation || title,
    summary: unique
      .slice(0, 4)
      .map((candidate) => candidate.explanation)
      .join(" "),
    whyItMattersToMe: "",
    focusArea: "General",
    tags: [],
    ideas: unique,
    quotes: [],
    actions: [],
  };
}
