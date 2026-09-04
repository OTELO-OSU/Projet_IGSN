import { NO_MANAGED_GROUPS } from "@projet-igsn/domain/user/managed-groups";
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
      profile: { identity_provider: "satosa", name: "Marie Dupont" },
    },
  }),
}));

const ACCOUNT = {
  id: "3f2504e0-4f89-41d3-9a0c-030500000b01",
  name: "Gaia harvester",
  institutionalOrganization: "04vfs2w97",
  institutionalOsu: null,
  institutionalLaboratory: "UMR7358",
  managedGroups: NO_MANAGED_GROUPS,
};

function fakeApi({ superAdmin = true }: { superAdmin?: boolean } = {}) {
  fakeCurrentUser({ superAdmin });
  worker.use(
    http.get("*/admin/samples", () =>
      HttpResponse.json({ data: [], meta: { total: 0 } }),
    ),
    http.get("*/admin/service-accounts", () =>
      HttpResponse.json({ data: [ACCOUNT], meta: { total: 1 } }),
    ),
  );
}

describe("ServiceAccountsPage", () => {
  it("should list every service account with its name and its institution", async () => {
    fakeApi();

    const { screen } = await renderRoute("/service-accounts");

    await expect
      .element(screen.getByRole("cell", { name: "Gaia harvester" }))
      .toBeVisible();
    await expect
      .element(
        screen.getByRole("cell", { name: "Université de Lorraine CRPG" }),
      )
      .toBeVisible();
  });

  it("should send a caller who is not a super admin back to the samples", async () => {
    fakeApi({ superAdmin: false });

    const { router } = await renderRoute("/service-accounts");

    await expect.poll(() => router.state.location.pathname).toBe("/");
  });
});
