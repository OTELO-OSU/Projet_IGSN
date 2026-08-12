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

describe("OsusPage", () => {
  it("should keep only the OSUs of the chosen organization", async () => {
    fakeApi();
    const { screen } = await renderRoute("/institutional-groups/osus");

    await screen.getByRole("combobox", { name: "Organization" }).click();
    const insu = "Institut national des sciences de l'Univers (CNRS - INSU)";
    await screen.getByPlaceholder("Search organizations...").fill(insu);
    await screen.getByRole("option", { name: insu }).click();

    await expect
      .element(screen.getByRole("cell", { name: "OSUG", exact: true }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("cell", { name: "OSUR", exact: true }))
      .toBeVisible();
    expect(
      screen.getByRole("cell", { name: "OTELo", exact: true }).elements(),
    ).toHaveLength(0);
  });
});
