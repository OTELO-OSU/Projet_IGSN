import { adminPage } from "../support/admin/admin.page";
import { settingsPage } from "../support/admin/settings.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { test } from "../support/db";

const REMOVAL = "You are removed from a sample";

test.describe("mail preferences", () => {
  test("a researcher switches an email off and it stays off", async ({
    page,
  }) => {
    const settings = settingsPage(page);

    await signInAsResearcher(page, RESEARCHERS.marie);
    await settings.openProfile();
    await settings.switchMailOff(REMOVAL);

    await page.reload();
    await adminPage(page).expectSignedIn();
    await settings.expectMailOff(REMOVAL);
  });
});
