import { worker } from "./msw.ts";

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({ user: { access_token: "tok" } }),
}));

beforeAll(() => worker.start({ quiet: true }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
