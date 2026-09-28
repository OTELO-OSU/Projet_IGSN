import { HttpResponse, http } from "msw";
import { vi } from "vitest";
import { page } from "vitest/browser";

import { CALLER_GROUPS } from "../../test/caller-groups.ts";
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

const BASALT_TEAM = {
  id: "3f2504e0-4f89-41d3-9a0c-0305000000a1",
  name: "Basalt team",
  canLeave: true,
};
const FOSSIL_TEAM = {
  id: "3f2504e0-4f89-41d3-9a0c-0305000000a2",
  name: "Fossil team",
  canLeave: true,
};

const LOCKED_MESSAGE =
  "You cannot leave this group while you own a published sample attached to it.";

function fakeApi({
  manualGroups = [BASALT_TEAM],
}: {
  manualGroups?: { id: string; name: string; canLeave: boolean }[];
} = {}) {
  const groupPuts: unknown[] = [];
  worker.use(
    http.get("*/admin/currentUser/manual-groups", () =>
      HttpResponse.json({ data: manualGroups }),
    ),
    http.put(
      "*/admin/currentUser/institutional-groups",
      async ({ request }) => {
        groupPuts.push(await request.json());
        return new HttpResponse(null, { status: 204 });
      },
    ),
    http.get("*/admin/currentUser", () =>
      HttpResponse.json({
        id: "3f2504e0-4f89-41d3-9a0c-0305000000b7",
        sub: "s",
        name: "Marie Dupont",
        email: "marie.dupont@univ-lorraine.fr",
        orcid: null,
        status: "accepted",
        superAdmin: false,
        managedLaboratories: [],
        managedManualGroups: [],
        ...CALLER_GROUPS,
      }),
    ),
  );
  return { groupPuts };
}

async function renderGroupsPage(api: Parameters<typeof fakeApi>[0] = {}) {
  const { groupPuts } = fakeApi(api);
  const { screen } = await renderRoute("/settings/groups");
  return { screen, groupPuts };
}

const institutionForm = () => page.getByRole("form", { name: "Institution" });

describe("groups page", () => {
  it("should save a new institution only once confirmed", async () => {
    const { groupPuts } = await renderGroupsPage();
    const institution = institutionForm();
    await expect
      .element(page.getByRole("heading", { level: 1, name: "Groups" }))
      .toBeVisible();
    await expect
      .element(institution.getByRole("combobox", { name: /organization/i }))
      .toHaveTextContent(/Lorraine/);

    await institution.getByRole("combobox", { name: /laboratory/i }).click();
    await page.getByRole("option", { name: /GéoRessources/ }).click();
    await institution.getByRole("button", { name: /save/i }).click();
    await expect
      .element(page.getByRole("heading", { name: /change your institution/i }))
      .toBeVisible();
    expect(groupPuts).toEqual([]);

    await page.getByRole("button", { name: /confirm/i }).click();

    await expect
      .element(page.getByText(/institution saved/i))
      .toBeInTheDocument();
    await expect
      .element(institution.getByRole("button", { name: /save/i }))
      .toBeEnabled();
    expect(groupPuts).toEqual([
      {
        institutionalOrganization: "04vfs2w97",
        institutionalOsu: "OTELo",
        institutionalLaboratory: "UMR7359",
      },
    ]);
  });

  it("should describe the institution section under its title", async () => {
    await renderGroupsPage();
    await expect
      .element(page.getByRole("region", { name: "Institution" }))
      .toHaveAccessibleDescription(
        "Samples you have already declared keep the institution they were declared under.",
      );
  });

  it("should offer a single save button", async () => {
    await renderGroupsPage();
    await expect.element(institutionForm()).toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Leave Basalt team" }))
      .toBeVisible();
    expect(page.getByRole("button", { name: /save/i }).elements()).toHaveLength(
      1,
    );
  });

  it("should list the manual groups the user belongs to", async () => {
    await renderGroupsPage();
    await expect
      .element(
        page
          .getByRole("region", { name: "Manual groups" })
          .getByText("Basalt team"),
      )
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Leave Basalt team" }))
      .toBeEnabled();
  });

  it("should refuse to leave only the group holding a published sample", async () => {
    await renderGroupsPage({
      manualGroups: [{ ...BASALT_TEAM, canLeave: false }, FOSSIL_TEAM],
    });
    await expect
      .element(page.getByRole("button", { name: "Leave Basalt team" }))
      .toBeDisabled();
    await expect
      .element(page.getByRole("button", { name: "Leave Fossil team" }))
      .toBeEnabled();
  });

  it("should explain a locked group in a tooltip only once hovered", async () => {
    await renderGroupsPage({
      manualGroups: [{ ...BASALT_TEAM, canLeave: false }],
    });
    const leave = page.getByRole("button", { name: "Leave Basalt team" });
    await expect.element(leave).toBeDisabled();
    await expect
      .element(page.getByText(LOCKED_MESSAGE))
      .not.toBeInTheDocument();

    await leave.hover();

    await expect
      .element(page.getByRole("tooltip"))
      .toHaveTextContent(LOCKED_MESSAGE);
  });
});
