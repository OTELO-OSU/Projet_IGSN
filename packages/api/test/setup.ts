vi.mock("../src/auth/middleware.ts", () => ({
  requireAuth: async (
    c: { req: { header: (name: string) => string | undefined } },
    next: () => Promise<void>,
  ) => {
    if (!c.req.header("Authorization"))
      return new Response(null, { status: 401 });
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
