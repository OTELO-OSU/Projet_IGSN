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

  it("should keep only the OSUs whose name matches the search and record it in the URL", async () => {
    fakeApi();
    const { screen, router } = await renderRoute("/institutional-groups/osus");

    await screen
      .getByRole("searchbox", { name: "Search OSUs" })
      .fill("Grenoble");

    await expect
      .poll(() =>
        screen.getByRole("cell", { name: "OTELo", exact: true }).elements(),
      )
      .toHaveLength(0);
    await expect
      .element(screen.getByRole("cell", { name: "OSUG", exact: true }))
      .toBeVisible();
    expect(router.state.location.search).toEqual({ search: "Grenoble" });
  });

  it.each([
    { query: "OSUG", visible: "OSUG", hidden: "OMP" },
    { query: "midi-pyrenees", visible: "OMP", hidden: "OSUG" },
  ])(
    "should match an OSU by its code or its unaccented name ($query)",
    async ({ query, visible, hidden }) => {
      fakeApi();
      const { screen } = await renderRoute("/institutional-groups/osus");

      await screen.getByRole("searchbox", { name: "Search OSUs" }).fill(query);

      await expect
        .poll(() =>
          screen.getByRole("cell", { name: hidden, exact: true }).elements(),
        )
        .toHaveLength(0);
      await expect
        .element(screen.getByRole("cell", { name: visible, exact: true }))
        .toBeVisible();
    },
  );
});
