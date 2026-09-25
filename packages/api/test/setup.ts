import type { KeycloakClaims } from "../src/auth/middleware.ts";

vi.mock("../src/auth/middleware.ts", async () => {
  const { tokenEmail } = await import("../src/tests/provision-user.ts");
  return {
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
        email: tokenEmail(sub),
        given_name: "Test",
        family_name: "User",
        identity_provider: "satosa",
      });
      await next();
    },
  };
});

vi.mock("../src/auth/active-session.ts", () => ({
  requireActiveSession: vi.fn(
    async (_c: unknown, next: () => Promise<void>) => {
      await next();
    },
  ),
}));

const clearEnvOverrides = () => {
  delete process.env.SAMPLE_SEARCH_FUZZY_THRESHOLD;
  delete process.env.TRUST_PROXY_HEADERS;
  delete process.env.OIDC_ALLOWED_IDENTITY_PROVIDERS;
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("RATE_LIMIT_") || key.startsWith("DATACITE_"))
      delete process.env[key];
  }
};

clearEnvOverrides();

beforeEach(clearEnvOverrides);

afterEach(() => {
  vi.restoreAllMocks();
});
