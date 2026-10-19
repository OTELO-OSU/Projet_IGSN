import type { CurrentUser } from "@projet-igsn/domain/user/current-user";
import type { MailKind } from "@projet-igsn/domain/user/mail-kind";

import { HttpResponse, http } from "msw";
import { vi } from "vitest";
import { page } from "vitest/browser";

import { CALLER_GROUPS } from "../../test/caller-groups.ts";
import { worker } from "../../test/msw.ts";
import { renderRoute } from "../../test/render-route.tsx";
import { ORCID_STATE_KEY } from "./use-link-orcid.ts";

const auth = {
  isLoading: false,
  isAuthenticated: true,
  user: {
    access_token: "tok",
    profile: { identity_provider: "renater", name: "Marie Dupont" },
  },
};
vi.mock("react-oidc-context", () => ({ useAuth: () => auth }));

beforeEach(() => {
  auth.user.profile.identity_provider = "renater";
  sessionStorage.clear();
});

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
  let deletes = 0;
  let stored = orcid;
  let myServices = services;
  let mailOptOuts = me.mailOptOuts ?? [];
  const mailCalls: string[] = [];
  worker.use(
    http.put("*/admin/currentUser/mail-opt-outs/:kind", ({ params }) => {
      const kind = params.kind as MailKind;
      mailCalls.push(`PUT ${kind}`);
      mailOptOuts = [...mailOptOuts, kind];
      return new HttpResponse(null, { status: 204 });
    }),
    http.delete("*/admin/currentUser/mail-opt-outs/:kind", ({ params }) => {
      const kind = params.kind as MailKind;
      mailCalls.push(`DELETE ${kind}`);
      mailOptOuts = mailOptOuts.filter((optOut) => optOut !== kind);
      return new HttpResponse(null, { status: 204 });
    }),
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
      puts.push(await request.json());
      if (conflict) return new HttpResponse(null, { status: 409 });
      stored = LINKED_ORCID;
      return HttpResponse.json({ orcid: stored });
    }),
    http.delete("*/admin/currentUser/orcid", () => {
      deletes += 1;
      stored = null;
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
        mailOptOuts,
      }),
    ),
  );
  return { puts, deletes: () => deletes, mailCalls };
}

const LINKED_ORCID = "0000-0002-1825-0097";

async function renderProfilePage(
  api: Parameters<typeof fakeApi>[0] = {},
  url = "/settings/profile",
) {
  const calls = fakeApi(api);
  const { screen } = await renderRoute(url);
  return { screen, ...calls };
}

const orcidSection = () =>
  page.getByRole("region", { name: "ORCID iD", exact: true });
const linkButton = () =>
  page.getByRole("button", { name: "Link my ORCID account" });
const unlinkButton = () =>
  page.getByRole("button", { name: "Unlink my ORCID account" });

describe("profile page", () => {
  it.each([
    ["no iD", null, "Link my ORCID account"],
    ["a linked iD", LINKED_ORCID, "Unlink my ORCID account"],
  ])("should offer %s its matching orcid action", async (_, orcid, action) => {
    await renderProfilePage({ orcid });
    await expect
      .element(page.getByRole("heading", { level: 1, name: "Profile" }))
      .toBeVisible();
    await expect
      .element(orcidSection().getByRole("button", { name: action }))
      .toBeVisible();
    expect(orcidSection().getByRole("button").elements()).toHaveLength(1);
  });

  it("should link the orcid account returned with the stored state", async () => {
    sessionStorage.setItem(ORCID_STATE_KEY, "state-1");
    const { puts } = await renderProfilePage(
      {},
      "/settings/profile?code=code-1&state=state-1",
    );
    await expect.element(page.getByText("ORCID iD linked")).toBeVisible();
    await expect.element(orcidSection().getByText(LINKED_ORCID)).toBeVisible();
    expect(puts).toEqual([{ code: "code-1" }]);
  });

  it.each([
    [
      "a mismatched state",
      "?code=code-1&state=state-2",
      "Could not link your ORCID iD",
    ],
    [
      "a cancelled authorization",
      "?error=access_denied&state=state-1",
      "ORCID linking cancelled",
    ],
    [
      "a failed authorization",
      "?error=server_error&state=state-1",
      "Could not link your ORCID iD",
    ],
  ])("should not link on %s", async (_, search, message) => {
    sessionStorage.setItem(ORCID_STATE_KEY, "state-1");
    const { puts } = await renderProfilePage({}, `/settings/profile${search}`);
    await expect.element(page.getByText(message)).toBeVisible();
    await expect.element(linkButton()).toBeVisible();
    expect(puts).toEqual([]);
  });

  it("should surface a conflict when another account holds the orcid", async () => {
    sessionStorage.setItem(ORCID_STATE_KEY, "state-1");
    await renderProfilePage(
      { conflict: true },
      "/settings/profile?code=code-1&state=state-1",
    );
    await expect
      .element(page.getByText(/already linked to another account/i))
      .toBeVisible();
  });

  it("should unlink the orcid account only once confirmed", async () => {
    const { deletes } = await renderProfilePage({ orcid: LINKED_ORCID });

    await unlinkButton().click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect.element(orcidSection().getByText(LINKED_ORCID)).toBeVisible();
    expect(deletes()).toBe(0);

    await unlinkButton().click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect.element(page.getByText("ORCID iD unlinked")).toBeVisible();
    await expect.element(linkButton()).toBeVisible();
    expect(deletes()).toBe(1);
  });

  it("should keep a user signed in through orcid from unlinking it", async () => {
    auth.user.profile.identity_provider = "orcid";
    await renderProfilePage({ orcid: LINKED_ORCID });
    await expect.element(unlinkButton()).toBeDisabled();
  });

  it.each([
    [
      "ORCID iD",
      "Your ORCID iD becomes a sign-in method for this account. Link it by signing in to ORCID.",
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

  it("should offer the only group's samples link, named after it, with no group to pick", async () => {
    await renderProfilePage({ manualGroups: [BASALT_TEAM] });

    await expect
      .element(page.getByRole("textbox", { name: "Basalt team samples link" }))
      .toHaveValue(
        `http://localhost:3000/search?manualGroup=${BASALT_TEAM.id}`,
      );
    await expect.element(groupSelector()).not.toBeInTheDocument();
  });

  it("should offer the samples link of the only group the user manages without belonging to it", async () => {
    await renderProfilePage({
      manualGroups: [],
      me: { managedManualGroups: [FOSSIL_TEAM] },
    });

    await expect
      .element(page.getByRole("textbox", { name: "Fossil team samples link" }))
      .toHaveValue(
        `http://localhost:3000/search?manualGroup=${FOSSIL_TEAM.id}`,
      );
  });

  it("should offer both a member group and a managed group to pick", async () => {
    await renderProfilePage({
      manualGroups: [BASALT_TEAM],
      me: { managedManualGroups: [FOSSIL_TEAM] },
    });

    await groupSelector().click();

    await expect
      .element(page.getByRole("option", { name: "Basalt team" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("option", { name: "Fossil team" }))
      .toBeVisible();
  });

  it("should offer a group both joined and managed once", async () => {
    await renderProfilePage({
      manualGroups: [BASALT_TEAM],
      me: { managedManualGroups: [BASALT_TEAM] },
    });

    await expect
      .element(page.getByRole("textbox", { name: "Basalt team samples link" }))
      .toBeVisible();
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

    await expect.element(linkButton()).toBeVisible();
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

    await expect.element(linkButton()).toBeVisible();
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

  const emailsSection = () =>
    page.getByRole("region", { name: "Emails", exact: true });
  const mailSwitch = (name: string) =>
    emailsSection().getByRole("switch", { name, exact: true });
  const INVITATION = "You are invited to a sample";
  const DIGEST = "Weekly digest of users awaiting approval";
  const SUPER_ADMIN_ALWAYS_SENT = [
    "Weekly digest of pending users and groups without a manager",
    "A user asks for an internal ID, a deletion, a manual group or a service account",
    "A group is left without a manager",
  ];

  it.each([
    ["off", [], "PUT sample_invitation", false],
    ["on", ["sample_invitation" as const], "DELETE sample_invitation", true],
  ])(
    "should switch an email %s",
    async (_, mailOptOuts, call, checkedAfter) => {
      const { mailCalls } = await renderProfilePage({ me: { mailOptOuts } });

      await mailSwitch(INVITATION).click();

      await expect
        .element(page.getByText("Email preference saved"))
        .toBeVisible();
      await expect
        .element(mailSwitch(INVITATION))
        .toHaveAttribute("aria-checked", String(checkedAfter));
      expect(mailCalls).toEqual([call]);
    },
  );

  it("should offer the email preferences to a pending user", async () => {
    await renderProfilePage({ status: "pending" });

    await expect.element(mailSwitch(INVITATION)).toBeEnabled();
  });

  it("should show the always sent emails checked and locked", async () => {
    await renderProfilePage({ me: { superAdmin: true } });

    for (const name of [
      "A visitor contacts you about a sample",
      "You are removed from a sample",
      "Your account is approved",
      ...SUPER_ADMIN_ALWAYS_SENT,
    ]) {
      await expect.element(mailSwitch(name)).toBeChecked();
      await expect.element(mailSwitch(name)).toBeDisabled();
    }
  });

  it.each([
    ["a space manager", { managedLaboratories: ["UMR7358"] }, true],
    [
      "a super admin managing a laboratory",
      { superAdmin: true, managedLaboratories: ["UMR7358"] },
      false,
    ],
    ["a researcher", {}, false],
  ])(
    "should offer the pending users digest to %s only if a space manager",
    async (_, me, offered) => {
      await renderProfilePage({ me });

      await expect.element(mailSwitch(INVITATION)).toBeVisible();
      expect(mailSwitch(DIGEST).elements()).toHaveLength(offered ? 1 : 0);
    },
  );

  it.each([
    ["a super admin", true],
    ["a researcher", false],
  ])(
    "should list the super admin always sent emails to %s only if a super admin",
    async (_, superAdmin) => {
      await renderProfilePage({ me: { superAdmin } });

      await expect.element(mailSwitch(INVITATION)).toBeVisible();
      expect(
        SUPER_ADMIN_ALWAYS_SENT.flatMap((name) => mailSwitch(name).elements()),
      ).toHaveLength(superAdmin ? SUPER_ADMIN_ALWAYS_SENT.length : 0);
    },
  );
});
