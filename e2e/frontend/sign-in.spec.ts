import { adminPage } from "../support/admin/admin.page";
import {
  RESEARCHERS,
  completeIdpLogin,
  signInAsResearcher,
} from "../support/admin/sign-in";
import { sampleNamed, test } from "../support/db";
import { headerPage } from "../support/frontend/header.page";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";
import { adminUrl } from "../support/urls";

test.describe("sign in from the public frontend", () => {
  test("a researcher signs in from a sample page and edits their own sample in admin", async ({
    page,
    samples,
  }) => {
    const own = sampleNamed(samples, "Basalt 42");
    const other = sampleNamed(samples, "Granite 7");

    const header = headerPage(page);
    const detail = sampleDetailPage(page);

    await detail.goto(own.igsn);
    await header.expectSignedOut();
    await header.expectNoEditLink();

    await header.signIn();
    await completeIdpLogin(page, RESEARCHERS.jean);

    await detail.expectSample(own.name, own.igsn);
    await header.expectSignedIn();
    await header.expectGoToDashboardHref(adminUrl);
    await header.expectEditHref(`${adminUrl}/samples/${own.id}`);

    const accessAnswered = header.accessAnswered(other.id);
    await detail.goto(other.igsn);
    await accessAnswered;
    await header.expectSignedIn();
    await header.expectNoEditLink();

    await header.signOut();
    await detail.expectSample(other.name, other.igsn);
    await header.expectSignedOut();
  });

  test("signing out on the public site signs the admin tab out", async ({
    page,
    samples,
  }) => {
    const own = sampleNamed(samples, "Basalt 42");
    const admin = adminPage(page);

    await signInAsResearcher(page, RESEARCHERS.jean);

    const publicTab = await page.context().newPage();
    const header = headerPage(publicTab);
    const detail = sampleDetailPage(publicTab);

    await detail.goto(own.igsn);
    await header.signInWithExistingSession();
    await detail.expectSample(own.name, own.igsn);

    await header.signOut();
    await header.expectSignedOut();

    await admin.expectSignedOut();
    await page.reload();
    await admin.expectSignedOut();
  });

  test("signing out in admin drops the session of the public tab", async ({
    page,
    samples,
  }) => {
    const own = sampleNamed(samples, "Basalt 42");
    const header = headerPage(page);
    const detail = sampleDetailPage(page);

    await detail.goto(own.igsn);
    await header.signIn();
    await completeIdpLogin(page, RESEARCHERS.jean);
    await header.expectEditHref(`${adminUrl}/samples/${own.id}`);

    const adminTab = await page.context().newPage();
    await adminTab.goto(`${adminUrl}/`);
    const admin = adminPage(adminTab);
    await admin.expectSignedIn();
    await admin.signOut();

    await header.expectSignedOut();
    await header.expectNoEditLink();
  });
});
