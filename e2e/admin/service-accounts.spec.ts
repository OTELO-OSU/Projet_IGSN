import { sampleListPage } from "../support/admin/sample-list.page";
import {
  serviceAccountPage,
  serviceAccountsPage,
} from "../support/admin/service-accounts.page";
import { signInAsResearcher } from "../support/admin/sign-in";
import { test } from "../support/db";

const uniqueName = (name: string) => `${name} ${Date.now()}`;

test.describe("service accounts", () => {
  test("a super admin runs a service account through its lifecycle", async ({
    page,
    world,
  }) => {
    const { jean, nadia } = world.researchers;
    const institution = world.institutions.nadia;
    const manualGroup = world.manualGroups["ANR CritMet"].name;
    const accounts = serviceAccountsPage(page);
    const account = serviceAccountPage(page);
    const name = uniqueName("Gaia harvester");

    await signInAsResearcher(page, nadia);
    await accounts.open();
    await accounts.expectVisible();

    await accounts.goToCreate();
    await account.fillName(name);
    await account.chooseOwner(jean.email);
    await account.chooseInstitution(institution);
    await account.grant("Managed manual groups", manualGroup, manualGroup);
    await account.create();
    await account.expectVisible(name);

    await accounts.open();
    await accounts.expectAccountRow(name);
    await accounts.openAccount(name);
    await account.expectVisible(name);

    await account.grant(
      "Managed laboratories",
      institution.laboratoryCode,
      institution.managedLaboratory,
    );
    await account.save();

    await account.remove();
    await accounts.expectVisible();
    await accounts.expectNoAccountRow(name);
  });

  test("a space manager has no service accounts section", async ({
    page,
    world,
  }) => {
    const accounts = serviceAccountsPage(page);
    const samples = sampleListPage(page);

    await signInAsResearcher(page, world.researchers.marie);
    await accounts.expectNoMenuEntry();

    await accounts.goto();

    await samples.expectVisible();
  });
});
