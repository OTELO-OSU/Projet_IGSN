import { institutionalGroupsPage } from "../support/admin/institutional-groups.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { test } from "../support/db";

test.describe("institutional groups", () => {
  test("a researcher declares their institution before reaching the app", async ({
    page,
  }) => {
    const groups = institutionalGroupsPage(page);
    const samples = sampleListPage(page);

    await signInAsResearcher(page, RESEARCHERS.theo);
    await groups.expectShown();

    await groups.declare({
      organization: "Université de Lorraine",
      osu: "Observatoire Terre et Environnement de Lorraine",
      laboratory: "Centre de Recherches Pétrographiques",
    });

    await samples.expectVisible();
    await groups.expectNotShown();

    // No sign-out and back in: navigating while the logout redirect is in
    // flight aborts it.
    await page.reload();

    await samples.expectVisible();
    await groups.expectNotShown();
  });
});
