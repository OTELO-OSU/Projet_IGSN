import { sampleCreatePage } from "../support/admin/sample-create.page";
import { sampleEditPage } from "../support/admin/sample-edit.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import {
  RESEARCHERS,
  completeIdpLogin,
  signInAsResearcher,
} from "../support/admin/sign-in";
import { sampleNamed, test } from "../support/db";
import { headerPage } from "../support/frontend/header.page";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";

test.describe("sub samples", () => {
  test("a researcher declares a sub sample of a sample they published", async ({
    page,
    samples,
  }) => {
    const draft = samples.find(
      (sample) => sample.status === "draft" && sample.owner === "pierre",
    );
    if (!draft) throw new Error("seed must include a draft sample for pierre");

    await signInAsResearcher(page, RESEARCHERS.pierre);
    const list = sampleListPage(page);
    const create = sampleCreatePage(page);
    const edit = sampleEditPage(page);

    const parentName = `Sub sample parent ${Date.now()}`;
    await list.goToCreate();
    await create.expectVisible();
    await create.fillName(parentName);
    await create.selectNature("Thin section");
    await create.fillPublishableFields({ material: "Mineral" });
    await create.publish();

    await list.expectVisible();
    await list.expectSampleRow(draft.name);
    await list.expectNoSubSampleAction(draft.name);
    await list.openSample(parentName);
    await edit.expectVisible();
    const parent = { name: parentName, igsn: await edit.publicPageIgsn() };
    await edit.goToList();

    await list.addSubSample(parentName);
    await create.expectSubSampleVisible(parentName);
    await create.expectName("");
    await create.expectNatureEmpty();
    await create.expectHierarchyLevel("Dredge");
    await create.expectParentTab(parent);
    await create.expectInheritedLocation(parentName);

    const subSampleName = `Sub sample ${Date.now()}`;
    await create.openTab("Identity");
    await create.fillName(subSampleName);
    await create.submit();
    await edit.expectVisible();

    await edit.goToList();
    await list.openSample(subSampleName);
    await edit.expectVisible();
    await edit.expectParentTab(parent);
    await edit.expectInheritedLocation(parentName);

    await edit.openTab("Identity");
    await edit.pick("Nature", "Thin section");
    await edit.publish();
    await list.expectVisible();
    await list.openSample(subSampleName);
    const subSampleIgsn = await edit.publicPageIgsn();

    const detail = sampleDetailPage(page);
    await detail.goto(subSampleIgsn);
    await detail.expectSample(subSampleName, subSampleIgsn);
    await detail.expectParent(parent.name, parent.igsn);
  });

  test("a stranger declares a sub sample from the public page, making the parent owner a contributor", async ({
    page,
    browser,
  }) => {
    test.slow();
    await signInAsResearcher(page, RESEARCHERS.marie);
    const list = sampleListPage(page);
    const create = sampleCreatePage(page);
    const edit = sampleEditPage(page);

    const parentName = `Published parent ${Date.now()}`;
    await list.goToCreate();
    await create.expectVisible();
    await create.fillName(parentName);
    await create.selectNature("Thin section");
    await create.fillPublishableFields({ material: "Mineral" });
    await create.publish();

    await list.expectVisible();
    await list.openSample(parentName);
    await edit.expectVisible();
    const parent = {
      id: edit.sampleId(),
      name: parentName,
      igsn: await edit.publicPageIgsn(),
    };

    const strangerContext = await browser.newContext();
    const strangerPage = await strangerContext.newPage();
    const header = headerPage(strangerPage);
    const detail = sampleDetailPage(strangerPage);
    const strangerCreate = sampleCreatePage(strangerPage);
    const strangerEdit = sampleEditPage(strangerPage);

    await detail.goto(parent.igsn);
    await header.signIn();
    await completeIdpLogin(strangerPage, RESEARCHERS.jean);
    await header.expectSignedIn();

    const accessAnswered = header.accessAnswered(parent.id);
    await detail.goto(parent.igsn);
    await accessAnswered;
    await header.expectNoEditLink();

    await detail.addSubSample();
    await strangerCreate.expectSubSampleVisible(parent.name);
    await strangerCreate.expectParentTab(parent);
    await strangerCreate.expectInheritedLocation(parent.name);

    const subSampleName = `Stranger sub sample ${Date.now()}`;
    await strangerCreate.openTab("Identity");
    await strangerCreate.fillName(subSampleName);
    await strangerCreate.submit();
    await strangerEdit.expectVisible();
    await strangerContext.close();

    await edit.goToList();
    await list.filterByOwnership("Shared with me");
    await list.expectSampleRow(subSampleName);
  });

  test("the edit page of a published sample offers to add a sub sample", async ({
    page,
    samples,
  }) => {
    const parent = sampleNamed(samples, "Granite 7");

    await signInAsResearcher(page, RESEARCHERS.pierre);
    const list = sampleListPage(page);
    await list.openSample(parent.name);

    const edit = sampleEditPage(page);
    await edit.expectVisible();
    await edit.expectAddSubSampleAction(parent.name);
  });
});
