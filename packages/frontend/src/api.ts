// The browser reaches the api at its public URL (VITE_API_URL, baked at build);
// during SSR the frontend server reaches it on the internal network (API_URL,
// read at runtime). In docker dev these differ: localhost:3002 vs api:3002.
export const apiUrl =
  (import.meta.env.SSR ? process.env.API_URL : import.meta.env.VITE_API_URL) ??
  "http://localhost:3002";

export const baseApiUrl = apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`;
