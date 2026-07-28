// Stands in for the real token verification: an Authorization header is a valid
// token, and it resolves to one test researcher. The claims must be set, since
// currentUser provisions the local user (and therefore the sample owner) from
// them; the real middleware is covered by src/auth/middleware.spec.ts.
vi.mock("../src/auth/middleware.ts", () => ({
  requireAuth: async (
    c: {
      req: { header: (name: string) => string | undefined };
      set: (key: string, value: unknown) => void;
    },
    next: () => Promise<void>,
  ) => {
    if (!c.req.header("Authorization"))
      return new Response(null, { status: 401 });
    c.set("jwtPayload", {
      sub: "test-sub",
      email: "test@example.com",
      given_name: "Test",
      family_name: "User",
    });
    await next();
  },
}));

// Read once at import, so clear an ambient value from the developer's shell
// before any test module loads, then again after a spec overrides it.
delete process.env.SAMPLE_SEARCH_FUZZY_THRESHOLD;

beforeEach(() => {
  delete process.env.SAMPLE_SEARCH_FUZZY_THRESHOLD;
});

afterEach(() => {
  vi.restoreAllMocks();
});
