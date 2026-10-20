/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_ADMIN_URL?: string;
  readonly VITE_FRONTEND_URL?: string;
  readonly VITE_DATA_GOUV_DATASET_URL?: string;
  readonly VITE_DEMO_BANNER?: string;
  readonly VITE_SEARCH_EXPORT_LIMIT?: string;
  readonly VITE_OIDC_AUTHORITY?: string;
  readonly VITE_OIDC_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ponytail: only the one server-side var we read during SSR; drop if @types/node
// is ever added.
declare const process: { readonly env: { readonly API_URL?: string } };
