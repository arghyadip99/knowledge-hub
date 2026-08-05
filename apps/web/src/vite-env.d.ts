interface ImportMetaEnv { readonly VITE_GOOGLE_CLIENT_ID?: string; }
interface ImportMeta { readonly env: ImportMetaEnv; }
interface Window { google?: { accounts: { id: { initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void; prompt: () => void; } } }; }
