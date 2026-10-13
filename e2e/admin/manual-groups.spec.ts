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
import { expect, test } from "../support/db";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";
import { sampleListPage as publicSampleListPage } from "../support/frontend/sample-list.page";
import { frontendUrl } from "../support/urls";

const uniqueName = (name: string) => `${name} ${Date.now()}`;

test.describe("manual groups", () => {
  test("a manual group member publishes a sample under their group", async ({
    page,
    browser,
  }) => {
    test.slow();
    const groups = manualGroupsPage(page);
    const group = manualGroupPage(page);
    const name = uniqueName("Team Gabbro");
    const other = uniqueName("Team Tuff");
    const sampleName = uniqueName("Gabbro core");

    await signInAsResearcher(page, RESEARCHERS.nadia);
    await groups.open();
    for (const groupName of [name, other]) {
      await groups.create(groupName);
      await groups.openGroup(groupName);
      await group.associate("Martin", RESEARCHERS.jean.email);
      await group.expectMember(RESEARCHERS.jean.email, "Active");
      await groups.open();
    }

    const memberPage = await signInAsResearcherInOwnSession(
      browser,
      RESEARCHERS.jean,
    );
    const settings = settingsPage(memberPage);
    await settings.openGroups();
    await settings.expectManualGroup(name);
    await settings.expectNoManualGroupEditControl();

    const list = sampleListPage(memberPage);
    const edit = sampleEditPage(memberPage);
    const create = sampleCreatePage(memberPage);
    await edit.goToList();
    await list.goToCreate();
    await create.expectVisible();
    await create.fillName(sampleName);
    await create.attachManualGroup(name);
    await create.submit();
    await edit.expectName(sampleName);

    await edit.fillPublishableFields();
    await edit.publish();
    await list.expectVisible();

    await list.openSample(sampleName);
    await edit.expectManualGroupFrozen(name);
    const sampleId = edit.sampleId();
    const igsn = await edit.publicPageIgsn();

    await settings.openProfile();
    const link = await settings.groupSamplesLink(name);
    expect(link).toContain(`${frontendUrl}/search?manualGroup=`);

    const publicList = publicSampleListPage(memberPage);
    await publicList.gotoWithSearch(link.split("?")[1]!);
    await publicList.expectFacetValue("Other group (team, project…)", name);

    const detail = sampleDetailPage(memberPage);
    await detail.goto(igsn);
    await detail.expectSample(sampleName, igsn);
    await detail.expectManualGroup(name);

    await edit.goto(sampleId);
    await settings.openGroups();
    await settings.expectManualGroupLeaveLocked(name);
    await settings.leaveManualGroup(other);
    await settings.expectManualGroup(name);
    await settings.expectNoManualGroup(other);

    await memberPage.context().close();
  });
});
