import { sampleCreatePage } from "../support/admin/sample-create.page";
import { sampleEditPage } from "../support/admin/sample-edit.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { test } from "../support/db";

test.describe("samples", () => {
  test("a researcher browses the samples list", async ({ page, samples }) => {
    await signInAsResearcher(page, RESEARCHERS.jean);

    const list = sampleListPage(page);
    await list.expectVisible();
    await list.expectColumns();
    for (const sample of samples) {
      await list.expectSampleRowWithNature(sample.name, sample.nature);
    }
  });

  test("a researcher declares a new sample", async ({ page }) => {
    await signInAsResearcher(page, RESEARCHERS.pierre);

    const list = sampleListPage(page);
    await list.goToCreate();

    const create = sampleCreatePage(page);
    await create.expectVisible();
    // Unique per run so the new row is unambiguous on the throwaway stack.
    const name = `Basalte du Massif Central ${Date.now()}`;
    await create.fillName(name);
    await create.selectNature("Thin section");
    await create.submit();

    // Creating opens the new sample for further editing.
    const edit = sampleEditPage(page);
    await edit.expectVisible();
    await edit.expectName(name);

    // Back on the list, the new sample tops the table (ordered by last
    // modified).
    await edit.goToList();
    await list.expectVisible();
    await list.expectSampleRow(name);
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
