import { adminPage } from "../support/admin/admin.page";
import { serviceAccountPage } from "../support/admin/service-accounts.page";
import { settingsPage } from "../support/admin/settings.page";
import {
  RESEARCHERS,
  signInAsResearcher,
  signInAsResearcherInOwnSession,
} from "../support/admin/sign-in";
import { expect, published, test } from "../support/db";
import { maildev } from "../support/maildev";
import { adminUrl, frontendUrl } from "../support/urls";

const MANUAL_GROUP = "ANR CritMet";
const REASON = "We harvest our laboratory samples every night.";
const MARIE_LABORATORY = "Centre de recherches pétrographiques et géochimiques";
const SAMPLES_URL = `${frontendUrl}/api/service/samples`;
const BATCHES_URL = `${frontendUrl}/api/service/batches`;

test.describe("service account request", () => {
  test("a group manager asks for a service account owning samples for a member, then calls the api with its key", async ({
    page,
    browser,
    request,
    samples,
  }) => {
    test.slow();
    const name = `Basalt harvester ${Date.now()}`;
    const settings = settingsPage(page);

    await signInAsResearcher(page, RESEARCHERS.marie);
    await settings.openProfile();
    await settings.requestServiceAccount(name, REASON, MANUAL_GROUP, {
      search: "Martin",
      name: "Jean Martin",
    });

    const mail = await maildev(request).expectMail(
      RESEARCHERS.nadia.email,
      `Marie Dupont asks for the service account "${name}"`,
      [MARIE_LABORATORY, "Samples owner: Jean Martin", MANUAL_GROUP, REASON],
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
      owner: "Marie Dupont",
      samplesOwner: "Jean Martin",
    });
    await account.create();
    await account.expectVisible(name);
    await superAdminPage.context().close();

    await page.goto(`${adminUrl}/settings/profile`);
    await adminPage(page).expectSignedIn();
    await settings.expectService(name);
    const apiKey = await settings.generateApiKey(name);

    const answered = await request.get(SAMPLES_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(answered.status()).toBe(200);
    expect(typeof (await answered.json()).meta.total).toBe("number");

    const publicRead = await request.get(SAMPLES_URL);
    expect(publicRead.status()).toBe(200);

    const refused = await request.get(SAMPLES_URL, {
      headers: { Authorization: "Bearer unknown-key" },
    });
    expect(refused.status()).toBe(403);

    const authorization = { Authorization: `Bearer ${apiKey}` };
    const {
      identification: { sampleIdentifier: _published, ...identification },
      manualGroups: _manualGroups,
      ...record
    } = await (
      await request.get(`${SAMPLES_URL}/${published(samples).basalt}`, {
        headers: authorization,
      })
    ).json();
    const copy = (partnerId: string) => ({
      partnerId,
      sample: {
        ...record,
        identification: {
          ...identification,
          titles: [{ value: `${name} ${partnerId}`, titleType: "Main" }],
        },
      },
    });
    const batch = await request.post(`${SAMPLES_URL}/batch`, {
      headers: authorization,
      data: { items: [copy("first"), copy("second")] },
    });
    expect(batch.status()).toBe(202);
    const { id } = await batch.json();
    await expect
      .poll(
        async () => {
          const res = await request.get(`${BATCHES_URL}/${id}`, {
            headers: authorization,
          });
          const { items } = await res.json();
          return items.map(
            (item: {
              partnerId: string;
              status: string;
              igsn: string | null;
            }) => ({
              partnerId: item.partnerId,
              status: item.status,
              igsn: item.igsn,
            }),
          );
        },
        { timeout: 30_000 },
      )
      .toEqual(
        ["first", "second"].map((partnerId) => ({
          partnerId,
          status: "published",
          igsn: expect.any(String),
        })),
      );
  });
});
