import { manualGroupPage } from "../support/admin/manual-group.page";
import { manualGroupsPage } from "../support/admin/manual-groups.page";
import { sampleCreatePage } from "../support/admin/sample-create.page";
import { sampleEditPage } from "../support/admin/sample-edit.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import { settingsPage } from "../support/admin/settings.page";
import {
  RESEARCHERS,
  signInAsResearcher,
  signInAsResearcherInOwnSession,
} from "../support/admin/sign-in";
import { test } from "../support/db";
import { maildev } from "../support/maildev";

const uniqueName = (name: string) => `${name} ${Date.now()}`;

test.describe("manual groups", () => {
  test("a super admin runs a manual group through its lifecycle", async ({
    page,
    request,
  }) => {
    const groups = manualGroupsPage(page);
    const group = manualGroupPage(page);
    const name = uniqueName("Team Basalt");

    await signInAsResearcher(page, RESEARCHERS.nadia);
    await groups.open();
    await groups.expectVisible();

    await groups.create(name);
    await groups.expectGroupRow(name, 0);

    await groups.openGroup(name);
    await group.expectVisible(name);
    await group.expectNoSuggestion("Roux");
    await group.associate("Martin", RESEARCHERS.jean.email);
    await group.expectMember(RESEARCHERS.jean.email, "Active");

    await maildev(request).expectMail(
      RESEARCHERS.jean.email,
      `Nadia Leroy added you to the group "${name}"`,
      "/settings",
    );

    await group.detach("Jean Martin");
    await group.expectNoMember(RESEARCHERS.jean.email);

    const renamed = uniqueName("Team Andesite");
    await group.rename(renamed);
    await group.expectVisible(renamed);

    await group.remove();
    await groups.expectVisible();
    await groups.expectNoGroupRow(renamed);
  });

  test("a super admin searches the manual groups by name", async ({ page }) => {
    const groups = manualGroupsPage(page);
    const matching = uniqueName("Volcano watchers");
    const other = uniqueName("Sediment readers");

    await signInAsResearcher(page, RESEARCHERS.nadia);
    await groups.open();
    await groups.create(matching);
    await groups.create(other);

    await groups.search("Volcano watchers");

    await groups.expectGroupRow(matching, 0);
    await groups.expectNoGroupRow(other);
  });

  test("a member reads their manual groups in their settings and cannot edit them", async ({
    page,
    browser,
  }) => {
    const groups = manualGroupsPage(page);
    const group = manualGroupPage(page);
    const first = uniqueName("Andesite crew");
    const second = uniqueName("Tuff crew");

    await signInAsResearcher(page, RESEARCHERS.nadia);
    await groups.open();
    for (const name of [first, second]) {
      await groups.create(name);
      await groups.openGroup(name);
      await group.associate("Durand", RESEARCHERS.pierre.email);
      await group.expectMember(RESEARCHERS.pierre.email, "Active");
      await groups.open();
    }

    const memberPage = await signInAsResearcherInOwnSession(
      browser,
      RESEARCHERS.pierre,
    );
    const settings = settingsPage(memberPage);
    await settings.open();

    await settings.expectManualGroup(first);
    await settings.expectManualGroup(second);
    await settings.expectNoManualGroupEditControl();

    await memberPage.context().close();
  });

  test("a researcher who is not a super admin cannot reach the manual groups", async ({
    page,
  }) => {
    const groups = manualGroupsPage(page);
    const samples = sampleListPage(page);

    await signInAsResearcher(page, RESEARCHERS.jean);
    await groups.goto();

    await samples.expectVisible();
    await groups.expectNoMenuEntry();
  });

  test("a sample created by a manual group member belongs to no manual group", async ({
    page,
    browser,
  }) => {
    const groups = manualGroupsPage(page);
    const group = manualGroupPage(page);
    const name = uniqueName("Team Gabbro");
    const sampleName = uniqueName("Gabbro core");

    await signInAsResearcher(page, RESEARCHERS.nadia);
    await groups.open();
    await groups.create(name);
    await groups.openGroup(name);
    await group.associate("Martin", RESEARCHERS.jean.email);
    await group.expectMember(RESEARCHERS.jean.email, "Active");

    const memberPage = await signInAsResearcherInOwnSession(
      browser,
      RESEARCHERS.jean,
    );
    const settings = settingsPage(memberPage);
    await settings.open();
    await settings.expectManualGroup(name);

    const list = sampleListPage(memberPage);
    const edit = sampleEditPage(memberPage);
    const create = sampleCreatePage(memberPage);
    await edit.goToList();
    await list.goToCreate();
    await create.expectVisible();
    await create.fillName(sampleName);
    await create.selectNature("Hand sample");
    await create.submit();
    await edit.expectName(sampleName);

    await memberPage.context().close();

    await page.reload();
    await group.expectVisible(name);
    await group.expectMember(RESEARCHERS.jean.email, "Active");
    await group.expectNothingAbout(sampleName);

    await groups.open();
    await groups.expectGroupRow(name, 1);
  });
});
