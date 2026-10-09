import type { CurrentUser } from "@projet-igsn/domain/user/current-user";

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

const USER_ID = "3f2504e0-4f89-41d3-9a0c-0305000000b7";

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

const SERVICE_ID = "3f2504e0-4f89-41d3-9a0c-030500000b01";
const GAIA_HARVESTER = {
  id: SERVICE_ID,
  name: "Gaia harvester",
  hasApiKey: false,
};

function fakeApi({
  orcid = null,
  conflict = false,
  manualGroups = [BASALT_TEAM, FOSSIL_TEAM],
  status = "accepted",
  services = [],
  me = {},
}: {
  orcid?: string | null;
  conflict?: boolean;
  manualGroups?: { id: string; name: string; canLeave: boolean }[];
  status?: "pending" | "accepted";
  services?: { id: string; name: string; hasApiKey: boolean }[];
  me?: Partial<CurrentUser>;
} = {}) {
  const puts: unknown[] = [];
  let stored = orcid;
  let myServices = services;
  worker.use(
    http.get("*/admin/currentUser/service-accounts", () =>
      HttpResponse.json({ data: myServices }),
    ),
    http.post("*/admin/currentUser/service-accounts/:id/api-key", () => {
      myServices = myServices.map((service) => ({
        ...service,
        hasApiKey: true,
      }));
      return HttpResponse.json({ apiKey: "key-42" });
    }),
    http.get("*/admin/currentUser/manual-groups", () =>
      HttpResponse.json({ data: manualGroups }),
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
        charterAccepted: true,
        managedLaboratories: [],
        managedManualGroups: [],
        ...CALLER_GROUPS,
        ...me,
      }),
    ),
  );
  return { puts };
}

async function renderProfilePage(api: Parameters<typeof fakeApi>[0] = {}) {
  const { puts } = fakeApi(api);
  const { screen } = await renderRoute("/settings/profile");
  return { screen, puts };
}

const orcidForm = () => page.getByRole("form", { name: "ORCID iD" });

describe("profile page", () => {
  it("should show the stored orcid", async () => {
    await renderProfilePage({ orcid: "0000-0002-1825-0097" });
    await expect
      .element(page.getByRole("heading", { level: 1, name: "Profile" }))
      .toBeVisible();
    await expect
      .element(orcidForm().getByLabelText(/orcid/i))
      .toHaveValue("0000-0002-1825-0097");
  });

  it("should save a valid orcid", async () => {
    const { puts } = await renderProfilePage();
    await orcidForm().getByLabelText(/orcid/i).fill("0000-0002-1825-0097");
    await orcidForm().getByRole("button", { name: /save/i }).click();
    await expect.element(page.getByText(/orcid id saved/i)).toBeInTheDocument();
    expect(puts).toEqual([{ orcid: "0000-0002-1825-0097" }]);
  });

  it("should clear the orcid when the field is emptied", async () => {
    const { puts } = await renderProfilePage({
      orcid: "0000-0002-1825-0097",
    });
    await orcidForm().getByLabelText(/orcid/i).fill("");
    await orcidForm().getByRole("button", { name: /save/i }).click();
    await expect.element(page.getByText(/orcid id saved/i)).toBeInTheDocument();
    expect(puts).toEqual([{ orcid: null }]);
  });

  it("should reject a malformed orcid without calling the api", async () => {
    const { puts } = await renderProfilePage();
    await orcidForm().getByLabelText(/orcid/i).fill("not-an-orcid");
    await orcidForm().getByRole("button", { name: /save/i }).click();
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(/invalid orcid/i);
    expect(puts).toEqual([]);
  });

  it("should offer a single save button", async () => {
    await renderProfilePage({ services: [GAIA_HARVESTER] });
    await expect.element(orcidForm()).toBeVisible();
    await expect
      .element(page.getByRole("heading", { name: "Services" }))
      .toBeVisible();
    expect(page.getByRole("button", { name: /save/i }).elements()).toHaveLength(
      1,
    );
  });

  it.each([
    [
      "ORCID iD",
      "Your ORCID iD becomes a sign-in method for this account, so make sure it is yours.",
    ],
    [
      "Samples links",
      "Share these links to show every published sample you contribute to or that is attached to a group you belong to.",
    ],
    [
      "Services",
      "Generate an API key so one of your services can call the API in your name.",
    ],
  ])("should describe the %s section under its title", async (title, hint) => {
    await renderProfilePage({ services: [GAIA_HARVESTER] });
    await expect
      .element(page.getByRole("region", { name: title, exact: true }))
      .toHaveAccessibleDescription(hint);
  });

  it("should group the samples links under one section", async () => {
    await renderProfilePage();
    const links = page.getByRole("region", { name: "Samples links" });
    await expect
      .element(links.getByRole("textbox", { name: "My samples link" }))
      .toBeVisible();
    await links.getByRole("combobox", { name: "Group", exact: true }).click();
    await page.getByRole("option", { name: "Basalt team" }).click();
    await expect
      .element(links.getByRole("textbox", { name: "Group samples link" }))
      .toBeVisible();
    expect(links.getByRole("heading", { level: 3 }).elements()).toHaveLength(0);
  });

  const MY_SAMPLES_LINK = `http://localhost:3000/search?contributor=${USER_ID}`;
  const mySamplesInput = () =>
    page.getByRole("textbox", { name: "My samples link" });
  const stubClipboard = () =>
    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

  it("should offer the my-samples link", async () => {
    const writeText = stubClipboard();
    await renderProfilePage();
    const open = page.getByRole("link", { name: "Open in a new window" });

    await expect.element(mySamplesInput()).toHaveValue(MY_SAMPLES_LINK);
    await expect.element(open).toHaveAttribute("href", MY_SAMPLES_LINK);
    await expect.element(open).toHaveAttribute("target", "_blank");

    await page.getByRole("button", { name: "Copy link" }).click();

    expect(writeText).toHaveBeenCalledWith(MY_SAMPLES_LINK);
    await expect.element(page.getByText("Link copied")).toBeVisible();
    writeText.mockRestore();
  });

  it("should select and copy the my-samples link on input click", async () => {
    const writeText = stubClipboard();
    await renderProfilePage();

    await mySamplesInput().click();

    expect(writeText).toHaveBeenCalledWith(MY_SAMPLES_LINK);
    await expect.element(mySamplesInput()).toHaveSelection(MY_SAMPLES_LINK);
    writeText.mockRestore();
  });

  const groupSelector = () =>
    page.getByRole("combobox", { name: "Group", exact: true });
  const groupSamplesInput = () =>
    page.getByRole("textbox", { name: "Group samples link" });

  it("should offer the group samples link once a group is picked", async () => {
    await renderProfilePage();
    await expect.element(groupSelector()).toBeEnabled();
    await expect.element(groupSamplesInput()).not.toBeInTheDocument();

    await groupSelector().click();
    await page.getByRole("option", { name: "Basalt team" }).click();

    await expect
      .element(groupSamplesInput())
      .toHaveValue(
        `http://localhost:3000/search?manualGroup=${BASALT_TEAM.id}`,
      );
  });

  it("should offer the only group's samples link with no group to pick", async () => {
    await renderProfilePage({ manualGroups: [BASALT_TEAM] });

    await expect
      .element(groupSamplesInput())
      .toHaveValue(
        `http://localhost:3000/search?manualGroup=${BASALT_TEAM.id}`,
      );
    await expect.element(groupSelector()).not.toBeInTheDocument();
  });

  it("should hide the group samples link when the user belongs to no group", async () => {
    await renderProfilePage({ manualGroups: [] });

    await expect.element(mySamplesInput()).toBeVisible();
    await expect.element(groupSelector()).not.toBeInTheDocument();
    await expect.element(groupSamplesInput()).not.toBeInTheDocument();
  });

  it("should hide the my-samples link from a pending user", async () => {
    await renderProfilePage({ status: "pending" });

    await expect.element(orcidForm()).toBeVisible();
    await expect.element(mySamplesInput()).not.toBeInTheDocument();
  });

  it.each([
    ["a laboratory manager", { managedLaboratories: ["UMR7358"] }],
    [
      "a manual group manager",
      { managedManualGroups: [{ id: BASALT_TEAM.id, name: BASALT_TEAM.name }] },
    ],
    ["a super admin", { superAdmin: true }],
  ])(
    "should offer %s owning no service account to ask for one",
    async (_, me) => {
      await renderProfilePage({ me });

      await expect
        .element(page.getByRole("heading", { name: "Services" }))
        .toBeVisible();
      await expect
        .element(
          page.getByRole("button", { name: "Ask for a service account" }),
        )
        .toBeVisible();
    },
  );

  it("should hide the services section from a user owning no service account and managing no group", async () => {
    await renderProfilePage();

    await expect.element(mySamplesInput()).toBeVisible();
    await expect
      .element(page.getByRole("heading", { name: "Services" }))
      .not.toBeInTheDocument();
  });

  it("should keep a user managing no group from asking for a service account", async () => {
    await renderProfilePage({ services: [GAIA_HARVESTER] });

    await expect.element(page.getByText("Gaia harvester")).toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Ask for a service account" }))
      .not.toBeInTheDocument();
  });

  it("should hide the services section from a pending user", async () => {
    await renderProfilePage({ status: "pending" });

    await expect.element(orcidForm()).toBeVisible();
    await expect
      .element(page.getByRole("heading", { name: "Services" }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: "Ask for a service account" }))
      .not.toBeInTheDocument();
  });

  it("should show the generated api key once and offer to regenerate it", async () => {
    await renderProfilePage({ services: [GAIA_HARVESTER] });

    await expect
      .element(page.getByRole("heading", { name: "Services" }))
      .toBeVisible();
    await expect.element(page.getByText("Gaia harvester")).toBeVisible();

    await page.getByRole("button", { name: "Generate API key" }).click();

    await expect
      .element(page.getByRole("textbox", { name: "API key" }))
      .toHaveValue("key-42");
    await expect
      .element(page.getByRole("button", { name: "Regenerate API key" }))
      .toBeVisible();
  });

  it("should surface a conflict when another account holds the orcid", async () => {
    await renderProfilePage({ conflict: true });
    await orcidForm().getByLabelText(/orcid/i).fill("0000-0002-1825-0097");
    await orcidForm().getByRole("button", { name: /save/i }).click();
    await expect
      .element(page.getByText(/already linked to another account/i))
      .toBeInTheDocument();
  });
});
