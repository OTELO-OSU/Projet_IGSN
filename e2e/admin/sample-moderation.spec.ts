import { sampleModerationPage } from "../support/admin/sample-moderation.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { test } from "../support/db";

const GEORESSOURCES = "GéoRessources (GEORESSOURCES)";

test.describe("sample moderation filters", () => {
  test("a space manager narrows the moderated samples to one laboratory", async ({
    page,
    samples,
  }) => {
    const moderation = sampleModerationPage(page);
    const inLaboratory = samples.find((sample) => sample.owner === "jean");
    const elsewhere = samples.find((sample) => sample.owner === "pierre");
    if (!inLaboratory || !elsewhere) {
      throw new Error("the seed no longer covers two laboratories");
    }

    await signInAsResearcher(page, RESEARCHERS.marie);
    await moderation.open();
    await moderation.expectVisible();
    await moderation.expectSampleRow(inLaboratory.name);
    await moderation.expectSampleRow(elsewhere.name);

    await moderation.filterByInstitution("GéoRessources", GEORESSOURCES);

    await moderation.expectSampleRow(inLaboratory.name);
    await moderation.expectNoSampleRow(elsewhere.name);
  });
});
