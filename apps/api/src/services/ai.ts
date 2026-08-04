export type IdeaType = 'principle' | 'framework' | 'claim' | 'question' | 'story' | 'protocol';
export type Candidate = { title: string; explanation: string; ideaType: IdeaType; confidence: number; chunkPositions: number[]; evidenceQuote?: string; practicalImplication?: string };
export type Distillation = { centralThesis: string; summary: string; whyItMattersToMe: string; focusArea: string; tags: string[]; ideas: Candidate[]; quotes: { text: string; speaker?: string; startSeconds?: number; endSeconds?: number; context?: string }[]; actions: { text: string; reminderFrequency: 'once' | 'daily' | 'weekly' | 'monthly' }[] };
type ChunkInput = { position: number; text: string };

const baseUrl = () => process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434';
const model = () => process.env.OLLAMA_MODEL || 'qwen2.5:7b';
async function askOllama<T>(prompt: string, timeout = 75000): Promise<T> {
  const response = await fetch(`${baseUrl()}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: model(), stream: false, format: 'json', options: { temperature: 0.2, num_ctx: 8192 }, messages: [{ role: 'user', content: prompt }] }), signal: AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
  const body = await response.json() as { message?: { content?: string } };
  if (!body.message?.content) throw new Error('Ollama returned no content');
  return JSON.parse(body.message.content) as T;
}

export async function extractChunkCandidates(title: string, chunks: ChunkInput[]): Promise<Candidate[]> {
  const transcript = chunks.map(chunk => `CHUNK ${chunk.position}:\n${chunk.text}`).join('\n\n');
  const result = await askOllama<{ candidates?: Candidate[] }>(`You are an exacting knowledge editor processing part of a long podcast: "${title}". Extract only durable, non-obvious, evidence-supported knowledge. Ignore greetings, filler, repetition, unsupported claims, and generic motivation. Return JSON only: {"candidates":[{"title":"short insight","explanation":"clear explanation","ideaType":"principle|framework|claim|question|story|protocol","confidence":0.0,"chunkPositions":[0],"evidenceQuote":"short exact quote","practicalImplication":"optional action"}]}. Return 0 to 4 candidates PER CHUNK. Every candidate must cite the CHUNK number that supports it; never invent an idea.\n\n${transcript}`);
  return (result.candidates || []).filter(candidate => candidate.title && candidate.explanation && candidate.chunkPositions?.some(position => chunks.some(chunk => chunk.position === position))).slice(0, chunks.length * 4);
}

export async function synthesizeCandidates(title: string, candidates: Candidate[]): Promise<Distillation> {
  const evidence = candidates.map((candidate, index) => `C${index + 1} | chunks:${candidate.chunkPositions.join(',')} | ${candidate.title}: ${candidate.explanation}${candidate.practicalImplication ? ` | implication: ${candidate.practicalImplication}` : ''}`).join('\n');
  const result = await askOllama<Distillation>(`You are the final editor for a personal knowledge hub. The source is "${title}". Below are evidence-backed candidate insights extracted from the ENTIRE source. Merge duplicates, reject generic candidates, and choose the 15–20 strongest distinct nuggets when the evidence supports that many. Prefer novelty, practical usefulness, and clear evidence. Return JSON only with exactly: {"centralThesis":"","summary":"","whyItMattersToMe":"","focusArea":"Neuroscience|Psychology|Indian Startups|Spirituality & Tantra|Self Improvement|General","tags":[""],"ideas":[{"title":"","explanation":"","ideaType":"principle|framework|claim|question|story|protocol","confidence":0.0,"chunkPositions":[0],"evidenceQuote":"","practicalImplication":""}],"quotes":[{"text":"","speaker":"","startSeconds":0,"endSeconds":0,"context":""}],"actions":[{"text":"","reminderFrequency":"once|daily|weekly|monthly"}]}. Include 15–20 ideas only if they are genuinely distinct; otherwise return fewer. Cite the supporting chunk positions for every idea. Do not add any fact that is not in the candidate evidence.\n\nCANDIDATE EVIDENCE:\n${evidence.slice(0, 50000)}`);
  return { ...result, ideas: (result.ideas || []).filter(idea => idea.title && idea.explanation && idea.chunkPositions?.length).slice(0, 20), quotes: (result.quotes || []).slice(0, 7), actions: (result.actions || []).slice(0, 7), tags: (result.tags || []).slice(0, 10) };
}

const sentences = (text: string) => text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+/g)?.map(value => value.trim()).filter(value => value.length > 25) || [];
export function fallbackCandidates(chunks: ChunkInput[]): Candidate[] {
  return chunks.flatMap(chunk => sentences(chunk.text).slice(0, 2).map((sentence, index) => ({ title: sentence.slice(0, 110), explanation: sentence, ideaType: 'claim' as IdeaType, confidence: 0.25, chunkPositions: [chunk.position], evidenceQuote: sentence, practicalImplication: index === 0 ? '' : undefined }))).slice(0, 80);
}
export function fallbackSynthesis(title: string, candidates: Candidate[]): Distillation {
  const unique = candidates.filter((candidate, index, list) => list.findIndex(other => other.title.toLowerCase() === candidate.title.toLowerCase()) === index).slice(0, 20);
  return { centralThesis: unique[0]?.explanation || title, summary: unique.slice(0, 4).map(candidate => candidate.explanation).join(' '), whyItMattersToMe: '', focusArea: 'General', tags: [], ideas: unique, quotes: [], actions: [] };
}
