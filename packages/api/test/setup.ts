// Verifying a real Keycloak token needs a live JWKS, so requireAuth is stubbed
// suite-wide to gate on the presence of an Authorization header: tests care about
// authenticated-vs-not, not the signature check (covered by hono/jwk).
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
