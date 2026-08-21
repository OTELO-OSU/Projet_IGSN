import type { CurrentUser } from "@projet-igsn/domain/user/current-user";

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

const BASALT = {
  id: "3f2504e0-4f89-41d3-9a0c-0305000000a1",
  name: "Basalt team",
  memberCount: 2,
};
const METEORITE = {
  id: "3f2504e0-4f89-41d3-9a0c-0305000000a2",
  name: "Meteorite crew",
  memberCount: 5,
};

function fakeApi({
  groups = [BASALT, METEORITE],
  caller = { superAdmin: true },
}: { groups?: (typeof BASALT)[]; caller?: Partial<CurrentUser> } = {}) {
  let listed = [...groups];
  const requested: string[] = [];
  fakeCurrentUser(caller);
  worker.use(
    http.post("*/admin/manual-groups", async ({ request }) => {
      const { name } = (await request.json()) as { name: string };
      const created = {
        id: "3f2504e0-4f89-41d3-9a0c-0305000000b1",
        name,
        memberCount: 0,
      };
      listed = [...listed, created];
      return HttpResponse.json({ data: created }, { status: 201 });
    }),
    http.get("*/admin/manual-groups", ({ request }) => {
      const url = new URL(request.url);
      requested.push(url.search);
      const search = (url.searchParams.get("search") ?? "").toLowerCase();
      const matching = listed.filter((group) =>
        group.name.toLowerCase().includes(search),
      );
      return HttpResponse.json({
        data: matching,
        meta: { total: matching.length },
      });
    }),
  );
  return { requested };
}

describe("ManualGroupsPage", () => {
  it("should narrow the list to the searched name and record it in the URL", async () => {
    const { requested } = fakeApi();

    const { screen, router } = await renderRoute("/manual-groups");
    await expect
      .element(screen.getByRole("cell", { name: "Basalt team" }))
      .toBeVisible();

    await screen
      .getByRole("searchbox", { name: "Search manual groups" })
      .fill("Meteorite");

    await expect
      .element(screen.getByRole("cell", { name: "Meteorite crew" }))
      .toBeVisible();
    await expect
      .poll(() => screen.getByRole("cell", { name: "Basalt team" }).elements())
      .toHaveLength(0);
    await expect
      .poll(() => router.state.location.search)
      .toMatchObject({ page: 1, search: "Meteorite" });
    expect(requested.at(-1)).toContain("search=Meteorite");
  });

  it("should add the created group to the list", async () => {
    fakeApi();

    const { screen } = await renderRoute("/manual-groups");
    await screen.getByRole("button", { name: "New manual group" }).click();
    await screen.getByLabelText("Group name").fill("Andesite lab");
    await screen.getByRole("button", { name: "Create", exact: true }).click();

    await expect
      .element(screen.getByRole("cell", { name: "Andesite lab" }))
      .toBeVisible();
  });

  it("should say the registry is empty rather than show a bare table", async () => {
    fakeApi({ groups: [] });

    const { screen } = await renderRoute("/manual-groups");

    await expect
      .element(screen.getByRole("cell", { name: "No manual groups" }))
      .toBeVisible();
  });

  it("should offer no group creation to a manual group manager", async () => {
    fakeApi({ groups: [BASALT], caller: { managedManualGroups: [BASALT] } });

    const { screen } = await renderRoute("/manual-groups");

    await expect
      .element(screen.getByRole("cell", { name: "Basalt team" }))
      .toBeVisible();
    expect(
      screen.getByRole("button", { name: "New manual group" }).elements(),
    ).toEqual([]);
  });
});
