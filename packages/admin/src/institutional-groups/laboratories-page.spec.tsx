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

const MEMBERS = [
  {
    id: "3f2504e0-4f89-41d3-9a0c-030500000001",
    email: "crpg.member@univ-lorraine.fr",
    name: "Petrographer",
    firstname: "Claire",
    orcid: null,
    status: "accepted",
    superAdmin: false,
    institutionalOrganization: "04vfs2w97",
    institutionalOsu: "OTELo",
    institutionalLaboratory: "UMR7358",
    manualGroups: [],
  },
  {
    id: "3f2504e0-4f89-41d3-9a0c-030500000002",
    email: "isterre.member@univ-grenoble.fr",
    name: "Seismologist",
    firstname: "Ivan",
    orcid: null,
    status: "pending",
    superAdmin: false,
    institutionalOrganization: "02feahw73",
    institutionalOsu: "OSUG",
    institutionalLaboratory: "UMR5275",
    manualGroups: [],
  },
];

const PASTEUR = {
  id: "3f2504e0-4f89-41d3-9a0c-030500000011",
  email: "louis.pasteur@univ-lorraine.fr",
  name: "Pasteur",
  firstname: "Louis",
  orcid: null,
  status: "accepted",
};

const CANDIDATE = {
  id: "3f2504e0-4f89-41d3-9a0c-030500000012",
  email: "ada.lovelace@univ-lorraine.fr",
  name: "Lovelace",
  firstname: "Ada",
  orcid: null,
  status: "accepted",
};

function fakeApi() {
  const requested: string[] = [];
  let members = MEMBERS;
  let managers = [PASTEUR];
  const managerRequests: { url: string; body: unknown }[] = [];
  fakeCurrentUser({ superAdmin: true });
  worker.use(
    http.get("*/admin/users/institutional-counts", () =>
      HttpResponse.json({
        data: { organizations: {}, osus: {}, laboratories: { UMR7358: 3 } },
      }),
    ),
    http.get("*/admin/institutional-groups/manager-counts", () =>
      HttpResponse.json({
        data: { organizations: {}, osus: {}, laboratories: { UMR7358: 1 } },
      }),
    ),
    http.get("*/admin/institutional-groups/:kind/:code/managers", () =>
      HttpResponse.json({ data: managers }),
    ),
    http.post(
      "*/admin/institutional-groups/:kind/:code/managers",
      async ({ request }) => {
        const body = (await request.json()) as { userId: string };
        managerRequests.push({ url: new URL(request.url).pathname, body });
        if (body.userId === CANDIDATE.id) managers = [...managers, CANDIDATE];
        return new HttpResponse(null, { status: 204 });
      },
    ),
    http.get("*/admin/users/search", () =>
      HttpResponse.json({ data: [CANDIDATE] }),
    ),
    http.delete("*/admin/users/:id/institutional-groups", ({ params }) => {
      members = members.filter((member) => member.id !== params.id);
      return new HttpResponse(null, { status: 204 });
    }),
    http.get("*/admin/users", ({ request }) => {
      const url = new URL(request.url);
      requested.push(url.search);
      const laboratory = url.searchParams.get("institutionalLaboratory");
      const matching = members.filter(
        (member) => member.institutionalLaboratory === laboratory,
      );
      return HttpResponse.json({
        data: matching,
        meta: { total: matching.length },
      });
    }),
  );
  return { requested, managerRequests };
}

const renderLaboratories = (url = "/institutional-groups/laboratories") =>
  renderRoute(url);

const searchInstitution = async (
  screen: Awaited<ReturnType<typeof renderLaboratories>>["screen"],
  term: string,
) => {
  await screen.getByRole("combobox", { name: "Institution" }).click();
  await screen.getByLabelText("Search institutions").fill(term);
};

const LORRAINE = "Université de Lorraine";
const ORLEANS = "Université d'Orléans";
const CNRS = "Centre National de la Recherche Scientifique (CNRS)";
const OSUC = "OSUC (OSUC)";

describe("LaboratoriesPage", () => {
  it("should keep only the laboratories of the chosen organization and record it in the URL", async () => {
    fakeApi();
    const { screen, router } = await renderLaboratories();

    await searchInstitution(screen, LORRAINE);
    await screen.getByRole("button", { name: LORRAINE, exact: true }).click();

    await expect
      .element(screen.getByRole("cell", { name: "CRPG", exact: true }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("cell", { name: "GEORESSOURCES", exact: true }))
      .toBeVisible();
    expect(
      screen.getByRole("cell", { name: "ISTerre", exact: true }).elements(),
    ).toHaveLength(0);
    expect(
      screen.getByRole("cell", { name: "ISTO", exact: true }).elements(),
    ).toHaveLength(0);
    await expect
      .poll(() => router.state.location.search)
      .toEqual({ institution: "organization:04vfs2w97" });
  });

  it("should narrow the laboratories further with an OSU", async () => {
    fakeApi();
    const { screen, router } = await renderLaboratories();

    await searchInstitution(screen, ORLEANS);
    await screen.getByRole("button", { name: OSUC, exact: true }).click();

    await expect
      .poll(() => router.state.location.search)
      .toEqual({ institution: "osu:014zrew76/OSUC" });
    await expect
      .element(screen.getByRole("cell", { name: "ISTO", exact: true }))
      .toBeVisible();
    expect(
      screen.getByRole("cell", { name: "ORN", exact: true }).elements(),
    ).toHaveLength(0);
    expect(
      screen.getByRole("cell", { name: "CRPG", exact: true }).elements(),
    ).toHaveLength(0);
  });

  it("should show the member count of every laboratory, zero included", async () => {
    fakeApi();
    const { screen } = await renderLaboratories();

    await expect
      .element(
        screen
          .getByRole("row", { name: /CRPG/ })
          .getByRole("cell", { name: "3", exact: true }),
      )
      .toBeVisible();
    await expect
      .element(
        screen
          .getByRole("row", { name: /GEORESSOURCES/ })
          .getByRole("cell", { name: "0", exact: true }),
      )
      .toBeVisible();
  });

  it("should open a laboratory from its row and show it with its members only", async () => {
    const { requested } = fakeApi();
    const { screen, router } = await renderLaboratories();

    await screen.getByRole("cell", { name: "CRPG", exact: true }).click();

    await expect
      .poll(() => router.state.location.pathname)
      .toBe("/institutional-groups/laboratories/UMR7358");
    await expect
      .element(
        screen.getByRole("heading", {
          name: "Centre de recherches pétrographiques et géochimiques",
        }),
      )
      .toBeVisible();
    await expect
      .element(
        screen.getByText(
          "Observatoire Terre et Environnement de Lorraine (OTELo)",
        ),
      )
      .toBeVisible();
    await expect
      .element(screen.getByRole("definition").getByText(LORRAINE))
      .toBeVisible();
    await expect
      .element(screen.getByRole("definition").getByText(CNRS))
      .toBeVisible();
    await expect
      .element(
        screen.getByRole("cell", { name: "crpg.member@univ-lorraine.fr" }),
      )
      .toBeVisible();
    expect(
      screen
        .getByRole("cell", { name: "isterre.member@univ-grenoble.fr" })
        .elements(),
    ).toHaveLength(0);
    expect(requested.at(-1)).toContain("institutionalLaboratory=UMR7358");
  });

  it("should drop a member from the laboratory once the removal is confirmed", async () => {
    fakeApi();
    const { screen } = await renderLaboratories(
      "/institutional-groups/laboratories/UMR7358",
    );
    await expect
      .element(
        screen.getByRole("cell", { name: "crpg.member@univ-lorraine.fr" }),
      )
      .toBeVisible();

    await screen
      .getByRole("button", {
        name: "Remove Claire Petrographer from their institution",
      })
      .click();
    await screen
      .getByRole("button", { name: "Remove from institution", exact: true })
      .click();

    await expect
      .poll(() =>
        screen
          .getByRole("cell", { name: "crpg.member@univ-lorraine.fr" })
          .elements(),
      )
      .toHaveLength(0);
    await expect
      .element(
        screen.getByRole("heading", {
          name: "Centre de recherches pétrographiques et géochimiques",
        }),
      )
      .toBeVisible();
  });

  it("should list the managers of a laboratory on its detail page", async () => {
    fakeApi();
    const { screen } = await renderLaboratories(
      "/institutional-groups/laboratories/UMR7358",
    );

    await expect
      .element(screen.getByRole("heading", { name: "Managers" }))
      .toBeVisible();
    await expect
      .element(
        screen
          .getByRole("row", { name: /Louis Pasteur/ })
          .getByRole("cell", { name: PASTEUR.email }),
      )
      .toBeVisible();
  });

  it("should add a manager to the laboratory", async () => {
    const { managerRequests } = fakeApi();
    const { screen } = await renderLaboratories(
      "/institutional-groups/laboratories/UMR7358",
    );

    await screen.getByRole("button", { name: "Add a manager" }).click();
    await screen.getByRole("combobox", { name: "User" }).click();
    await screen
      .getByRole("combobox", { name: "Search by name or email" })
      .fill("lov");
    await screen.getByRole("option", { name: /Lovelace/ }).click();
    await screen.getByRole("button", { name: "Add", exact: true }).click();

    await expect
      .element(
        screen
          .getByRole("row", { name: /Ada Lovelace/ })
          .getByRole("cell", { name: CANDIDATE.email }),
      )
      .toBeVisible();
    expect(managerRequests).toEqual([
      {
        url: "/admin/institutional-groups/laboratory/UMR7358/managers",
        body: { userId: CANDIDATE.id },
      },
    ]);
  });

  it("should show the active manager count of every laboratory, zero warned", async () => {
    fakeApi();
    const { screen } = await renderLaboratories();

    await expect
      .element(
        screen
          .getByRole("row", { name: /CRPG/ })
          .getByRole("cell", { name: "1", exact: true }),
      )
      .toBeVisible();
    await expect
      .element(
        screen
          .getByRole("row", { name: /GEORESSOURCES/ })
          .getByRole("cell", { name: "0 (no active manager)" }),
      )
      .toBeVisible();
  });

  it("should say a laboratory is unknown and ask for no member", async () => {
    const { requested } = fakeApi();
    const { screen } = await renderLaboratories(
      "/institutional-groups/laboratories/NOPE",
    );

    await expect.element(screen.getByRole("alert")).toBeVisible();
    expect(requested).toHaveLength(0);
  });

  it.each(["centre de recherche", "CRPG"])(
    "should keep only the laboratories matching %s",
    async (search) => {
      fakeApi();
      const { screen } = await renderLaboratories(
        "/institutional-groups/laboratories?institution=organization:04vfs2w97",
      );

      await screen
        .getByRole("searchbox", { name: "Search laboratories" })
        .fill(search);

      await expect
        .poll(() =>
          screen
            .getByRole("cell", { name: "GEORESSOURCES", exact: true })
            .elements(),
        )
        .toHaveLength(0);
      await expect
        .element(screen.getByRole("cell", { name: "CRPG", exact: true }))
        .toBeVisible();
    },
  );
});
