import { adminPage } from "../support/admin/admin.page";
import { keycloakLoginPage } from "../support/admin/keycloak-login.page";
import { keycloakProfilePage } from "../support/admin/keycloak-profile.page";
import { orcidLoginPage } from "../support/admin/orcid-login.page";
import { sampleEditPage } from "../support/admin/sample-edit.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import { settingsPage } from "../support/admin/settings.page";
import { shibbolethLoginPage } from "../support/admin/shibboleth-login.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { test } from "../support/db";

test.describe("authentication", () => {
  test("a researcher signs in through their institution", async ({ page }) => {
    const admin = adminPage(page);
    await admin.goto();
    await keycloakLoginPage(page).chooseInstitution();

    await shibbolethLoginPage(page).login("marie.dupont", "password");
    await keycloakProfilePage(page).completeIfShown(
      "marie.dupont@univ-lorraine.fr",
    );

    await admin.expectSignedIn();
    await admin.expectUserName("Marie Dupont");
  });

  test("a researcher who signed out must re-enter credentials", async ({
    page,
  }) => {
    const admin = adminPage(page);
    await admin.goto();
    await keycloakLoginPage(page).chooseInstitution();
    await shibbolethLoginPage(page).login("luc.moreau", "password");
    await keycloakProfilePage(page).completeIfShown(
      "luc.moreau@univ-lorraine.fr",
    );
    await admin.expectSignedIn();

    await admin.signOut();
    await admin.signIn();
    await keycloakLoginPage(page).chooseInstitution();

    await shibbolethLoginPage(page).expectCredentialsPrompt();
  });

  test("an ORCID sign-in is authenticated but denied app access", async ({
    page,
  }) => {
    const admin = adminPage(page);
    await admin.goto();
    await keycloakLoginPage(page).chooseOrcid();

    await orcidLoginPage(page).login("0000-0002-1825-0097", "password");

    await admin.expectNoAccess();

    await admin.signOut();
    await admin.signIn();
    await keycloakLoginPage(page).chooseOrcid();
    await orcidLoginPage(page).expectCredentialsPrompt();
  });

  test("a Gaia Data account with no supported provider is denied app access", async ({
    page,
  }) => {
    const admin = adminPage(page);
    await admin.goto();

    await keycloakLoginPage(page).loginLocally("test", "test");

    await admin.expectUnsupportedProvider();
    await sampleListPage(page).expectHidden();
  });

  test("a Gaia Data account denied for its provider must re-enter credentials", async ({
    page,
  }) => {
    const admin = adminPage(page);
    await admin.goto();
    await keycloakLoginPage(page).loginLocally("test", "test");
    await admin.expectUnsupportedProvider();

    await admin.signOut();
    await admin.signIn();

    await keycloakLoginPage(page).expectCredentialsPrompt();
  });

  test("a researcher links their ORCID and signs in with it", async ({
    page,
  }) => {
    const admin = adminPage(page);
    await admin.goto();
    await keycloakLoginPage(page).chooseInstitution();
    await shibbolethLoginPage(page).login("marie.dupont", "password");
    await keycloakProfilePage(page).completeIfShown(
      "marie.dupont@univ-lorraine.fr",
    );
    await admin.expectSignedIn();

    const settings = settingsPage(page);
    await settings.open();
    await settings.setOrcid("0000-0001-5109-3700");

    await admin.signOut();
    await admin.signIn();
    await keycloakLoginPage(page).chooseOrcid();
    await orcidLoginPage(page).login("0000-0001-5109-3700", "password");

    await admin.expectSignedIn();
    await admin.expectUserName("Marie Dupont");
  });

  test("a researcher opening a sample link in a new tab lands on that sample", async ({
    page,
    samples,
  }) => {
    const sample = samples.find((s) => s.owner === "camille");
    if (!sample) throw new Error("seed must include a sample for camille");

    await signInAsResearcher(page, RESEARCHERS.camille);

    const tab = await page.context().newPage();
    const edit = sampleEditPage(tab);
    await edit.goto(sample.id);

    await edit.expectVisible();
    await edit.expectName(sample.name);
  });
});
