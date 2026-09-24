import { sampleModerationPage } from "../support/admin/sample-moderation.page";
import { signInAsResearcher } from "../support/admin/sign-in";
import { test } from "../support/db";

test.describe("sample moderation filters", () => {
  test("a space manager narrows the moderated samples to one laboratory", async ({
    page,
    world,
  }) => {
    const { samples } = world;
    const { laboratory } = world.institutions.jean;
    const moderation = sampleModerationPage(page);
    const inLaboratory = samples.find((sample) => sample.owner === "jean");
    const elsewhere = samples.find((sample) => sample.owner === "pierre");
    if (!inLaboratory || !elsewhere) {
      throw new Error("the seed no longer covers two laboratories");
    }

    await signInAsResearcher(page, world.researchers.marie);
    await moderation.open();
    await moderation.expectVisible();
    await moderation.expectSampleRow(inLaboratory.name);
    await moderation.expectSampleRow(elsewhere.name);

    await moderation.filterByInstitution(laboratory, laboratory);

    await moderation.expectSampleRow(inLaboratory.name);
    await moderation.expectNoSampleRow(elsewhere.name);
  });
});
