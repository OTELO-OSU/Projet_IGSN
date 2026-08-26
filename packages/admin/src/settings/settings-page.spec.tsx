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
import { page } from "vitest/browser";

import { CALLER_GROUPS } from "../../test/caller-groups.ts";
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

const USER_ID = "3f2504e0-4f89-41d3-9a0c-0305000000b7";

const BASALT_TEAM = {
  id: "3f2504e0-4f89-41d3-9a0c-0305000000a1",
  name: "Basalt team",
  canLeave: true,
};
const MANUAL_GROUPS = [BASALT_TEAM];

function fakeApi({
  orcid = null,
  conflict = false,
  manualGroups = MANUAL_GROUPS,
  status = "accepted",
}: {
  orcid?: string | null;
  conflict?: boolean;
  manualGroups?: { id: string; name: string; canLeave: boolean }[];
  status?: "pending" | "accepted";
} = {}) {
  const puts: unknown[] = [];
  const groupPuts: unknown[] = [];
  let stored = orcid;
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
    http.put("*/admin/currentUser/orcid", async ({ request }) => {
      if (conflict) return new HttpResponse(null, { status: 409 });
      const body = (await request.json()) as { orcid: string | null };
      puts.push(body);
      stored = body.orcid;
      return new HttpResponse(null, { status: 204 });
    }),
    http.get("*/admin/currentUser", () =>
      HttpResponse.json({
        id: USER_ID,
        sub: "s",
        name: "Marie Dupont",
        email: "marie.dupont@univ-lorraine.fr",
        orcid: stored,
        status,
        superAdmin: false,
        managedLaboratories: [],
        managedManualGroups: [],
        ...CALLER_GROUPS,
      }),
    ),
  );
  return { puts, groupPuts };
}

async function renderSettingsPage(api: Parameters<typeof fakeApi>[0] = {}) {
  const { puts, groupPuts } = fakeApi(api);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: ["/settings"] }),
  });
  const screen = render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
  return { screen, puts, groupPuts };
}

const orcidForm = () => page.getByRole("form", { name: "ORCID iD" });

describe("settings page", () => {
  it("should show the stored orcid", async () => {
    await renderSettingsPage({ orcid: "0000-0002-1825-0097" });
    await expect
      .element(orcidForm().getByLabelText(/orcid/i))
      .toHaveValue("0000-0002-1825-0097");
  });

  it("should save a new institution only once confirmed", async () => {
    const { groupPuts } = await renderSettingsPage();
    const institution = page.getByRole("form", { name: "Institution" });
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

  it("should save a valid orcid", async () => {
    const { puts } = await renderSettingsPage();
    await orcidForm().getByLabelText(/orcid/i).fill("0000-0002-1825-0097");
    await orcidForm().getByRole("button", { name: /save/i }).click();
    await expect.element(page.getByText(/orcid id saved/i)).toBeInTheDocument();
    expect(puts).toEqual([{ orcid: "0000-0002-1825-0097" }]);
  });

  it("should clear the orcid when the field is emptied", async () => {
    const { puts } = await renderSettingsPage({
      orcid: "0000-0002-1825-0097",
    });
    await orcidForm().getByLabelText(/orcid/i).fill("");
    await orcidForm().getByRole("button", { name: /save/i }).click();
    await expect.element(page.getByText(/orcid id saved/i)).toBeInTheDocument();
    expect(puts).toEqual([{ orcid: null }]);
  });

  it("should reject a malformed orcid without calling the api", async () => {
    const { puts } = await renderSettingsPage();
    await orcidForm().getByLabelText(/orcid/i).fill("not-an-orcid");
    await orcidForm().getByRole("button", { name: /save/i }).click();
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(/invalid orcid/i);
    expect(puts).toEqual([]);
  });

  it("should list the manual groups the user belongs to", async () => {
    await renderSettingsPage();
    await expect.element(page.getByText("Basalt team")).toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Leave Basalt team" }))
      .toBeEnabled();
  });

  it("should refuse to leave only the group holding a published sample", async () => {
    await renderSettingsPage({
      manualGroups: [
        { ...BASALT_TEAM, canLeave: false },
        {
          id: "3f2504e0-4f89-41d3-9a0c-0305000000a2",
          name: "Fossil team",
          canLeave: true,
        },
      ],
    });
    await expect
      .element(page.getByRole("button", { name: "Leave Basalt team" }))
      .toBeDisabled();
    await expect
      .element(page.getByRole("button", { name: "Leave Fossil team" }))
      .toBeEnabled();
    await expect
      .element(page.getByText(/you cannot leave this group/i))
      .toBeVisible();
  });

  it("should offer the my-samples link", async () => {
    const link = `http://localhost:3000/search?contributor=${USER_ID}`;
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);
    await renderSettingsPage();

    await expect
      .element(page.getByRole("textbox", { name: "My samples link" }))
      .toHaveValue(link);
    await expect
      .element(page.getByRole("link", { name: "Open in a new window" }))
      .toHaveAttribute("href", link);
    await expect
      .element(page.getByRole("link", { name: "Open in a new window" }))
      .toHaveAttribute("target", "_blank");

    await page.getByRole("button", { name: "Copy link" }).click();

    expect(writeText).toHaveBeenCalledWith(link);
    await expect.element(page.getByText("Link copied")).toBeVisible();

    await page.getByRole("textbox", { name: "My samples link" }).click();

    expect(writeText).toHaveBeenCalledTimes(2);
    await expect
      .element(page.getByRole("textbox", { name: "My samples link" }))
      .toHaveSelection(link);
    writeText.mockRestore();
  });

  it("should offer the group samples link once a group is picked", async () => {
    await renderSettingsPage();
    const groupSelector = page.getByRole("combobox", {
      name: "Group",
      exact: true,
    });
    await expect.element(groupSelector).toBeEnabled();
    await expect
      .element(page.getByRole("textbox", { name: "Group samples link" }))
      .not.toBeInTheDocument();

    await groupSelector.click();
    await page.getByRole("option", { name: "Basalt team" }).click();

    const link = `http://localhost:3000/search?manualGroup=${BASALT_TEAM.id}`;
    await expect
      .element(page.getByRole("textbox", { name: "Group samples link" }))
      .toHaveValue(link);
    await expect
      .element(page.getByRole("link", { name: "Open in a new window" }).nth(1))
      .toHaveAttribute("href", link);
  });

  it("should disable the group selector when the user belongs to no group", async () => {
    await renderSettingsPage({ manualGroups: [] });

    await expect
      .element(page.getByRole("combobox", { name: "Group", exact: true }))
      .toBeDisabled();
  });

  it("should hide the my-samples link from a pending user", async () => {
    await renderSettingsPage({ status: "pending" });

    await expect.element(orcidForm()).toBeVisible();
    await expect
      .element(page.getByRole("textbox", { name: "My samples link" }))
      .not.toBeInTheDocument();
  });

  it("should surface a conflict when another account holds the orcid", async () => {
    await renderSettingsPage({ conflict: true });
    await orcidForm().getByLabelText(/orcid/i).fill("0000-0002-1825-0097");
    await orcidForm().getByRole("button", { name: /save/i }).click();
    await expect
      .element(page.getByText(/already linked to another account/i))
      .toBeInTheDocument();
  });
});
