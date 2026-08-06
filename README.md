# Knowledge Hub — local AI knowledge refinery

Turn podcasts, videos, newsletters, books, and notes into knowledge you can use. You own every source: AI drafts the distillation, but nothing enters your approved library until you review it.

## Start locally

```bash
docker compose up --build
```

Open [the dashboard](http://localhost:8080). MongoDB runs on `27017`; the API is on `4000`.

For AI processing, install [Ollama](https://ollama.com) on your machine and download a model:

```bash
ollama pull qwen2.5:7b
```

The API automatically connects to Ollama at `http://host.docker.internal:11434` from Docker. Alternatively start an Ollama container with `docker compose --profile ollama up -d`, then pull a model inside it. Use a local model by default: transcripts remain on your computer and there is no per-request charge.

## Capture-to-knowledge workflow

1. Select **Capture knowledge** and paste a YouTube URL, article URL, newsletter text, book excerpt, or note.
2. The source is placed in your private review queue. For YouTube, the app attempts metadata and caption retrieval; paste a transcript if captions are unavailable.
3. Select **Create AI draft**. Ollama extracts a thesis, summary, ideas, tags, quotes, and actions.
4. Inspect the draft and choose **Approve knowledge**. Only then does it join your searchable library and review cycle.

For a long podcast, the app splits the complete transcript into small sections, extracts evidence-backed candidates from every section, then ranks, deduplicates, and synthesizes up to 20 durable ideas. Processing progress and the number of candidates are visible in the review screen. If Ollama is temporarily unavailable, the source stays useful: a clearly marked low-confidence fallback draft is generated from every transcript section, never invented facts.

## Connect to MongoDB locally

MongoDB is published by Docker on your host machine. Use this connection string in MongoDB Compass or another client:

```text
mongodb://127.0.0.1:27017/knowledge-hub
```

Application authentication is enabled even locally. If the `mongosh` command is unavailable, install MongoDB Shell or use MongoDB Compass; the database itself is still reachable on port `27017`.

## Accounts and access

The first account created in an empty local database becomes the **admin**. Every account created afterwards is a **reader**: it can view published (`distilled` or `applied`) knowledge but cannot create, edit, archive, or review content. The curated bulk import endpoint remains unauthenticated by request.

Email/password accounts use a salted, memory-hard password hash; sessions are signed and expire after seven days. Set a unique `JWT_SECRET` in `.env` before using any non-local environment.

To enable Google sign-in, create a Google OAuth **Web application** client with `http://localhost:8080` as an authorised JavaScript origin, then set `GOOGLE_CLIENT_ID` in `.env` and rebuild:

```bash
docker compose up --build
```

The Google button remains hidden until that value is set. Google authentication is optional; username/password signup works without it.

## Data model

The MongoDB domain is deliberately split so original evidence and personal knowledge never get confused:

- `sources`: URLs, uploads/text, creator metadata, owner workflow, and ingest status.
- `creators`: people, channels, and publications.
- `transcriptchunks`: timestamp-ready, searchable source evidence.
- `knowledgeentries`: approved thesis, summary, tags, status, and review dates.
- `ideas`, `quotes`, `actions`: atomic, reviewable knowledge units.
- `connections`: explicit relationships between sources, entries, and ideas.
- `airuns`: provider/model/prompt audit trail and failures.
- `reviews`: reflections and spaced-repetition review history.

## API

### Manual bulk imports

Use `POST /api/v1/imports/knowledge` to import a fully curated source in one request. One request may contain up to 25 imports; each source can include up to 50 ordered lessons, 20 quotes, and 20 actions. This specific endpoint intentionally does not require authentication so it stays easy to use from your manual ChatGPT workflow; protect the local API port if other people can reach your machine.

Open interactive Swagger documentation at `http://localhost:4000/api/docs` or retrieve the OpenAPI document from `/api/docs/openapi.json`.

The ready-to-copy ChatGPT extraction contract is in [docs/chatgpt-import-template.md](docs/chatgpt-import-template.md).

### Sources and AI workflow

- `GET/POST /api/sources`
- `GET/PATCH/DELETE /api/sources/:id`
- `POST /api/sources/:id/process` — queue local AI distillation
- `POST /api/sources/:id/approve`
- `POST /api/sources/:id/reject`

### Knowledge and reminders

- `GET /api/knowledge?area=&status=&search=`
- `GET/PATCH /api/knowledge/:id`
- `POST /api/knowledge/:id/actions`
- `POST /api/knowledge/:id/reviews`
- `GET /api/actions?status=` — list actions with their parent card title
- `PATCH /api/actions/:id`
- `GET /api/reminders`
- `GET /api/dashboard`, `GET /api/config`, `GET /api/creators`
- `POST/PATCH/DELETE /api/creators`
- `GET/POST/PATCH/DELETE /api/connections`

## Local development

```bash
cp .env.example apps/api/.env
npm install
docker compose up mongo
npm run dev
```

Run `npm run seed` to reset the local data with five example sources. This command clears the knowledge-hub collections first, so use it only for development.

## Deploy to Vercel

The Vercel deployment serves the Vite dashboard and the Express API from one
project. Before deploying, create a hosted MongoDB database (such as MongoDB
Atlas) and add these Vercel environment variables:

```text
MONGO_URI=<your hosted MongoDB connection string>
JWT_SECRET=<a long, random secret>
```

Optional Google sign-in also needs `GOOGLE_CLIENT_ID` (API) and
`VITE_GOOGLE_CLIENT_ID` (web build), with the Vercel domain listed as an
authorised JavaScript origin in Google Cloud. Deploy from the repository root;
Vercel runs `npm run build` and routes `/api/*` to the serverless API.

Vercel cannot reach an Ollama instance on your computer. In production,
AI-draft processing safely falls back to extraction from the supplied source
text until a cloud AI provider adapter is configured.

## AI provider strategy

Ollama is implemented as the local default. The API exposes configuration state for Gemini and Groq, but they are intentionally not used until their secure provider adapters are enabled and you add keys locally. This preserves the local-first guarantee and avoids silently sending private transcripts to a cloud provider.
