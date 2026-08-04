db = db.getSiblingDB('knowledge-hub');
const now = new Date();
const records = [
  ['Huberman Lab', 'The science of deliberate cold exposure', 'Neuroscience', 'Cold is a controllable stressor that can train the nervous system and sharpen mood.', 'The benefit comes from a deliberate, repeatable practice—not heroic suffering.', ['dopamine', 'stress', 'protocol'], 'The dopamine reset', 'Try a 60-second cold finish twice this week'],
  ['Naval Ravikant', 'How to get rich (without getting lucky)', 'Psychology', 'Specific knowledge, leverage, and long-term games create compounding returns.', 'The real goal is freedom: owning your time and creating without permission.', ['leverage', 'wealth', 'decision-making'], 'Escape competition', 'Write down one piece of specific knowledge only I can build on'],
  ['Think School', 'Why India is building differently', 'Indian Startups', 'India’s strongest startups win by combining trust, distribution, and local constraints.', 'Great strategy starts with the customer’s real-world friction.', ['india', 'startups', 'strategy'], 'Distribution is the moat', ''],
  ['Rajarshi Nandy', 'The inner technology of sadhana', 'Spirituality & Tantra', 'Practice becomes more important than spiritual collecting.', 'A conversation about devotion, discipline, and direct inner experience.', ['sadhana', 'tantra', 'practice'], 'Experience over collection', ''],
  ['The Diary of a CEO', 'The habits that make a meaningful life', 'Self Improvement', 'Self-respect grows from evidence, not affirmations.', 'A useful life is built through small promises kept repeatedly.', ['habits', 'identity', 'discipline'], 'Evidence over intention', '']
];
records.forEach(([creatorName, title, focusArea, centralThesis, summary, tags, ideaTitle, actionText]) => {
  const creatorId = new ObjectId(); const sourceId = new ObjectId(); const entryId = new ObjectId();
  db.creators.insertOne({ _id: creatorId, ownerId: 'local-owner', name: creatorName, type: 'channel', focusAreas: [focusArea], defaultTags: [], createdAt: now, updatedAt: now });
  db.sources.insertOne({ _id: sourceId, ownerId: 'local-owner', type: 'youtube', title, creatorName, creatorId, focusArea, rawText: `${centralThesis} ${summary}`, transcriptStatus: 'available', status: 'approved', ingestionMetadata: {}, createdAt: now, updatedAt: now });
  db.knowledgeentries.insertOne({ _id: entryId, ownerId: 'local-owner', sourceId, title, focusArea, status: 'distilled', centralThesis, summary, whyItMattersToMe: '', confidence: .6, tags, approvedAt: now, nextReviewAt: new Date(now.getTime() + 604800000), createdAt: now, updatedAt: now });
  db.ideas.insertOne({ knowledgeEntryId: entryId, title: ideaTitle, explanation: summary, evidenceChunkIds: [], timestampReferences: [], ideaType: 'principle', confidence: .6, approved: true, createdAt: now, updatedAt: now });
  if (actionText) db.actions.insertOne({ knowledgeEntryId: entryId, text: actionText, status: 'open', dueAt: now, reminderFrequency: 'weekly', createdAt: now, updatedAt: now });
});
