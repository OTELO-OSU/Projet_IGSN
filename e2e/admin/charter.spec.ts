import { charterPage } from "../support/admin/charter.page";
import { institutionalGroupsPage } from "../support/admin/institutional-groups.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { test } from "../support/db";

test.describe("terms of use", () => {
  test("a researcher reads the terms of use to the end and accepts them before reaching the app", async ({
    page,
  }) => {
    const charter = charterPage(page);
    const groups = institutionalGroupsPage(page);

    await signInAsResearcher(page, RESEARCHERS.theo);
    await charter.expectShown();
    await charter.expectAcceptDisabled();
    await groups.expectNotShown();

    await charter.dismissWithEscape();
    await charter.expectShown();

    await charter.accept();

    await charter.expectNotShown();
    await groups.expectShown();

    await page.reload();

    await groups.expectShown();
    await charter.expectNotShown();
  });
});
