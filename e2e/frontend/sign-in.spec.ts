import { adminPage } from "../support/admin/admin.page";
import {
  RESEARCHERS,
  completeIdpLogin,
  signInAsResearcher,
} from "../support/admin/sign-in";
import { type SeededSample, test } from "../support/db";
import { headerPage } from "../support/frontend/header.page";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";
import { adminUrl } from "../support/urls";

const OWNER = "jean";

function ownSample(samples: SeededSample[]) {
  const own = samples.find(
    (sample) => sample.status === "published" && sample.owner === OWNER,
  );
  if (!own?.igsn) {
    throw new Error(`seed must publish a sample owned by ${OWNER}`);
  }
  return { ...own, igsn: own.igsn };
}

test.describe("sign in from the public frontend", () => {
  test("a researcher signs in from a sample page and edits their own sample in admin", async ({
    page,
    samples,
  }) => {
    const own = ownSample(samples);
    const other = samples.find(
      (sample) =>
        sample.status === "published" &&
        sample.owner !== OWNER &&
        !sample.collaborators.some(
          (collaborator) => collaborator.researcher === OWNER,
        ),
    );
    if (!other?.igsn) {
      throw new Error("seed must publish a sample owned by someone else");
    }

    const header = headerPage(page);
    const detail = sampleDetailPage(page);

    await detail.goto(own.igsn);
    await header.expectSignedOut();
    await header.expectNoEditLink();

    await header.signIn();
    await completeIdpLogin(page, RESEARCHERS[OWNER]);

    await detail.expectSample(own.name, own.igsn);
    await header.expectSignedIn();
    await header.expectGoToAdminHref(adminUrl);
    await header.expectEditHref(`${adminUrl}/samples/${own.id}`);

    const accessAnswered = header.accessAnswered(other.id);
    await detail.goto(other.igsn);
    await accessAnswered;
    await header.expectSignedIn();
    await header.expectNoEditLink();

    await header.signOut();
    await header.expectSignedOut();
  });

  test("signing out on the public site signs the admin tab out", async ({
    page,
    samples,
  }) => {
    const own = ownSample(samples);
    const admin = adminPage(page);

    await signInAsResearcher(page, RESEARCHERS[OWNER]);

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
    const own = ownSample(samples);
    const header = headerPage(page);
    const detail = sampleDetailPage(page);

    await detail.goto(own.igsn);
    await header.signIn();
    await completeIdpLogin(page, RESEARCHERS[OWNER]);
    await header.expectEditHref(`${adminUrl}/samples/${own.id}`);

    const admin = adminPage(await page.context().newPage());
    await admin.gotoSignedIn();
    await admin.signOut();

    await header.expectSignedOut();
    await header.expectNoEditLink();
  });
});
