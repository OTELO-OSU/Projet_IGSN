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

function fakeApi() {
  fakeCurrentUser({ superAdmin: true });
  worker.use(
    http.get("*/admin/users/institutional-counts", () =>
      HttpResponse.json({
        data: { organizations: {}, osus: {}, laboratories: {} },
      }),
    ),
    http.get("*/admin/institutional-groups/manager-counts", () =>
      HttpResponse.json({
        data: {
          organizations: { "04vfs2w97": 2 },
          osus: {},
          laboratories: {},
        },
      }),
    ),
    http.get("*/admin/users", () =>
      HttpResponse.json({ data: [], meta: { total: 0 } }),
    ),
  );
}

const LORRAINE = "Université de Lorraine";
const CNRS = "Centre National de la Recherche Scientifique";

describe("OrganizationsPage", () => {
  it("should show the active manager count of every organization, zero warned", async () => {
    fakeApi();

    const { screen } = await renderRoute("/institutional-groups/organizations");

    await expect
      .element(
        screen
          .getByRole("row", { name: new RegExp(LORRAINE) })
          .getByRole("cell", { name: "2", exact: true }),
      )
      .toBeVisible();
    await expect
      .element(
        screen
          .getByRole("row", { name: /02feahw73/ })
          .getByRole("cell", { name: "0 (no active manager)" }),
      )
      .toBeVisible();
  });

  it("should keep only the organizations without active manager and record the filter in the URL", async () => {
    fakeApi();

    const { screen, router } = await renderRoute(
      "/institutional-groups/organizations",
    );
    await screen.getByRole("button", { name: "Add a filter" }).click();
    await screen
      .getByRole("button", { name: "Without active manager" })
      .click();
    await screen
      .getByRole("switch", { name: "Without active manager" })
      .click();

    await expect
      .poll(() => screen.getByRole("cell", { name: LORRAINE }).elements())
      .toHaveLength(0);
    await expect
      .element(screen.getByRole("cell", { name: CNRS, exact: true }))
      .toBeVisible();
    await expect
      .poll(() => router.state.location.search)
      .toEqual({ noManager: true });
  });
});
