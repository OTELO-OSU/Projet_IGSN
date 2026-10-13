import { HttpResponse, http } from "msw";
import { vi } from "vitest";

import { fakeCurrentUser } from "../../test/fake-current-user.ts";
import { worker } from "../../test/msw.ts";
import { renderRoute } from "../../test/render-route.tsx";

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({
    isLoading: false,
    isAuthenticated: true,
    user: {
      access_token: "tok",
      profile: { identity_provider: "renater", name: "Marie Dupont" },
    },
  }),
}));

describe("admin-only routes", () => {
  it.each([
    ["a researcher", "/manual-groups", {}],
    ["a researcher", "/institutional-groups/organizations", {}],
    [
      "a space manager",
      "/service-accounts",
      { managedLaboratories: ["UMR7358"] },
    ],
    [
      "a manual group manager",
      "/users/3f2504e0-4f89-41d3-9a0c-030500000099",
      {
        managedManualGroups: [
          { id: "3f2504e0-4f89-41d3-9a0c-030500000020", name: "Basalt" },
        ],
      },
    ],
  ])(
    "should send %s away from %s to the home page",
    async (_caller, url, overrides) => {
      fakeCurrentUser(overrides);
      worker.use(
        http.get("*/admin/samples", () =>
          HttpResponse.json({ data: [], meta: { total: 0 } }),
        ),
        http.get("*/admin/currentUser/manual-groups", () =>
          HttpResponse.json({ data: [] }),
        ),
        http.get("*/admin/currentUser/attachable-manual-groups", () =>
          HttpResponse.json({ data: [] }),
        ),
      );

      const { router } = await renderRoute(url);

      await expect.poll(() => router.state.location.pathname).toBe("/");
    },
  );
});
