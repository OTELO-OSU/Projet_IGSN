import { sampleCreatePage } from "../support/admin/sample-create.page";
import { sampleEditPage } from "../support/admin/sample-edit.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { test } from "../support/db";

test.describe("samples", () => {
  test("a researcher browses the samples they declared", async ({
    page,
    samples,
  }) => {
    await signInAsResearcher(page, RESEARCHERS.jean);

    const list = sampleListPage(page);
    await list.expectVisible();
    await list.expectColumns();
    for (const sample of samples.filter((s) => s.owner === "jean")) {
      await list.expectSampleRowWithNature(sample.name, sample.nature);
    }
    for (const sample of samples.filter((s) => s.owner !== "jean")) {
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

  test("the create form rejects a sample without a name", async ({ page }) => {
    await signInAsResearcher(page, RESEARCHERS.camille);

    const list = sampleListPage(page);
    await list.goToCreate();

    const create = sampleCreatePage(page);
    await create.submit();

    await create.expectNameRequired();
    await create.expectVisible();
  });
});
