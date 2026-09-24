import { institutionalGroupsListPage } from "../support/admin/institutional-groups-list.page";
import { institutionalGroupsPage } from "../support/admin/institutional-groups.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import { settingsPage } from "../support/admin/settings.page";
import { signInAsResearcher } from "../support/admin/sign-in";
import { test } from "../support/db";

test.describe("institutional groups", () => {
  test("a researcher declares their institution before reaching the app", async ({
    page,
    world,
  }) => {
    const groups = institutionalGroupsPage(page);
    const samples = sampleListPage(page);
    const settings = settingsPage(page);
    const declared = world.institutions.jean;
    const moved = world.institutions.sophie;

    await signInAsResearcher(page, world.researchers.theo);
    await groups.expectShown();

    await groups.declare(declared);

    await samples.expectVisible();
    await groups.expectNotShown();

    await page.reload();

    await samples.expectVisible();
    await groups.expectNotShown();

    await settings.open();
    await settings.setInstitution(moved);

    await page.reload();

    await settings.expectInstitution(moved.laboratoryAcronym);
  });

  test("a super admin browses the laboratories of an organization and their members", async ({
    page,
    world,
  }) => {
    const lists = institutionalGroupsListPage(page);
    const own = world.institutions.nadia;
    const elsewhere = world.institutions.sophie;

    await signInAsResearcher(page, world.researchers.nadia);
    await lists.openLaboratories();
    await lists.expectLaboratories();

    await lists.filterByOrganization(own.organization);
    await lists.expectLaboratoryRow(own.laboratoryCode);
    await lists.expectNoLaboratoryRow(elsewhere.laboratoryCode);

    await lists.openLaboratory(own.laboratoryCode);

    await lists.expectMember(world.researchers.nadia.email);

    await lists.openLaboratories();
    await lists.openLaboratory("UAR 2050");
    await lists.expectLaboratoryCode("UAR 2050");
  });

  test("a researcher who is not a super admin cannot reach the institutional groups", async ({
    page,
    world,
  }) => {
    const lists = institutionalGroupsListPage(page);
    const samples = sampleListPage(page);

    await signInAsResearcher(page, world.researchers.jean);
    await lists.gotoOrganizations();

    await samples.expectVisible();
    await lists.expectNoMenuSection();
  });
});
