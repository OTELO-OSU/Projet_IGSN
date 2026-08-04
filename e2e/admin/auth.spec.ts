import { adminPage } from "../support/admin/admin.page";
import { keycloakProfilePage } from "../support/admin/keycloak-profile.page";
import { orcidLoginPage } from "../support/admin/orcid-login.page";
import { settingsPage } from "../support/admin/settings.page";
import { shibbolethLoginPage } from "../support/admin/shibboleth-login.page";
import { test } from "../support/db";

test.describe("authentication", () => {
  test("a researcher signs in through their institution", async ({ page }) => {
    const admin = adminPage(page);
    await admin.goto();
    await admin.signInWithInstitution();

    await shibbolethLoginPage(page).login("marie.dupont", "password");
    await keycloakProfilePage(page).completeIfShown(
      "marie.dupont@univ-lorraine.fr",
    );

    await admin.expectSignedIn();
    await admin.expectUserName("Marie Dupont");
  });

  // Signing out must end the whole SSO chain (app + Keycloak + IdP): clicking
  // sign-in again asks for credentials instead of silently reusing a session.
  test("a researcher who signed out must re-enter credentials", async ({
    page,
  }) => {
    const admin = adminPage(page);
    await admin.goto();
    await admin.signInWithInstitution();
    await shibbolethLoginPage(page).login("luc.moreau", "password");
    await keycloakProfilePage(page).completeIfShown(
      "luc.moreau@univ-lorraine.fr",
    );
    await admin.expectSignedIn();

    await admin.signOut();
    await admin.signInWithInstitution();

    await shibbolethLoginPage(page).expectCredentialsPrompt();
  });

  // ORCID is a link-then-login mechanism, not a cold-start path: a user may
  // authenticate with ORCID, but without an account declaring that ORCID iD
  // the app denies them access (see docs/adr/0020-app-level-orcid-linking.md).
  test("an ORCID sign-in is authenticated but denied app access", async ({
    page,
  }) => {
    const admin = adminPage(page);
    await admin.goto();
    await admin.signInWithOrcid();

    await orcidLoginPage(page).login("0000-0002-1825-0097", "password");

    await admin.expectNoAccess();

    // Signing out from the no-access screen must also end the ORCID IdP
    // session: signing in again asks for credentials.
    await admin.signOut();
    await admin.signInWithOrcid();
    await orcidLoginPage(page).expectCredentialsPrompt();
  });

  // The full link-then-login journey: declare the ORCID iD in Settings while
  // signed in through the institution, then sign in with ORCID alone. The
  // ORCID first-broker-login asks nothing (no review-profile step); the api
  // resolves the session by the declared orcid column alone.
  test("a researcher links their ORCID and signs in with it", async ({
    page,
  }) => {
    const admin = adminPage(page);
    await admin.goto();
    await admin.signInWithInstitution();
    await shibbolethLoginPage(page).login("marie.dupont", "password");
    await keycloakProfilePage(page).completeIfShown(
      "marie.dupont@univ-lorraine.fr",
    );
    await admin.expectSignedIn();

    const settings = settingsPage(page);
    await settings.open();
    await settings.setOrcid("0000-0001-5109-3700");

    await admin.signOut();
    await admin.signInWithOrcid();
    await orcidLoginPage(page).login("0000-0001-5109-3700", "password");

    await admin.expectSignedIn();
    await admin.expectUserName("Marie Dupont");
  });
});
