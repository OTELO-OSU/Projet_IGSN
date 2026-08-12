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
      profile: { identity_provider: "shibboleth", name: "Marie Dupont" },
    },
  }),
}));

function fakeApi() {
  fakeCurrentUser({ superAdmin: true });
  worker.use(
    http.get("*/admin/users", () =>
      HttpResponse.json({ data: [], meta: { total: 0 } }),
    ),
  );
}

const LORRAINE = "Université de Lorraine";
const CNRS = "Centre National de la Recherche Scientifique (CNRS)";

describe("OsusPage", () => {
  it("should keep only the OSUs of the chosen organization", async () => {
    fakeApi();
    const { screen } = await renderRoute("/institutional-groups/osus");

    await screen.getByRole("combobox", { name: "Organization" }).click();
    await screen.getByPlaceholder("Search organizations...").fill(LORRAINE);
    await screen.getByRole("option", { name: LORRAINE }).click();

    await expect
      .element(screen.getByRole("cell", { name: "OTELo", exact: true }))
      .toBeVisible();
    expect(
      screen.getByRole("cell", { name: "OSUG", exact: true }).elements(),
    ).toHaveLength(0);
  });

  it("should list every organization of an OSU in the table", async () => {
    fakeApi();
    const { screen } = await renderRoute(
      "/institutional-groups/osus?organization=04vfs2w97",
    );

    await expect
      .element(screen.getByRole("cell", { name: CNRS }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("cell", { name: LORRAINE }))
      .toBeVisible();
  });

  it("should list every organization of an OSU on its detail page", async () => {
    fakeApi();
    const { screen } = await renderRoute("/institutional-groups/osus/OTELo");

    await expect.element(screen.getByText(CNRS)).toBeVisible();
    await expect.element(screen.getByText(LORRAINE)).toBeVisible();
  });
});
