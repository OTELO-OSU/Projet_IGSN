import { findLaboratory } from "../../packages/domain/src/institutional-group/find-laboratory";
import { laboratoryLabel } from "../../packages/domain/src/institutional-group/label";
import { sampleEditPage } from "../support/admin/sample-edit.page";
import { sampleModerationPage } from "../support/admin/sample-moderation.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { userPage } from "../support/admin/user.page";
import { usersPage } from "../support/admin/users.page";
import { test } from "../support/db";
import { maildev } from "../support/maildev";

test.describe("space manager", () => {
  test("a space manager accepts a pending account it moderates", async ({
    page,
  }) => {
    const users = usersPage(page);
    const user = userPage(page);

    await signInAsResearcher(page, RESEARCHERS.marie);
    await users.open();
    await users.expectVisible();

    await users.expectListed(RESEARCHERS.jean.email);
    await users.expectListed(RESEARCHERS.hugo.email);
    await users.expectNotListed(RESEARCHERS.sophie.email);
    await users.expectNotListed(RESEARCHERS.nadia.email);
    await users.expectNotListed(RESEARCHERS.marie.email);

    await users.openUser(RESEARCHERS.hugo.email);

    await user.setStatus("Active");
    await page.reload();

    await user.expectStatus("Active");
  });

  test("a space manager edits a sample of the groups it manages", async ({
    page,
    request,
    samples,
  }) => {
    const moderation = sampleModerationPage(page);
    const edit = sampleEditPage(page);
    const target = samples.find(
      (sample) => sample.owner === "jean" && sample.status === "draft",
    );
    if (!target) throw new Error("no draft sample owned by Jean was seeded");
    const elsewhere = samples.find((sample) => sample.owner === "pierre");
    if (!elsewhere)
      throw new Error("the seed no longer covers two laboratories");

    await signInAsResearcher(page, RESEARCHERS.marie);
    await moderation.open();
    await moderation.expectVisible();
    await moderation.expectSampleRow(target.name);
    await moderation.expectSampleRow(elsewhere.name);

    await moderation.filterByInstitution(
      findLaboratory("UMR7359")!.name,
      laboratoryLabel("UMR7359"),
    );

    await moderation.expectSampleRow(target.name);
    await moderation.expectNoSampleRow(elsewhere.name);

    await moderation.expectSampleRowWithOwnerStatus(target.name, "Active");

    await moderation.openSample(target.name);
    await edit.expectVisible();
    await edit.fillSpecificName(`MC-${Date.now()}`);
    await edit.save();

    await maildev(request).expectMail(
      RESEARCHERS.jean.email,
      `The sample "${target.name}" was edited by a moderator`,
      [`/samples/${target.id}`],
    );
  });
});
