import { toast } from "@projet-igsn/design-system/components/ui/sonner";

import { worker } from "./msw.ts";

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({ user: { access_token: "tok" } }),
}));

beforeAll(() => worker.start({ quiet: true }));

afterEach(() => {
  localStorage.clear();
  toast.dismiss();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
