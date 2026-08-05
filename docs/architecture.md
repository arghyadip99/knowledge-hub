# Knowledge Hub architecture

## Frontend

- `src/main.tsx` is intentionally only the React bootstrap.
- `src/app/App.tsx` owns the current home-screen composition and route selection.
- `src/pages/` contains route-level views: the library's full knowledge reader and Ship Command Center.
- `src/features/knowledge/` contains reusable knowledge-specific UI such as the browser speech player.
- `src/lib/` contains infrastructure shared by UI features, currently the typed HTTP client.
- `src/types/` is the single frontend contract for API-shaped knowledge data.

New UI work should begin in a feature folder and be composed by a page, rather than being added to the entry point.

## Backend

- `src/index.ts` is process bootstrap only: it connects the database and starts HTTP listening.
- `src/app/createApp.ts` configures Express and registers the current API surface.
- `src/config/` owns environment interpretation.
- `src/http/` owns validation and route mechanics.
- `src/database/` owns Mongo connection lifecycle and data migrations.
- `src/repositories/` owns read models and database query composition.
- `src/models/` defines Mongo collections and indexes.
- `src/services/` implements ingestion, AI processing, and bulk-import business workflows.

Route handlers should validate input, call a service/repository, and translate the result into HTTP. They should not contain migration logic or multi-collection read composition.

## Next extraction slices

`App.tsx` still contains the established home-screen modal components to preserve behavior during this refactor. Extract them one feature at a time into `features/capture`, `features/ships`, `features/quiz`, and `features/library`; each should export a focused component plus any local hooks. The API can follow the same safe pattern by moving endpoint groups from `createApp.ts` into `routes/` modules without changing paths or payloads.
