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
      profile: { identity_provider: "shibboleth", name: "Marie Dupont" },
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
  },
];

function fakeApi() {
  const requested: string[] = [];
  fakeCurrentUser({ superAdmin: true });
  worker.use(
    http.get("*/admin/users", ({ request }) => {
      const url = new URL(request.url);
      requested.push(url.search);
      const laboratory = url.searchParams.get("institutionalLaboratory");
      const matching = MEMBERS.filter(
        (member) => member.institutionalLaboratory === laboratory,
      );
      return HttpResponse.json({
        data: matching,
        meta: { total: matching.length },
      });
    }),
  );
  return { requested };
}

const renderLaboratories = (url = "/institutional-groups/laboratories") =>
  renderRoute(url);

const chooseOption = async (
  screen: Awaited<ReturnType<typeof renderLaboratories>>["screen"],
  {
    filter,
    search,
    option,
  }: { filter: string; search: string; option: string },
) => {
  await screen.getByRole("combobox", { name: filter }).click();
  await screen.getByPlaceholder(search).fill(option);
  await screen.getByRole("option", { name: option }).click();
};

const ORGANIZATION_FILTER = "Organization";
const ORGANIZATION_SEARCH = "Search organizations...";
const OSU_FILTER = "OSU";
const OSU_SEARCH = "Search OSUs...";
const LORRAINE = "Université de Lorraine";
const CNRS = "Centre National de la Recherche Scientifique (CNRS)";
const OSUC = "OSUC (OSUC)";

describe("LaboratoriesPage", () => {
  it("should keep only the laboratories of the chosen organization and record it in the URL", async () => {
    fakeApi();
    const { screen, router } = await renderLaboratories();

    await chooseOption(screen, {
      filter: ORGANIZATION_FILTER,
      search: ORGANIZATION_SEARCH,
      option: LORRAINE,
    });

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
      .toEqual({ organization: "04vfs2w97" });
  });

  it("should narrow the laboratories further with an OSU", async () => {
    fakeApi();
    const { screen } = await renderLaboratories(
      "/institutional-groups/laboratories?organization=014zrew76",
    );

    await chooseOption(screen, {
      filter: OSU_FILTER,
      search: OSU_SEARCH,
      option: OSUC,
    });

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

  it("should drop the OSU when the organization changes", async () => {
    fakeApi();
    const { screen, router } = await renderLaboratories(
      "/institutional-groups/laboratories?organization=014zrew76&osu=OSUC",
    );

    await chooseOption(screen, {
      filter: ORGANIZATION_FILTER,
      search: ORGANIZATION_SEARCH,
      option: LORRAINE,
    });

    await expect
      .poll(() => router.state.location.search)
      .toEqual({ organization: "04vfs2w97" });
    await expect
      .element(screen.getByRole("cell", { name: "CRPG", exact: true }))
      .toBeVisible();
  });

  it("should ignore an OSU that comes without an organization", async () => {
    fakeApi();
    const { screen } = await renderLaboratories(
      "/institutional-groups/laboratories?osu=OSUC",
    );

    await expect
      .element(screen.getByRole("cell", { name: "ISTO", exact: true }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("cell", { name: "CRPG", exact: true }))
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
    await expect.element(screen.getByText(LORRAINE)).toBeVisible();
    await expect.element(screen.getByText(CNRS)).toBeVisible();
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

  it("should say a laboratory is unknown and ask for no member", async () => {
    const { requested } = fakeApi();
    const { screen } = await renderLaboratories(
      "/institutional-groups/laboratories/NOPE",
    );

    await expect.element(screen.getByRole("alert")).toBeVisible();
    expect(requested).toHaveLength(0);
  });
});
