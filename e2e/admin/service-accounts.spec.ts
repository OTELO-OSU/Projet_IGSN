import { sampleListPage } from "../support/admin/sample-list.page";
import {
  serviceAccountPage,
  serviceAccountsPage,
} from "../support/admin/service-accounts.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { test } from "../support/db";

const uniqueName = (name: string) => `${name} ${Date.now()}`;

const LORRAINE = "Université de Lorraine";
const CRPG = "Centre de recherches pétrographiques et géochimiques";
const MANAGED_CRPG = `${CRPG} (CRPG) (UMR7358)`;
const MANUAL_GROUP = "ANR CritMet";

test.describe("service accounts", () => {
  test("a super admin runs a service account through its lifecycle", async ({
    page,
  }) => {
    const accounts = serviceAccountsPage(page);
    const account = serviceAccountPage(page);
    const name = uniqueName("Gaia harvester");

    await signInAsResearcher(page, RESEARCHERS.nadia);
    await accounts.open();
    await accounts.expectVisible();

    await accounts.goToCreate();
    await account.fillName(name);
    await account.chooseInstitution({
      organization: LORRAINE,
      laboratory: CRPG,
    });
    await account.grant("Managed manual groups", MANUAL_GROUP, MANUAL_GROUP);
    await account.create();
    await account.expectVisible(name);

    await accounts.open();
    await accounts.expectAccountRow(name);
    await accounts.openAccount(name);
    await account.expectVisible(name);

    await account.grant("Managed laboratories", "UMR7358", MANAGED_CRPG);
    await account.save();

    await account.remove();
    await accounts.expectVisible();
    await accounts.expectNoAccountRow(name);
  });

  test("a space manager has no service accounts section", async ({ page }) => {
    const accounts = serviceAccountsPage(page);
    const samples = sampleListPage(page);

    await signInAsResearcher(page, RESEARCHERS.marie);
    await accounts.expectNoMenuEntry();

    await accounts.goto();

    await samples.expectVisible();
  });
});
