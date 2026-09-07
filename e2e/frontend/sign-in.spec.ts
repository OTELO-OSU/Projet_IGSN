import { RESEARCHERS, completeIdpLogin } from "../support/admin/sign-in";
import { test } from "../support/db";
import { headerPage } from "../support/frontend/header.page";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";
import { adminUrl } from "../support/urls";

const OWNER = "jean";

test.describe("sign in from the public frontend", () => {
  test("a researcher signs in from a sample page and edits their own sample in admin", async ({
    page,
    samples,
  }) => {
    const own = samples.find(
      (sample) => sample.status === "published" && sample.owner === OWNER,
    );
    const other = samples.find(
      (sample) =>
        sample.status === "published" &&
        sample.owner !== OWNER &&
        !sample.collaborators.some(
          (collaborator) => collaborator.researcher === OWNER,
        ),
    );
    if (!own?.igsn || !other?.igsn) {
      throw new Error(
        `seed must publish a sample owned by ${OWNER} and one owned by someone else`,
      );
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
});
