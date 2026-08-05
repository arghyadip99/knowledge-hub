# Manual knowledge extraction prompt

Copy this prompt into ChatGPT after providing a podcast transcript, notes, or a public source summary. Replace the bracketed source details.

```text
Act as a rigorous editor for my personal knowledge hub. Extract only ideas supported by the supplied source. Ignore filler, repetition, intros, advertisements, and generic motivation. Do not invent facts, quotes, timestamps, speakers, or advice.

Return ONLY valid JSON. No Markdown fences, explanations, or comments. It must exactly match this shape:

{
  "apiVersion": "v1",
  "continueOnError": true,
  "imports": [
    {
      "origin": "manual-chatgpt",
      "source": {
        "type": "youtube",
        "title": "[exact episode title]",
        "url": "[source URL]",
        "creator": "[creator or channel]",
        "publisher": "[optional publisher]",
        "publishedAt": "[optional ISO timestamp]",
        "durationSeconds": 0,
        "language": "en",
        "focusArea": "Optional legacy category; omit this for new imports"
      },
      "knowledge": {
        "centralThesis": "A precise one- or two-sentence thesis.",
        "summary": "A concise, evidence-grounded 1–3 paragraph summary.",
        "whyItMattersToMe": "Optional personal relevance; leave empty if unknown.",
        "tags": ["decision-making", "wealth"],
        "status": "distilled"
      },
      "lessons": [
        {
          "title": "A short, durable lesson title",
          "explanation": "Explain the lesson clearly, accurately, and concretely.",
          "type": "principle",
          "importance": 4,
          "confidence": 0.9,
          "evidence": "A short supporting quote or faithful source excerpt.",
          "timestamp": { "startSeconds": 0, "endSeconds": 0, "label": "00:00" },
          "practicalApplication": "A specific way to test or use this idea.",
          "tags": ["tag-one", "tag-two"],
          "approved": true
        }
      ],
      "quotes": [
        {
          "text": "Exact quote only when it is present in the source.",
          "speaker": "Name only if known from the source.",
          "context": "Why this quote matters.",
          "timestamp": { "startSeconds": 0, "endSeconds": 0, "label": "00:00" },
          "approved": true
        }
      ],
      "actions": [
        {
          "text": "A small, testable action.",
          "reminderFrequency": "weekly",
          "lessonIndex": 0
        }
      ]
    }
  ]
}

Rules:
- Return 8–20 lessons for a substantial podcast; fewer for a short source.
- Use importance 5 only for exceptional, high-leverage insights.
- Use a timestamp only when it is known. Omit the timestamp object otherwise.
- Keep timestamps in seconds, not `HH:MM:SS` strings.
- Ships are deliberately owner-managed. Imports leave cards unassigned; use the card menu to flag them into a Ship you have created and captained.
- `reminderFrequency` is also a free-form label, for example `quarterly`, `weekly`, or `after next viewing`.
- Use only these lesson types: principle, framework, claim, question, story, protocol.
- `lessonIndex` is zero-based: 0 refers to the first lesson.
```

## Send the JSON to the API

```bash
curl -X POST http://localhost:4000/api/v1/imports/knowledge \
  -H 'Content-Type: application/json' \
  --data-binary @podcast.json
```

Open the interactive contract at `http://localhost:4000/api/docs`.
