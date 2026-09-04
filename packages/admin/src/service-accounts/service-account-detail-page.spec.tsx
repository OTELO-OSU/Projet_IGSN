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

const ACCOUNT_ID = "3f2504e0-4f89-41d3-9a0c-030500000b01";

const ACCOUNT = {
  id: ACCOUNT_ID,
  name: "Gaia harvester",
  institutionalOrganization: "04vfs2w97",
  institutionalOsu: null,
  institutionalLaboratory: "UMR7358",
  managedGroups: NO_MANAGED_GROUPS,
};

const CRPG =
  "Centre de recherches pétrographiques et géochimiques (CRPG) (UMR7358)";
const MANAGED_SEARCH = "Search by name or identifier";

function fakeApi({ nameTaken = false }: { nameTaken?: boolean } = {}) {
  const calls: unknown[] = [];
  fakeCurrentUser({ superAdmin: true });
  worker.use(
    http.get("*/admin/manual-groups", () =>
      HttpResponse.json({ data: [], meta: { total: 0 } }),
    ),
    http.get("*/admin/service-accounts/:id", () =>
      HttpResponse.json({ data: ACCOUNT }),
    ),
    http.get("*/admin/service-accounts", () =>
      HttpResponse.json({ data: [ACCOUNT], meta: { total: 1 } }),
    ),
    http.put("*/admin/service-accounts/:id", async ({ request }) => {
      const body = await request.json();
      calls.push({ method: "PUT", body });
      if (nameTaken) {
        return HttpResponse.json({ reason: "name_taken" }, { status: 409 });
      }
      return HttpResponse.json({ data: { ...ACCOUNT, ...(body as object) } });
    }),
    http.delete("*/admin/service-accounts/:id", () => {
      calls.push({ method: "DELETE" });
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return { calls };
}

describe("ServiceAccountDetailPage", () => {
  it("should save the name, the institution trio and the managed groups in one request", async () => {
    const { calls } = fakeApi();

    const { screen } = await renderRoute(`/service-accounts/${ACCOUNT_ID}`);
    await screen
      .getByRole("textbox", { name: "Service name" })
      .fill("Gaia reader");
    await screen
      .getByRole("combobox", { name: "Managed laboratories" })
      .click();
    await screen.getByPlaceholder(MANAGED_SEARCH).fill("UMR7358");
    await screen.getByRole("option", { name: CRPG }).click();
    await screen.getByRole("button", { name: "Save" }).click();

    await expect
      .poll(() => calls)
      .toEqual([
        {
          method: "PUT",
          body: {
            name: "Gaia reader",
            institutionalOrganization: "04vfs2w97",
            institutionalOsu: null,
            institutionalLaboratory: "UMR7358",
            managedGroups: { ...NO_MANAGED_GROUPS, laboratories: ["UMR7358"] },
          },
        },
      ]);
  });

  it("should flag the name as taken when the api refuses it", async () => {
    fakeApi({ nameTaken: true });

    const { screen } = await renderRoute(`/service-accounts/${ACCOUNT_ID}`);
    await screen
      .getByRole("textbox", { name: "Service name" })
      .fill("Gaia reader");
    await screen.getByRole("button", { name: "Save" }).click();

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent("This name is already taken");
    await expect
      .element(screen.getByRole("textbox", { name: "Service name" }))
      .toBeInvalid();
  });

  it("should delete the account and go back to the list once the phrase is typed", async () => {
    const { calls } = fakeApi();

    const { screen, router } = await renderRoute(
      `/service-accounts/${ACCOUNT_ID}`,
    );
    await screen
      .getByRole("button", { name: "Delete this service account" })
      .click();
    await screen.getByLabelText("Type DELETE to confirm").fill("DELETE");
    await screen.getByRole("button", { name: "Delete", exact: true }).click();

    await expect
      .poll(() => router.state.location.pathname)
      .toBe("/service-accounts");
    expect(calls).toEqual([{ method: "DELETE" }]);
  });
});
