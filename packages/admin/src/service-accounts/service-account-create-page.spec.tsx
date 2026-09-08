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
const OWNER_ID = "3f2504e0-4f89-41d3-9a0c-030500000c01";

const OWNER = {
  id: OWNER_ID,
  email: "jean.martin@univ-lorraine.fr",
  name: "Martin",
  firstname: "Jean",
  orcid: null,
};

const REQUEST = {
  name: "Gaia harvester",
  institutionalOrganization: "04vfs2w97",
  institutionalOsu: null,
  institutionalLaboratory: "UMR7358",
  managedGroups: { ...NO_MANAGED_GROUPS, laboratories: ["UMR7358"] },
  owner: OWNER,
};

const CRPG =
  "Centre de recherches pétrographiques et géochimiques (CRPG) (UMR7358)";

function fakeApi() {
  const posts: unknown[] = [];
  fakeCurrentUser({ superAdmin: true });
  worker.use(
    http.get("*/admin/manual-groups", () =>
      HttpResponse.json({ data: [], meta: { total: 0 } }),
    ),
    http.get("*/admin/service-accounts/:id", () =>
      HttpResponse.json({
        data: { id: ACCOUNT_ID, ...REQUEST, owner: OWNER },
      }),
    ),
    http.post("*/admin/service-accounts", async ({ request }) => {
      posts.push(await request.json());
      return HttpResponse.json({
        data: { id: ACCOUNT_ID, ...REQUEST, owner: OWNER },
      });
    }),
  );
  return { posts };
}

const createPage = (request: unknown) =>
  renderRoute(
    `/service-accounts/create?request=${encodeURIComponent(JSON.stringify(request))}`,
  );

describe("ServiceAccountCreatePage", () => {
  it("should prefill the name, the institution, the managed groups and the requester from the request link", async () => {
    fakeApi();

    const { screen } = await createPage(REQUEST);

    await expect
      .element(screen.getByRole("textbox", { name: "Service name" }))
      .toHaveValue("Gaia harvester");
    await expect
      .element(screen.getByRole("combobox", { name: /^Organization/ }))
      .toHaveTextContent("Université de Lorraine");
    await expect
      .element(screen.getByRole("combobox", { name: /^Laboratory/ }))
      .toHaveTextContent("Centre de recherches pétrographiques");
    await expect
      .element(screen.getByRole("button", { name: `Remove ${CRPG}` }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("combobox", { name: /^Requested by/ }))
      .toHaveTextContent("Jean Martin");
  });

  it("should create the account with the requester as ownerId", async () => {
    const { posts } = fakeApi();

    const { screen, router } = await createPage(REQUEST);
    await screen.getByRole("button", { name: "Create" }).click();

    await expect
      .poll(() => posts)
      .toEqual([
        {
          name: "Gaia harvester",
          institutionalOrganization: "04vfs2w97",
          institutionalOsu: null,
          institutionalLaboratory: "UMR7358",
          managedGroups: { ...NO_MANAGED_GROUPS, laboratories: ["UMR7358"] },
          ownerId: OWNER_ID,
        },
      ]);
    await expect
      .poll(() => router.state.location.pathname)
      .toBe(`/service-accounts/${ACCOUNT_ID}`);
  });

  it("should refuse to create an account without a requester", async () => {
    const { posts } = fakeApi();

    const { screen } = await createPage({ ...REQUEST, owner: null });
    await screen.getByRole("button", { name: "Create" }).click();

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent("Choose the user this service account belongs to");
    expect(posts).toEqual([]);
  });
});
