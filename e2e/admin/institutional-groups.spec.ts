import { institutionalGroupsListPage } from "../support/admin/institutional-groups-list.page";
import { institutionalGroupsPage } from "../support/admin/institutional-groups.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import { settingsPage } from "../support/admin/settings.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { test } from "../support/db";

test.describe("institutional groups", () => {
  test("a researcher declares their institution before reaching the app", async ({
    page,
  }) => {
    const groups = institutionalGroupsPage(page);
    const samples = sampleListPage(page);
    const settings = settingsPage(page);

    await signInAsResearcher(page, RESEARCHERS.theo);
    await groups.expectShown();

    await groups.declare({
      organization: "Université de Lorraine",
      osu: "Observatoire Terre et Environnement de Lorraine",
      laboratory: "Centre de recherches pétrographiques et géochimiques",
    });

    await samples.expectVisible();
    await groups.expectNotShown();

    await page.reload();

    await samples.expectVisible();
    await groups.expectNotShown();

    await settings.open();
    await settings.setInstitution({
      organization: "Université Grenoble Alpes",
      osu: "Observatoire des Sciences de l’Univers de Grenoble",
      laboratory: "ISTerre",
    });

    await page.reload();

    await settings.expectInstitution("ISTerre");
  });

  test("a super admin browses the laboratories of an organization and their members", async ({
    page,
  }) => {
    const lists = institutionalGroupsListPage(page);

    await signInAsResearcher(page, RESEARCHERS.nadia);
    await lists.openLaboratories();
    await lists.expectLaboratories();

    await lists.filterByOrganization("Université de Lorraine");
    await lists.expectLaboratoryRow("CRPG");
    await lists.expectNoLaboratoryRow("ISTerre");

    await lists.openLaboratory("UMR7358");

    await lists.expectMember("nadia.leroy@univ-lorraine.fr");

    await lists.openLaboratories();
    await lists.openLaboratory("UAR 2050");
    await lists.expectLaboratoryCode("UAR 2050");
  });

  test("a researcher who is not a super admin cannot reach the institutional groups", async ({
    page,
  }) => {
    const lists = institutionalGroupsListPage(page);
    const samples = sampleListPage(page);

    await signInAsResearcher(page, RESEARCHERS.jean);
    await lists.gotoOrganizations();

    await samples.expectVisible();
    await lists.expectNoMenuSection();
  });
});
