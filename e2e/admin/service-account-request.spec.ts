import { adminPage } from "../support/admin/admin.page";
import { serviceAccountPage } from "../support/admin/service-accounts.page";
import { settingsPage } from "../support/admin/settings.page";
import {
  completeIdpLogin,
  signInAsResearcherInOwnSession,
} from "../support/admin/sign-in";
import { expect, sampleNamed, test } from "../support/db";
import { headerPage } from "../support/frontend/header.page";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";
import { maildev } from "../support/maildev";
import { adminUrl, frontendUrl } from "../support/urls";

const REASON = "We harvest our laboratory samples every night.";
const SAMPLES_URL = `${frontendUrl}/api/service/samples`;

test.describe("service account request", () => {
  test("a researcher asks for a service account, then calls the api with its key", async ({
    page,
    browser,
    request,
    world,
  }) => {
    test.slow();
    const { jean, nadia } = world.researchers;
    const { samples } = world;
    const manualGroup = world.manualGroups["ANR CritMet"].name;
    const { laboratory } = world.institutions.jean;
    const name = `Basalt harvester ${Date.now()}`;
    const own = sampleNamed(samples, "Basalt 42");
    const header = headerPage(page);
    const detail = sampleDetailPage(page);

    await detail.goto(own.igsn);
    await header.signIn();
    await completeIdpLogin(page, jean);
    await header.expectSignedIn();

    await header.requestServiceAccount(name, REASON, manualGroup);

    const mail = await maildev(request).expectMail(
      nadia.email,
      `Jean Martin asks for the service account "${name}"`,
      [laboratory, manualGroup, REASON],
    );
    const link = /http\S+service-accounts\/create\?request=\S+/.exec(mail)?.[0];
    expect(link).toBeDefined();

    const superAdminPage = await signInAsResearcherInOwnSession(browser, nadia);
    const account = serviceAccountPage(superAdminPage);
    await superAdminPage.goto(link!);
    await account.expectPrefilled({
      name,
      laboratory,
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

    const answered = await request.get(SAMPLES_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(answered.status()).toBe(200);
    expect(typeof (await answered.json()).meta.total).toBe("number");

    const refused = await request.get(SAMPLES_URL);
    expect(refused.status()).toBe(403);
  });
});
