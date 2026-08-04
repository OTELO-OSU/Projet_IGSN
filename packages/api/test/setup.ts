import type { KeycloakClaims } from "../src/auth/middleware.ts";

// Stands in for the real token verification: an Authorization header is a valid
// token, and the bearer value stands for the user. The claims must be set, since
// currentUser provisions the local user (and therefore the sample owner) from
// them, and the sub-keyed rate limiter needs distinct tokens to be distinct
// users; the real middleware is covered by src/auth/middleware.spec.ts.
vi.mock("../src/auth/middleware.ts", () => ({
  requireAuth: async (
    c: {
      req: { header: (name: string) => string | undefined };
      set: (key: "jwtPayload", value: KeycloakClaims) => void;
    },
    next: () => Promise<void>,
  ) => {
    const authorization = c.req.header("Authorization");
    if (!authorization) return new Response(null, { status: 401 });
    const sub = authorization.replace("Bearer ", "");
    c.set("jwtPayload", {
      sub,
      email: `${sub}@example.com`,
      given_name: "Test",
      family_name: "User",
    });
    await next();
  },
}));

// Keycloak's userinfo endpoint is unreachable in tests, so the live-session
// guard passes through; a spec needing a revoked session overrides it with
// mockImplementationOnce. The real guard is covered by active-session.spec.ts.
vi.mock("../src/auth/active-session.ts", () => ({
  requireActiveSession: vi.fn(
    async (_c: unknown, next: () => Promise<void>) => {
      await next();
    },
  ),
}));

// Read once at import, so clear an ambient value from the developer's shell
// before any test module loads, then again after a spec overrides it.
// RATE_LIMIT_* goes by prefix: a shell carrying RATE_LIMIT_ENABLED=false (what
// the e2e stack sets) would otherwise disable the limiter under test silently.
const clearEnvOverrides = () => {
  delete process.env.SAMPLE_SEARCH_FUZZY_THRESHOLD;
  delete process.env.TRUST_PROXY_HEADERS;
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("RATE_LIMIT_")) delete process.env[key];
  }
};

clearEnvOverrides();

beforeEach(clearEnvOverrides);

afterEach(() => {
  vi.restoreAllMocks();
});
