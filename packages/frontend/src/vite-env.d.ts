/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_ADMIN_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ponytail: only the one server-side var we read during SSR; drop if @types/node
// is ever added to this app's `types`.
declare const process: { readonly env: { readonly API_URL?: string } };
