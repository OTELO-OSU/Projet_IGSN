import { sampleEditPage } from "../support/admin/sample-edit.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import { sampleModerationPage } from "../support/admin/sample-moderation.page";
import {
  RESEARCHERS,
  signInAsResearcher,
  signInAsResearcherInOwnSession,
} from "../support/admin/sign-in";
import { sampleNamed, test, tombstone } from "../support/db";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";

test.describe("tombstone", () => {
  test("a space manager tombstones a published sample of the labs it manages", async ({
    page,
    browser,
    samples,
  }) => {
    test.slow();
    const sample = sampleNamed(samples, "Basalt 42");
    const moderation = sampleModerationPage(page);
    const edit = sampleEditPage(page);

    await signInAsResearcher(page, RESEARCHERS.marie);
    await moderation.open();
    await moderation.expectVisible();
    await moderation.openSample(sample.name);

    await edit.expectVisible();
    await edit.saveAnd("Tombstone");
    await moderation.expectVisible();

    const ownerPage = await signInAsResearcherInOwnSession(
      browser,
      RESEARCHERS.jean,
    );
    const ownerList = sampleListPage(ownerPage);
    const ownerEdit = sampleEditPage(ownerPage);
    await ownerList.expectVisible();
    await ownerList.expectNoSampleRow(sample.name);
    await ownerEdit.goto(sample.id);
    await ownerEdit.expectNotFound();
    await ownerPage.context().close();

    const detail = sampleDetailPage(page);
    await detail.goto(sample.igsn);
    await detail.expectNotFound(sample.name);
  });

  test("a space manager restores a tombstoned sample as withdrawn, then republishes it", async ({
    page,
    samples,
  }) => {
    const sample = tombstone(samples);
    const moderation = sampleModerationPage(page);
    const edit = sampleEditPage(page);

    await signInAsResearcher(page, RESEARCHERS.marie);
    await moderation.open();
    await moderation.openSample(sample.name);

    await edit.restoreAsWithdrawn();

    await edit.expectWithdrawnHint();
    await edit.expectSaveMenuItem("Tombstone");
    await edit.republish();

    const detail = sampleDetailPage(page);
    await detail.goto(sample.igsn);
    await detail.expectSample(sample.name, sample.igsn);
  });
});
