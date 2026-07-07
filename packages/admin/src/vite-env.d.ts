/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_FRONTEND_URL?: string;
  readonly VITE_OIDC_AUTHORITY?: string;
  readonly VITE_OIDC_CLIENT_ID?: string;
  readonly VITE_RENEW_IDLE_CUTOFF_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
