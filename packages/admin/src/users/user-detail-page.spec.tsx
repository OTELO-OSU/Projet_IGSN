import type { CurrentUser } from "@projet-igsn/domain/user/current-user";

import { NO_MANAGED_GROUPS } from "@projet-igsn/domain/user/managed-groups";
import { shouldRePendOnInstitutionsUpdate } from "@projet-igsn/domain/user/should-re-pend-on-institutions-update";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { HttpResponse, http } from "msw";
import { StrictMode } from "react";
import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { CALLER_GROUPS } from "../../test/caller-groups.ts";
import { fakeCurrentUser } from "../../test/fake-current-user.ts";
import { worker } from "../../test/msw.ts";
import { routeTree } from "../routeTree.gen.ts";

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

const USER_ID = "3f2504e0-4f89-41d3-9a0c-030500000001";

const BASALT = {
  id: "3f2504e0-4f89-41d3-9a0c-0305000000a1",
  name: "Basalt",
  canDetach: true,
};
const METEORITE = {
  id: "3f2504e0-4f89-41d3-9a0c-0305000000a2",
  name: "Meteorite",
  canDetach: true,
};

type Options = {
  status?: "pending" | "accepted" | "rejected";
  name?: string | null;
  firstname?: string | null;
  failPut?: boolean;
  failGet?: boolean;
  manualGroups?: { id: string; name: string; canDetach: boolean }[];
  managedManualGroupIds?: string[];
  caller?: Partial<CurrentUser>;
};

const OFF_CATALOG_ID = "3f2504e0-4f89-41d3-9a0c-0305000000ff";
const LORRAINE = "Université de Lorraine (04vfs2w97)";
const CRPG =
  "Centre de recherches pétrographiques et géochimiques (CRPG) (UMR7358)";
const INSTITUTION_MANAGER: Partial<CurrentUser> = {
  superAdmin: false,
  managedLaboratories: [CALLER_GROUPS.institutionalLaboratory],
  managedManualGroups: [],
};
const OTHER_LABORATORY_MANAGER: Partial<CurrentUser> = {
  superAdmin: false,
  managedLaboratories: ["UMR7360"],
  managedManualGroups: [],
};
const DUAL_MANAGER: Partial<CurrentUser> = {
  superAdmin: false,
  managedLaboratories: [CALLER_GROUPS.institutionalLaboratory],
  managedManualGroups: [METEORITE],
};
const MODERATION_SEARCH = "Search by name or identifier";

function fakeApi({
  status = "pending",
  name = "Durand",
  firstname = "Paul",
  failPut = false,
  failGet = false,
  manualGroups = [BASALT],
  managedManualGroupIds = [],
  caller = { superAdmin: true },
}: Options) {
  let user = {
    id: USER_ID,
    email: "paul.durand@univ-lorraine.fr",
    name,
    firstname,
    orcid: null,
    status,
    superAdmin: false,
    manualGroups,
    managedGroups: {
      ...NO_MANAGED_GROUPS,
      manualGroupIds: managedManualGroupIds,
    },
    ...CALLER_GROUPS,
  };
  const calls: unknown[] = [];
  fakeCurrentUser(caller);
  worker.use(
    http.put("*/admin/users/:id", async ({ request }) => {
      if (failPut) return new HttpResponse(null, { status: 500 });
      const body = (await request.json()) as {
        status: typeof status;
        manualGroupIds: string[];
      } & typeof CALLER_GROUPS;
      calls.push(body);
      user = {
        ...user,
        institutionalOrganization: body.institutionalOrganization,
        institutionalOsu: body.institutionalOsu,
        institutionalLaboratory: body.institutionalLaboratory,
        status: shouldRePendOnInstitutionsUpdate(
          user,
          body.institutionalOrganization,
        )
          ? "pending"
          : body.status,
        manualGroups: [BASALT, METEORITE].filter((group) =>
          body.manualGroupIds.includes(group.id),
        ),
      };
      return HttpResponse.json({ data: user });
    }),
    http.get("*/admin/manual-groups", () =>
      HttpResponse.json({
        data: [BASALT, METEORITE].map((group) => ({
          ...group,
          memberCount: 1,
          managerCount: 1,
        })),
        meta: { total: 2 },
      }),
    ),
    http.get("*/admin/users/:id", () => {
      if (failGet) return new HttpResponse(null, { status: 500 });
      return HttpResponse.json({ data: user });
    }),
  );
  return { calls };
}

async function renderUserPage(options: Options = {}) {
  const { calls } = fakeApi(options);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [`/users/${USER_ID}`] }),
  });
  const screen = await render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
  return { screen, calls };
}

const clearOrganization = async (
  screen: Awaited<ReturnType<typeof renderUserPage>>["screen"],
) => {
  await screen
    .getByRole("combobox", { name: "Organization", exact: true })
    .click();
  await screen
    .getByPlaceholder("Search organizations...")
    .fill("Université de Lorraine");
  await screen
    .getByRole("option", { name: "Université de Lorraine", exact: true })
    .click();
};

describe("UserDetailPage", () => {
  it("should require a laboratory only while an organization is set", async () => {
    const { screen } = await renderUserPage();

    await expect
      .element(
        screen.getByRole("combobox", { name: "Organization", exact: true }),
      )
      .toBeVisible();
    await expect
      .element(
        screen.getByRole("combobox", { name: "Laboratory *", exact: true }),
      )
      .toBeVisible();

    await clearOrganization(screen);

    await expect
      .element(
        screen.getByRole("combobox", { name: "Laboratory", exact: true }),
      )
      .toBeVisible();
  });

  it("should show the identity read-only, with no editable identity field", async () => {
    const { screen } = await renderUserPage();

    await expect
      .element(screen.getByRole("heading", { name: "Paul Durand", level: 1 }))
      .toBeVisible();
    await expect
      .element(screen.getByText("paul.durand@univ-lorraine.fr"))
      .toBeVisible();
    expect(screen.getByRole("textbox").elements()).toHaveLength(0);
  });

  it("should title an account with no name with its email", async () => {
    const { screen } = await renderUserPage({ name: null, firstname: null });

    await expect
      .element(
        screen.getByRole("heading", {
          name: "paul.durand@univ-lorraine.fr",
          level: 1,
        }),
      )
      .toBeVisible();
  });

  it("should show the institution the user belongs to", async () => {
    const { screen } = await renderUserPage();

    await expect
      .element(screen.getByText("Université de Lorraine"))
      .toBeVisible();
    await expect.element(screen.getByText(/\(OTELo\)/)).toBeVisible();
    await expect.element(screen.getByText(/\(CRPG\)/)).toBeVisible();
  });

  it.each([
    ["an unmoderated", "pending", ["Pending", "Active", "Disabled"]],
    ["an active", "accepted", ["Active", "Disabled"]],
  ] as const)(
    "should offer %s account the statuses it can be set to",
    async (_case, status, offered) => {
      const { screen } = await renderUserPage({ status });

      await screen.getByRole("combobox", { name: "Status" }).click();
      await expect
        .element(screen.getByRole("option", { name: "Active" }))
        .toBeVisible();

      expect(
        screen
          .getByRole("option")
          .elements()
          .map((option) => option.textContent),
      ).toEqual(offered);
    },
  );

  it("should let an unvalidated account lose its groups but join none", async () => {
    const { screen } = await renderUserPage();

    await expect
      .element(
        screen.getByText(
          "Only a validated account can join a manual group, though its memberships can still be removed.",
        ),
      )
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: `Detach ${BASALT.name}` }))
      .toBeEnabled();

    await screen
      .getByRole("combobox", { name: "Manual groups", exact: true })
      .click();

    expect(
      screen.getByRole("option", { name: METEORITE.name }).elements(),
    ).toHaveLength(0);
  });

  it("should show a membership the group catalog does not list", async () => {
    const GNEISS = {
      id: "3f2504e0-4f89-41d3-9a0c-0305000000a9",
      name: "Gneiss",
      canDetach: true,
    };
    const { screen } = await renderUserPage({
      status: "accepted",
      manualGroups: [GNEISS],
    });

    await expect
      .element(screen.getByRole("button", { name: `Detach ${GNEISS.name}` }))
      .toBeVisible();
  });

  it("should write nothing before the form is saved", async () => {
    const { screen, calls } = await renderUserPage({ status: "accepted" });

    await screen
      .getByRole("combobox", { name: "Manual groups", exact: true })
      .click();
    await screen.getByRole("option", { name: METEORITE.name }).click();

    await expect
      .element(screen.getByRole("button", { name: `Detach ${METEORITE.name}` }))
      .toBeVisible();
    expect(calls).toEqual([]);
  });

  it("should save the status, the institution and the groups in one request", async () => {
    const { screen, calls } = await renderUserPage();

    await screen.getByRole("combobox", { name: "Status" }).click();
    await screen.getByRole("option", { name: "Active" }).click();
    await screen
      .getByRole("combobox", { name: "Manual groups", exact: true })
      .click();
    await screen.getByRole("option", { name: METEORITE.name }).click();
    await screen.getByRole("button", { name: "Save" }).click();

    await expect
      .poll(() => calls)
      .toEqual([
        {
          status: "accepted",
          ...CALLER_GROUPS,
          manualGroupIds: [BASALT.id, METEORITE.id],
          managedGroups: NO_MANAGED_GROUPS,
        },
      ]);
    await expect.element(screen.getByText("Account updated")).toBeVisible();
  });

  it("should detach a group by removing it from the picked ones", async () => {
    const { screen, calls } = await renderUserPage({ status: "accepted" });

    await screen.getByRole("button", { name: `Detach ${BASALT.name}` }).click();
    await screen.getByRole("button", { name: "Save" }).click();

    await expect
      .poll(() => calls)
      .toEqual([
        {
          status: "accepted",
          ...CALLER_GROUPS,
          manualGroupIds: [],
          managedGroups: NO_MANAGED_GROUPS,
        },
      ]);
  });

  it("should save a laboratory of the organization once the OSU is cleared", async () => {
    const { screen, calls } = await renderUserPage({ status: "accepted" });

    await screen.getByRole("combobox", { name: "OSU (optional)" }).click();
    await screen.getByRole("option", { name: /OTELo/ }).click();
    await screen.getByRole("combobox", { name: "Laboratory" }).click();
    await screen.getByRole("option", { name: /CRPG/ }).click();
    await screen.getByRole("button", { name: "Save" }).click();

    await expect
      .poll(() => calls)
      .toEqual([
        {
          status: "accepted",
          institutionalOrganization: "04vfs2w97",
          institutionalOsu: null,
          institutionalLaboratory: "UMR7358",
          manualGroupIds: [BASALT.id],
          managedGroups: NO_MANAGED_GROUPS,
        },
      ]);
  });

  it("should announce a pending account instead of a status once the institution is cleared", async () => {
    const { screen } = await renderUserPage({ status: "accepted" });

    await clearOrganization(screen);

    await expect
      .element(
        screen.getByText(
          "Removing the institution sends the account back to pending moderation.",
        ),
      )
      .toBeVisible();
    await expect
      .element(screen.getByText("Pending", { exact: true }))
      .toBeVisible();
    expect(
      screen.getByRole("combobox", { name: "Status" }).elements(),
    ).toHaveLength(0);
  });

  it("should submit the stored status with the cleared institution", async () => {
    const { screen, calls } = await renderUserPage({ status: "accepted" });

    await clearOrganization(screen);
    await screen.getByRole("button", { name: "Save" }).click();

    await expect
      .poll(() => calls)
      .toEqual([
        {
          status: "accepted",
          institutionalOrganization: null,
          institutionalOsu: null,
          institutionalLaboratory: null,
          manualGroupIds: [BASALT.id],
          managedGroups: NO_MANAGED_GROUPS,
        },
      ]);
  });

  it("should show the account pending once the save clears its institution", async () => {
    const { screen } = await renderUserPage({ status: "accepted" });

    await clearOrganization(screen);
    await screen.getByRole("button", { name: "Save" }).click();

    await expect
      .element(screen.getByRole("combobox", { name: "Status" }))
      .toHaveTextContent("Pending");
  });

  it("should keep the shown status when the server refuses the save", async () => {
    const { screen } = await renderUserPage({ failPut: true });

    await screen.getByRole("combobox", { name: "Status" }).click();
    await screen.getByRole("option", { name: "Active" }).click();
    await screen.getByRole("button", { name: "Save" }).click();

    await expect
      .element(screen.getByText("Could not update the account"))
      .toBeVisible();
    await expect
      .element(screen.getByRole("combobox", { name: "Status" }))
      .toHaveTextContent("Active");
  });

  it.each([
    ["a super admin", { superAdmin: true }, 1],
    ["a space manager", INSTITUTION_MANAGER, 0],
  ] as const)(
    "should offer the moderation scope to %s only",
    async (_case, caller, sections) => {
      const { screen } = await renderUserPage({ caller });

      await expect
        .element(screen.getByRole("combobox", { name: "Status" }))
        .toBeVisible();

      expect(
        screen.getByRole("heading", { name: "Managed groups" }).elements(),
      ).toHaveLength(sections);
    },
  );

  it.each([
    ["an institution manager", INSTITUTION_MANAGER, true, false],
    ["a manager of both kinds", DUAL_MANAGER, true, true],
    ["a manager of another laboratory", OTHER_LABORATORY_MANAGER, false, false],
  ] as const)(
    "should let %s edit only the fields of the kind it manages",
    async (_case, caller, institutions, groups) => {
      const { screen } = await renderUserPage({ status: "accepted", caller });
      const expectEditable = (
        field: ReturnType<typeof screen.getByRole>,
        editable: boolean,
      ) =>
        editable
          ? expect.element(field).toBeEnabled()
          : expect.element(field).toBeDisabled();

      await expectEditable(
        screen.getByRole("combobox", { name: "Status" }),
        institutions,
      );
      await expectEditable(
        screen.getByRole("combobox", { name: "Organization" }),
        institutions,
      );
      await expectEditable(
        screen.getByRole("combobox", { name: "Manual groups", exact: true }),
        groups,
      );
    },
  );

  it("should let a manager toggle only the manual groups it manages", async () => {
    const { screen } = await renderUserPage({
      status: "accepted",
      caller: DUAL_MANAGER,
    });

    await expect
      .element(screen.getByRole("button", { name: `Detach ${BASALT.name}` }))
      .not.toBeInTheDocument();

    await screen
      .getByRole("combobox", { name: "Manual groups", exact: true })
      .click();

    await expect
      .element(screen.getByRole("option", { name: METEORITE.name }))
      .toBeVisible();
  });

  it("should lock a membership the api refuses to detach", async () => {
    const { screen } = await renderUserPage({
      status: "accepted",
      manualGroups: [{ ...BASALT, canDetach: false }],
    });

    await expect.element(screen.getByText(BASALT.name)).toBeVisible();
    expect(
      screen.getByRole("button", { name: `Detach ${BASALT.name}` }).elements(),
    ).toEqual([]);
  });

  it("should find a managed laboratory by its code", async () => {
    const { screen } = await renderUserPage();

    await screen
      .getByRole("combobox", { name: "Managed laboratories" })
      .click();
    await screen.getByPlaceholder(MODERATION_SEARCH).fill("UMR7358");

    await expect
      .element(screen.getByRole("option", { name: CRPG }))
      .toBeVisible();
  });

  it("should save the granted moderation scope", async () => {
    const { screen, calls } = await renderUserPage({ status: "accepted" });

    await screen
      .getByRole("combobox", { name: "Managed organizations" })
      .click();
    await screen
      .getByPlaceholder(MODERATION_SEARCH)
      .fill("Université de Lorraine");
    await screen.getByRole("option", { name: LORRAINE }).click();
    await screen.getByRole("button", { name: "Save" }).click();

    await expect
      .poll(() => calls)
      .toEqual([
        {
          status: "accepted",
          ...CALLER_GROUPS,
          manualGroupIds: [BASALT.id],
          managedGroups: {
            ...NO_MANAGED_GROUPS,
            organizations: ["04vfs2w97"],
          },
        },
      ]);
  });

  it("should keep a granted group the catalog does not offer removable", async () => {
    const { screen } = await renderUserPage({
      status: "accepted",
      managedManualGroupIds: [OFF_CATALOG_ID],
    });

    await expect
      .element(screen.getByRole("button", { name: `Remove ${OFF_CATALOG_ID}` }))
      .toBeVisible();
  });

  it("should report a failed load as an account failure", async () => {
    const { screen } = await renderUserPage({ failGet: true });

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent("Could not load the account");
  });
});
