import { sampleCreatePage } from "../support/admin/sample-create.page";
import { sampleEditPage } from "../support/admin/sample-edit.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { test } from "../support/db";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";

test.describe("samples", () => {
  test("a researcher browses the samples they declared", async ({
    page,
    samples,
  }) => {
    await signInAsResearcher(page, RESEARCHERS.jean);

    const list = sampleListPage(page);
    await list.expectVisible();
    await list.expectColumns();
    const mine = (s: (typeof samples)[number]) =>
      s.owner === "jean" && s.status !== "tombstone";
    for (const sample of samples.filter(mine)) {
      await list.expectSampleRowWithNature(sample.name, sample.nature);
    }
    for (const sample of samples.filter((s) => !mine(s))) {
      await list.expectNoSampleRow(sample.name);
    }
  });

  test("a researcher declares a new sample", async ({ page }) => {
    await signInAsResearcher(page, RESEARCHERS.pierre);

    const list = sampleListPage(page);
    await list.goToCreate();

    const create = sampleCreatePage(page);
    await create.expectVisible();
    const name = `Basalte du Massif Central ${Date.now()}`;
    await create.fillName(name);
    await create.selectNature("Thin section");
    await create.submit();

    const edit = sampleEditPage(page);
    await edit.expectVisible();
    await edit.expectName(name);

    await edit.goToList();
    await list.expectVisible();
    await list.expectSampleRow(name);
  });

  test("a researcher sees no sample declared by someone else", async ({
    page,
    samples,
  }) => {
    await signInAsResearcher(page, RESEARCHERS.luc);

    const list = sampleListPage(page);
    await list.expectVisible();
    await list.expectEmpty();

    const edit = sampleEditPage(page);
    await edit.goto(samples[0]!.id);
    await edit.expectForbidden();
  });

  test("a researcher tells their own samples from the shared ones", async ({
    page,
    samples,
  }) => {
    await signInAsResearcher(page, RESEARCHERS.camille);

    const owned = samples.filter((sample) => sample.owner === "camille");
    const shared = samples.filter((sample) =>
      sample.collaborators.some(
        (collaborator) => collaborator.researcher === "camille",
      ),
    );

    const list = sampleListPage(page);
    const expectOnly = async (
      visible: typeof samples,
      hidden: typeof samples,
    ) => {
      for (const sample of visible) {
        await list.expectSampleRow(sample.name);
      }
      for (const sample of hidden) {
        await list.expectNoSampleRow(sample.name);
      }
    };

    await list.expectVisible();
    await expectOnly([...owned, ...shared], []);

    await list.filterByOwnership("Mine");
    await expectOnly(owned, shared);

    await list.filterByOwnership("Shared with me");
    await expectOnly(shared, owned);

    await list.filterByOwnership("All samples");
    await expectOnly([...owned, ...shared], []);
  });

  test("an owner withdraws a published sample and republishes it", async ({
    page,
    samples,
  }) => {
    const sample = samples.find((candidate) => candidate.name === "Basalt 42");
    if (!sample?.igsn) {
      throw new Error("seed must include the published Basalt 42 sample");
    }

    await signInAsResearcher(page, RESEARCHERS.jean);
    const list = sampleListPage(page);
    await list.openSample(sample.name);

    const edit = sampleEditPage(page);
    await edit.expectVisible();
    await edit.withdraw();
    await edit.expectWithdrawnHint();
    await edit.expectStatusAction("Republish");

    const detail = sampleDetailPage(page);
    await detail.goto(sample.igsn);
    await detail.expectWithdrawnNotice();

    await edit.goto(sample.id);
    await edit.republish();
    await edit.expectWithdrawInMenu();
  });

  test("a researcher publishes a new sample straight as withdrawn", async ({
    page,
  }) => {
    await signInAsResearcher(page, RESEARCHERS.pierre);
    const list = sampleListPage(page);
    await list.goToCreate();

    const create = sampleCreatePage(page);
    const name = `Withdrawn on arrival ${Date.now()}`;
    await create.fillName(name);
    await create.selectNature("Thin section");
    await create.submit();

    const edit = sampleEditPage(page);
    await edit.expectName(name);
    await edit.fillPublishableFields();
    await edit.publishAsWithdrawn();
    await list.expectVisible();

    await list.openSample(name);
    await edit.expectWithdrawnHint();
    await edit.expectStatusAction("Republish");
    const igsn = await edit.publicPageIgsn();

    const detail = sampleDetailPage(page);
    await detail.goto(igsn);
    await detail.expectWithdrawnNotice();
  });

  test("the create form rejects a sample without a name", async ({ page }) => {
    await signInAsResearcher(page, RESEARCHERS.camille);

    const list = sampleListPage(page);
    await list.goToCreate();

    const create = sampleCreatePage(page);
    await create.submit();

    await create.expectNameRequired();
    await create.expectVisible();
  });

  test("a researcher deletes their own draft, but never a published sample", async ({
    page,
    samples,
  }) => {
    const draft = samples.find(
      (sample) => sample.status === "draft" && sample.owner === "jean",
    );
    const published = samples.find(
      (sample) => sample.status === "published" && sample.owner === "jean",
    );
    if (!draft || !published) {
      throw new Error("seed must give jean a draft and a published sample");
    }

    await signInAsResearcher(page, RESEARCHERS.jean);
    const list = sampleListPage(page);
    const edit = sampleEditPage(page);

    await list.openSample(draft.name);
    await edit.expectVisible();
    await edit.expectDeleteRefused();
    await edit.goToList();
    await list.expectSampleRow(draft.name);

    await list.openSample(draft.name);
    await edit.expectVisible();
    await edit.deleteDraft();

    await list.expectVisible();
    await list.expectNoSampleRow(draft.name);
    await edit.goto(draft.id);
    await edit.expectNotFound();

    await edit.goToList();
    await list.openSample(published.name);
    await edit.expectVisible();
    await edit.expectNoDeleteAction();
  });
});
