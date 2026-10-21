import { adminPage } from "../support/admin/admin.page";
import { printSampleLabelPage } from "../support/admin/print-sample-label.page";
import { sampleEditPage } from "../support/admin/sample-edit.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import {
  RESEARCHERS,
  completeIdpLogin,
  signInAsResearcher,
} from "../support/admin/sign-in";
import { sampleNamed, test } from "../support/db";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";
import { maildev } from "../support/maildev";

test.describe("samples", () => {
  test("a researcher's list filter survives navigation and a new session until they reset it", async ({
    page,
    samples,
  }) => {
    const draft = samples.find(
      (sample) => sample.status === "draft" && sample.owner === "jean",
    );
    if (!draft) {
      throw new Error("seed must give jean a draft sample");
    }
    const published = sampleNamed(samples, "Basalt 42");

    await signInAsResearcher(page, RESEARCHERS.jean);
    const list = sampleListPage(page);
    await list.filterByStatus("Draft");
    await list.expectNoSampleRow(published.name);

    await list.openSample(draft.name);
    await sampleEditPage(page).expectVisible();
    await list.openFromSidebar();
    await list.expectStatusFilter("Draft");
    await list.expectSampleRow(draft.name);
    await list.expectNoSampleRow(published.name);

    const admin = adminPage(page);
    await admin.signOut();
    await completeIdpLogin(page, RESEARCHERS.jean);
    await admin.expectSignedIn();
    await list.expectStatusFilter("Draft");
    await list.expectNoSampleRow(published.name);

    await list.resetFilters();
    await list.expectSampleRow(published.name);
    await page.reload();
    await list.expectSampleRow(published.name);
    await list.expectNoStatusFilter();
  });

  test("an owner prints a published sample's label, withdraws it, readers see its reduced page, then the owner republishes it", async ({
    page,
    samples,
  }) => {
    const sample = sampleNamed(samples, "Basalt 42");

    await signInAsResearcher(page, RESEARCHERS.jean);
    const list = sampleListPage(page);
    await list.openSample(sample.name);

    const edit = sampleEditPage(page);
    await edit.expectVisible();

    const label = printSampleLabelPage(page);
    await label.open();
    await label.pickSize("5 cm");
    await label.emulatePrint();
    await label.expectOnlyLabelPrinted(sample.igsn, 5);
    await label.close();

    await edit.saveAnd("Withdraw");
    await edit.expectWithdrawnHint();
    await edit.expectStatusAction("Republish");

    const detail = sampleDetailPage(page);
    await detail.goto(sample.igsn);
    await detail.expectWithdrawnNotice();
    await detail.expectSample(sample.name, sample.igsn);
    await detail.expectNoSection("Location");
    await detail.expectNoIndex();
    await detail.openContactForm();

    await edit.goto(sample.id);
    await edit.republish();
    await edit.expectSaveMenuItem("Withdraw");
  });

  test("a researcher deletes their own draft, but asks the super admin to delete a published sample", async ({
    page,
    request,
    samples,
  }) => {
    const draft = samples.find(
      (sample) => sample.status === "draft" && sample.owner === "jean",
    );
    if (!draft) {
      throw new Error("seed must give jean a draft sample");
    }
    const published = sampleNamed(samples, "Basalt 42");
    const reason = `Duplicate of a colleague's sample ${Date.now()}`;

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
    await edit.expectDeletionRequestRefused();
    await edit.requestDeletion(reason);
    await edit.expectDeletionRequestSent();

    await maildev(request).expectMail(
      RESEARCHERS.nadia.email,
      `Jean Martin requests the deletion of the sample "${published.name}"`,
      [published.igsn, reason, `/samples/${published.id}`],
    );

    await edit.goto(published.id);
    await edit.expectVisible();
  });

  test("a researcher prints the labels of two published samples", async ({
    page,
    samples,
  }) => {
    const granite = sampleNamed(samples, "Granite 7");
    const ash = sampleNamed(samples, "Vesuvius Ash");
    const list = sampleListPage(page);
    await list.stubPrint();

    await signInAsResearcher(page, RESEARCHERS.pierre);
    await list.selectSample(granite.name);
    await list.selectSample(ash.name);
    await list.printLabels("1.5 cm");

    await list.expectLabel(granite.igsn, granite.name);
    await list.expectLabel(ash.igsn, ash.name);
  });
});
