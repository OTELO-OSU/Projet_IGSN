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

const JEAN = {
  id: "3f2504e0-4f89-41d3-9a0c-0305000000d1",
  email: "jean.martin@example.org",
  name: "Martin",
  firstname: "Jean",
  orcid: null,
};

const NAMELESS = {
  id: "3f2504e0-4f89-41d3-9a0c-0305000000d2",
  email: "anonyme@example.org",
  name: null,
  firstname: null,
  orcid: null,
};

const SELF = {
  id: "3f2504e0-4f89-41d3-9a0c-0305000000d4",
  email: "marie.dupont@example.org",
  name: "Dupont",
  firstname: "Marie",
  orcid: null,
};

const PENDING = {
  id: "3f2504e0-4f89-41d3-9a0c-0305000000d3",
  email: "wait@example.org",
  name: "Waiting",
  firstname: "Willy",
  orcid: null,
};

function fakeApi({
  groups = [BASALT, METEORITE],
  caller = { superAdmin: true },
}: { groups?: (typeof BASALT)[]; caller?: Partial<CurrentUser> } = {}) {
  let listed = [...groups];
  const requested: string[] = [];
  const requestedGroups: unknown[] = [];
  fakeCurrentUser(caller);
  worker.use(
    http.get("*/admin/users/search", ({ request }) => {
      const params = new URL(request.url).searchParams;
      const ids = params.get("ids");
      const pool = [
        JEAN,
        NAMELESS,
        ...(params.get("status") === "accepted" ? [] : [PENDING]),
        ...(params.get("includeSelf") === "true" ? [SELF] : []),
      ];
      return HttpResponse.json({
        data: pool.filter((user) => !ids || ids.split(",").includes(user.id)),
      });
    }),
    http.post("*/admin/manual-groups/requests", async ({ request }) => {
      requestedGroups.push(await request.json());
      return new HttpResponse(null, { status: 204 });
    }),
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
  return { requested, requestedGroups };
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

  it.each([
    {
      persona: "a manual group manager",
      caller: { managedManualGroups: [BASALT] },
      offered: "Request a group",
      withheld: "New manual group",
    },
    {
      persona: "an institution manager",
      caller: { managedLaboratories: ["UMR7358"] },
      offered: "Request a group",
      withheld: "New manual group",
    },
    {
      persona: "a super admin",
      caller: { superAdmin: true },
      offered: "New manual group",
      withheld: "Request a group",
    },
  ])("should offer $offered to $persona", async (persona) => {
    fakeApi({ groups: [BASALT], caller: persona.caller });

    const { screen } = await renderRoute("/manual-groups");

    await expect
      .element(screen.getByRole("button", { name: persona.offered }))
      .toBeVisible();
    expect(
      screen.getByRole("button", { name: persona.withheld }).elements(),
    ).toEqual([]);
  });

  it("should send the requested name and managers to the super admins", async () => {
    const { requestedGroups } = fakeApi({
      groups: [BASALT],
      caller: { managedManualGroups: [BASALT] },
    });

    const { screen } = await renderRoute("/manual-groups");
    await screen.getByRole("button", { name: "Request a group" }).click();
    await screen.getByLabelText("Group name").fill("Andesite lab");
    await screen.getByRole("combobox", { name: "Managers" }).click();
    await screen.getByRole("option", { name: "Jean Martin" }).click();
    await screen.getByRole("button", { name: "Send the request" }).click();

    await expect
      .element(
        screen.getByText("Request for Andesite lab sent to the super admins"),
      )
      .toBeVisible();
    expect(requestedGroups).toEqual([
      { name: "Andesite lab", managerIds: [JEAN.id] },
    ]);
  });

  it.each([
    ["a named manager", JEAN, "Jean Martin"],
    ["a manager with no name", NAMELESS, NAMELESS.email],
  ])(
    "should open the create dialog prefilled from a request link naming %s",
    async (_case, manager, label) => {
      fakeApi();

      const { screen } = await renderRoute(
        `/manual-groups?requestedName=Andesite+lab&requestedManagerIds=${manager.id}`,
      );

      await expect
        .element(screen.getByLabelText("Group name"))
        .toHaveValue("Andesite lab");
      await expect
        .element(screen.getByRole("button", { name: `Remove ${label}` }))
        .toBeVisible();
    },
  );

  it("should refuse a request missing the name and the managers, on both fields", async () => {
    const { requestedGroups } = fakeApi({
      groups: [BASALT],
      caller: { managedManualGroups: [BASALT] },
    });

    const { screen } = await renderRoute("/manual-groups");
    await screen.getByRole("button", { name: "Request a group" }).click();
    await screen.getByRole("button", { name: "Send the request" }).click();

    await expect
      .element(screen.getByRole("combobox", { name: "Managers" }))
      .toHaveAccessibleDescription("At least one manager is required");
    await expect
      .element(screen.getByLabelText("Group name"))
      .toHaveAccessibleDescription("Group name is required");
    expect(requestedGroups).toEqual([]);
  });

  it("should offer the requester itself as a manager", async () => {
    fakeApi({
      groups: [BASALT],
      caller: { managedManualGroups: [BASALT] },
    });

    const { screen } = await renderRoute("/manual-groups");
    await screen.getByRole("button", { name: "Request a group" }).click();
    await screen.getByRole("combobox", { name: "Managers" }).click();

    await expect
      .element(screen.getByRole("option", { name: "Marie Dupont" }))
      .toBeVisible();
  });

  it("should offer no pending account as a manager", async () => {
    fakeApi({
      groups: [BASALT],
      caller: { managedManualGroups: [BASALT] },
    });

    const { screen } = await renderRoute("/manual-groups");
    await screen.getByRole("button", { name: "Request a group" }).click();
    await screen.getByRole("combobox", { name: "Managers" }).click();

    await expect
      .element(screen.getByRole("option", { name: "Jean Martin" }))
      .toBeVisible();
    expect(
      screen.getByRole("option", { name: "Willy Waiting" }).elements(),
    ).toEqual([]);
  });
});
