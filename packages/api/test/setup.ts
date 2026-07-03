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

afterEach(() => {
  vi.restoreAllMocks();
});
