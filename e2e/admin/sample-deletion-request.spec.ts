import { sampleEditPage } from "../support/admin/sample-edit.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { test } from "../support/db";
import { maildev } from "../support/maildev";

test.describe("sample deletion request", () => {
  test("an owner asks the super admin to delete their published sample", async ({
    page,
    request,
    samples,
  }) => {
    const sample = samples.find((candidate) => candidate.name === "Basalt 42");
    if (!sample?.igsn) {
      throw new Error("seed must include the published Basalt 42 sample");
    }
    const reason = `Duplicate of a colleague's sample ${Date.now()}`;

    await signInAsResearcher(page, RESEARCHERS.jean);
    const list = sampleListPage(page);
    await list.openSample(sample.name);

    const edit = sampleEditPage(page);
    await edit.expectVisible();
    await edit.expectDeletionRequestRefused();
    await edit.requestDeletion(reason);
    await edit.expectDeletionRequestSent();

    await maildev(request).expectMail(
      RESEARCHERS.nadia.email,
      `Jean Martin requests the deletion of the sample "${sample.name}"`,
      [sample.igsn, reason, `/samples/${sample.id}`],
    );

    await edit.goto(sample.id);
    await edit.expectVisible();
  });
});
