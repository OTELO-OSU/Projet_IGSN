import { adminPage } from "../support/admin/admin.page";
import { serviceAccountPage } from "../support/admin/service-accounts.page";
import { settingsPage } from "../support/admin/settings.page";
import {
  RESEARCHERS,
  completeIdpLogin,
  signInAsResearcherInOwnSession,
} from "../support/admin/sign-in";
import { expect, sampleNamed, test } from "../support/db";
import { headerPage } from "../support/frontend/header.page";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";
import { maildev } from "../support/maildev";
import { adminUrl, frontendUrl } from "../support/urls";

const MANUAL_GROUP = "ANR CritMet";
const REASON = "We harvest our laboratory samples every night.";
const JEAN_LABORATORY = "GéoRessources";
const PING_URL = `${frontendUrl}/api/service/ping`;

test.describe("service account request", () => {
  test("a researcher asks for a service account, then calls the api with its key", async ({
    page,
    browser,
    request,
    samples,
  }) => {
    test.slow();
    const name = `Basalt harvester ${Date.now()}`;
    const own = sampleNamed(samples, "Basalt 42");
    const header = headerPage(page);
    const detail = sampleDetailPage(page);

    await detail.goto(own.igsn);
    await header.signIn();
    await completeIdpLogin(page, RESEARCHERS.jean);
    await header.expectSignedIn();

    await header.requestServiceAccount(name, REASON, MANUAL_GROUP);

    const mail = await maildev(request).expectMail(
      RESEARCHERS.nadia.email,
      `Jean Martin asks for the service account "${name}"`,
      [JEAN_LABORATORY, MANUAL_GROUP, REASON],
    );
    const link = /http\S+service-accounts\/create\?request=\S+/.exec(mail)?.[0];
    expect(link).toBeDefined();

    const superAdminPage = await signInAsResearcherInOwnSession(
      browser,
      RESEARCHERS.nadia,
    );
    const account = serviceAccountPage(superAdminPage);
    await superAdminPage.goto(link!);
    await account.expectPrefilled({
      name,
      laboratory: JEAN_LABORATORY,
      owner: "Jean Martin",
    });
    await account.create();
    await account.expectVisible(name);
    await superAdminPage.context().close();

    const settings = settingsPage(page);
    await page.goto(`${adminUrl}/settings`);
    await adminPage(page).expectSignedIn();
    await settings.expectService(name);
    const apiKey = await settings.generateApiKey(name);

    const answered = await request.get(PING_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(answered.status()).toBe(200);
    expect(await answered.json()).toEqual({ ok: true });

    const refused = await request.get(PING_URL);
    expect(refused.status()).toBe(403);
  });
});
