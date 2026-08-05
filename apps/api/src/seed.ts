import "dotenv/config";
import mongoose from "mongoose";
import {
  Action,
  Creator,
  Idea,
  KnowledgeEntry,
  Source,
} from "./models/Knowledge.js";

const records = [
  {
    title: "The science of deliberate cold exposure",
    creator: "Huberman Lab",
    area: "Neuroscience",
    thesis:
      "Cold is a controllable stressor that can train the nervous system and sharpen mood.",
    summary:
      "The benefit comes from a deliberate, repeatable practice—not heroic suffering.",
    tags: ["dopamine", "stress", "protocol"],
    idea: "The dopamine reset",
    action: "Try a 60-second cold finish twice this week",
  },
  {
    title: "How to get rich (without getting lucky)",
    creator: "Naval Ravikant",
    area: "Psychology",
    thesis:
      "Specific knowledge, leverage, and long-term games create compounding returns.",
    summary:
      "The real goal is freedom: owning your time and creating without permission.",
    tags: ["leverage", "wealth", "decision-making"],
    idea: "Escape competition",
    action: "Write down one piece of specific knowledge only I can build on",
  },
  {
    title: "Why India is building differently",
    creator: "Think School",
    area: "Indian Startups",
    thesis:
      "India’s strongest startups win by combining trust, distribution, and local constraints.",
    summary: "Great strategy starts with the customer’s real-world friction.",
    tags: ["india", "startups", "strategy"],
    idea: "Distribution is the moat",
    action: "",
  },
  {
    title: "The inner technology of sadhana",
    creator: "Rajarshi Nandy",
    area: "Spirituality & Tantra",
    thesis: "Practice becomes more important than spiritual collecting.",
    summary:
      "A conversation about devotion, discipline, and direct inner experience.",
    tags: ["sadhana", "tantra", "practice"],
    idea: "Experience over collection",
    action: "",
  },
  {
    title: "The habits that make a meaningful life",
    creator: "The Diary of a CEO",
    area: "Self Improvement",
    thesis: "Self-respect grows from evidence, not affirmations.",
    summary: "A useful life is built through small promises kept repeatedly.",
    tags: ["habits", "identity", "discipline"],
    idea: "Evidence over intention",
    action: "",
  },
] as const;

await mongoose.connect(
  process.env.MONGO_URI || "mongodb://localhost:27017/knowledge-hub",
);
await Promise.all([
  Action.deleteMany({}),
  Idea.deleteMany({}),
  KnowledgeEntry.deleteMany({}),
  Source.deleteMany({}),
  Creator.deleteMany({}),
]);
for (const record of records) {
  const creator = await Creator.create({
    name: record.creator,
    type: "channel",
    focusAreas: [record.area],
  });
  const source = await Source.create({
    type: "youtube",
    title: record.title,
    creatorName: record.creator,
    creatorId: creator._id,
    focusArea: record.area,
    status: "approved",
    transcriptStatus: "available",
    rawText: `${record.thesis} ${record.summary}`,
  });
  const entry = await KnowledgeEntry.create({
    sourceId: source._id,
    title: record.title,
    focusArea: record.area,
    status: "distilled",
    centralThesis: record.thesis,
    summary: record.summary,
    tags: record.tags,
    approvedAt: new Date(),
    nextReviewAt: new Date(Date.now() + 7 * 86400000),
  });
  await Idea.create({
    knowledgeEntryId: entry._id,
    title: record.idea,
    explanation: record.summary,
    approved: true,
  });
  if (record.action)
    await Action.create({
      knowledgeEntryId: entry._id,
      text: record.action,
      dueAt: new Date(),
      reminderFrequency: "weekly",
    });
}
await mongoose.disconnect();
console.log("Seeded knowledge refinery");
