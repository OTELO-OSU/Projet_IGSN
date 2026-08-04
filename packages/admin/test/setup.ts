import { worker } from "./msw.ts";

// Default signed-in stub for every admin spec; a spec needing a richer auth
// shape (profile, loading states) registers its own vi.mock, which wins.
vi.mock("react-oidc-context", () => ({
  useAuth: () => ({ user: { access_token: "tok" } }),
}));

beforeAll(() => worker.start({ quiet: true }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
