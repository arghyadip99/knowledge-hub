# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A "knowledge refinery": you capture podcasts/videos/articles/books, an OpenRouter-hosted model distills them into a reviewable AI draft (thesis, summary, ideas, quotes, actions), and nothing enters the searchable library until you explicitly approve it. See `README.md` for the full user-facing workflow and API reference — it's kept current and is the source of truth for HTTP endpoints and the capture-to-knowledge flow.

## Commands

This is an npm workspaces monorepo (`apps/api`, `apps/web`) with no root `node_modules` duplication.

```bash
npm install                    # from repo root, installs both workspaces
docker compose up mongo        # Mongo only, if you're running api/web outside Docker
npm run dev                    # runs api (tsx watch, :4000) and web (vite, :5173, proxies /api to :4000) concurrently
npm run build                  # tsc-builds api then builds web (tsc -b && vite build)
npm run seed                   # clears knowledge-hub collections and loads 5 example sources — dev only
docker compose up --build      # full stack: mongo (:27017), api (:4000), web (:8080)
```

Per-workspace commands (run with `-w @knowledge-hub/api` / `-w @knowledge-hub/web`, or `cd` into the app dir):
- `apps/api`: `npm run dev` (tsx watch), `npm run build` (tsc), `npm run start` (node dist), `npm run seed`
- `apps/web`: `npm run dev` (vite), `npm run build` (tsc -b && vite build), `npm run preview`

There is no lint script and no test suite configured in either workspace — `tsc`/`tsc -b` (strict TypeScript) is the only build-time check. Always run `npm run build` from the root after backend or frontend changes; it typechecks both workspaces and will catch drift between the API's response shapes and the web app's `src/types/knowledge.ts` contracts.

AI processing needs `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` set (get a free key at openrouter.ai/keys, pick a current `:free` model id from openrouter.ai/models?q=free — the free catalog rotates). Without them, `processSource` falls back to deterministic non-AI extraction rather than failing. `.env.example` lists all environment variables — copy relevant ones to `apps/api/.env` for local dev (`cp .env.example apps/api/.env`).

## Architecture

### Frontend (`apps/web/src`)

- `main.tsx` — React bootstrap only.
- `app/App.tsx` — owns the dashboard/library home screen and does the app's client-side route selection (`window.location.pathname` matched against `/`, `/ships`, `/actions`, `/sources`, `/sources/:id`, `/knowledge/:id`; no router library). It still contains most modal components (Capture, ShipManager, EditKnowledge, Quiz, ImportPreview, ArchiveLibrary, KnowledgeGraph) — the intended direction (see `docs/architecture.md`) is to extract these into `features/*` one at a time, not to keep adding to this file.
- `pages/` — route-level views resolved by `App.tsx`'s path match (`KnowledgePage`, `ShipsPage`, `ActionsPage`, `SourcesPage`, `SourceDetailPage`). `SourceDetailPage` is the capture → AI draft → approve/reject workflow: it triggers `POST /api/sources/:id/process`, polls while the source is `queued`/`processing` (progress lives on `source.ingestionMetadata.progress`), and on approval redirects to the resulting `/knowledge/:id`.
- `features/knowledge/` — reusable knowledge-specific UI (e.g. `ListenPanel` browser-speech reader, `EngagementPanel` resonate/comment/share, `NotificationPopover`).
- `features/auth/` — session storage (`session.ts`, a `knowledge-hub:auth` window event keeps `App`'s session state in sync) and `AuthPage`.
- `lib/api.ts` — the single typed HTTP client (`api<T>(path, options)`); attaches the bearer token from session storage, clears session on 401, and turns Zod validation error bodies (`body.issues.fieldErrors`) into a readable message.
- `types/knowledge.ts` — the frontend's contract for every API-shaped object (`Entry`, `Source`, `Idea`, `Action`, `Detail`, `Dashboard`, `Ship`, `Engagement`, ...). Update this whenever an API response shape changes.

New UI work should start in a feature folder and be composed by a page, per `docs/architecture.md`.

### Backend (`apps/api/src`)

- `index.ts` — process bootstrap only: connects the DB, starts listening.
- `app/createApp.ts` — configures Express and registers essentially the entire API surface as inline route handlers (no `routes/` module split yet, aside from `routes/authRoutes.ts`). `app.use("/api", requireAuth)` gates everything under `/api` except the intentionally-public `POST /api/v1/imports/knowledge`; a second middleware then requires `requireAdmin` for any non-GET request except notification-read and the resonate/comment/share engagement endpoints — readers can engage with published knowledge but not create/edit/archive it.
- `config/environment.ts` — env var interpretation.
- `http/` — `auth.ts` (the `requireAuth`/`requireAdmin` middleware and `AuthenticatedRequest` type), `validation.ts` (Zod schemas for request bodies), `routeUtils.ts` (`asyncRoute` wrapper, `compactPayload` to strip empty/undefined fields before a Mongo update).
- `database/` — connection lifecycle and one-off migrations (`migrations/`).
- `repositories/knowledgeRepository.ts` — the read-model joins for the library list and single-entry detail view (entry + source + ships + ideas + actions + engagement, or + quotes + reviews + connections for detail). Route handlers should call into here rather than composing multi-collection reads themselves.
- `models/Knowledge.ts` — every Mongoose schema in one file: `Creator`, `Ship`, `Source`, `TranscriptChunk`, `KnowledgeEntry`, `Idea`, `Action`, `Quote`, `Connection`, `AiRun`, `Review`, `QuizAttempt`, `ImportBatch`. Also `models/User.ts`, `models/Notification.ts`, `models/Engagement.ts`.
- `services/` — business workflows: `ingestion.ts` (YouTube oEmbed/transcript hydration + the chunk → candidate-extraction → synthesis distillation pipeline), `ai.ts` (calls OpenRouter's OpenAI-compatible `/chat/completions` with `response_format: json_object`, retries on 429/5xx, defensively strips markdown fences before `JSON.parse` since free models don't always respect JSON mode; plus deterministic fallback extraction/synthesis when OpenRouter is unavailable or unconfigured), `bulkImport.ts` (the curated ChatGPT-JSON import path), `auth.ts` (scrypt password hashing, a hand-rolled HMAC-signed JWT-shaped session token — no `jsonwebtoken` dependency), `notifications.ts`.
- `docs/openapi.ts` — hand-maintained OpenAPI doc served at `/api/docs` (Swagger UI) and `/api/docs/openapi.json`; it is not automatically kept in sync with `createApp.ts`; check both when adding/changing an endpoint if you touch docs.

Route handlers should validate input (via `http/validation.ts` schemas), delegate to a service/repository, and translate the result to HTTP — not contain migration logic or ad hoc multi-collection reads (per `docs/architecture.md`).

### Data model shape

`Source` (raw capture + ingestion status) → `KnowledgeEntry` (the approved/reviewable card, one-to-one with a source) → `Idea`/`Quote`/`Action` (atomic units belonging to an entry). `Ship` is a user-defined collection; entries reference `shipIds` (many-to-many). `Connection` links any two of source/entry/idea with a typed relationship (supports/contradicts/extends/applies_to/related_to) but currently has no UI to create them. `AiRun` is an audit trail per distillation attempt. `QuizAttempt`/`Review` back the active-recall and spaced-repetition features. This is a single-owner app (`ownerId` defaults to `"local-owner"`); the `admin`/`reader` role split is about read/write access for people you've shared the deployment with, not multi-tenant ownership.

### Deployment

Vercel serves the Vite build and routes `/api/*` to a serverless function (`api/index.js`) that imports the *built* Express app from `apps/api/dist` — so `npm run build` (which builds the API before the web app) must succeed for Vercel deploys to work, and API code changes aren't live until that dist output is rebuilt. Because AI processing is an HTTPS call to OpenRouter rather than a local process, it behaves the same in Vercel as it does locally — just make sure `OPENROUTER_API_KEY`/`OPENROUTER_MODEL` are set as Vercel env vars. Gemini/Groq adapters are stubbed as configured-but-unused (see `GET /api/config`) until implemented.
