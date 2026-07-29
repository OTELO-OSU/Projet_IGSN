export type RateLimitScope = "ip" | "user";

export type RateLimitRoute = {
  key: string;
  method: string;
  path: string;
  scope: RateLimitScope;
  points: number;
  duration: number;
};

const PUBLIC_READ = { scope: "ip", points: 50, duration: 60 } as const;
const ADMIN = { scope: "user", points: 100, duration: 60 } as const;
const ADMIN_WRITE = { scope: "user", points: 30, duration: 60 } as const;
// Its own literal, not ADMIN_WRITE: a 100 MB body (ATTACHMENT_MAX_BYTES) landing
// on the same volume as the database is a different risk from a row write. 20
// still lets one batch drop through in a single go.
const ADMIN_UPLOAD = { scope: "user", points: 20, duration: 60 } as const;

// Default budget per api route. `key` names the env overrides
// (RATE_LIMIT_<KEY>_POINTS / _DURATION, see config.ts).
//
// `GET /` is deliberately absent: it is the container healthcheck, polled every
// 10s by all three compose files, and must never be refused.
export const RATE_LIMIT_ROUTES: RateLimitRoute[] = [
  { key: "SAMPLES_LIST", method: "GET", path: "/samples", ...PUBLIC_READ },
  { key: "SAMPLES_GET", method: "GET", path: "/samples/:igsn", ...PUBLIC_READ },
  {
    key: "SAMPLES_ATTACHMENT_GET",
    method: "GET",
    path: "/samples/:igsn/attachments/:attachmentId",
    ...PUBLIC_READ,
  },
  { key: "ADMIN_ME", method: "GET", path: "/admin/me", ...ADMIN },
  {
    key: "ADMIN_SAMPLES_LIST",
    method: "GET",
    path: "/admin/samples",
    ...ADMIN,
  },
  {
    key: "ADMIN_SAMPLES_GET",
    method: "GET",
    path: "/admin/samples/:id",
    ...ADMIN,
  },
  {
    key: "ADMIN_SAMPLES_CREATE",
    method: "POST",
    path: "/admin/samples",
    ...ADMIN_WRITE,
  },
  {
    key: "ADMIN_SAMPLES_UPDATE",
    method: "PUT",
    path: "/admin/samples/:id",
    ...ADMIN_WRITE,
  },
  {
    key: "ADMIN_SAMPLES_PUBLISH",
    method: "POST",
    path: "/admin/samples/:id/publish",
    ...ADMIN_WRITE,
  },
  {
    key: "ADMIN_ATTACHMENT_CREATE",
    method: "POST",
    path: "/admin/samples/:id/attachments",
    ...ADMIN_UPLOAD,
  },
  {
    key: "ADMIN_ATTACHMENT_GET",
    method: "GET",
    path: "/admin/samples/:id/attachments/:attachmentId",
    ...ADMIN,
  },
];
