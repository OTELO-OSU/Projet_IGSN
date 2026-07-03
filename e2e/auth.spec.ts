import { test } from "@playwright/test";

import { adminPage } from "./support/admin.page";
import { keycloakProfilePage } from "./support/keycloak-profile.page";
import { orcidLoginPage } from "./support/orcid-login.page";
import { shibbolethLoginPage } from "./support/shibboleth-login.page";

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
    await admin.expectApiVerified("Marie Dupont");
  });

  // ORCID is a link-then-login mechanism, not a cold-start path: a user may
  // authenticate with ORCID, but until the RENATER-authenticated linking feature
  // ships the app denies them access (see docs/adr/0002-production-auth-keycloak.md).
  test("an ORCID sign-in is authenticated but denied app access", async ({
    page,
  }) => {
    const admin = adminPage(page);
    await admin.goto();
    await admin.signInWithOrcid();

    await orcidLoginPage(page).login("0000-0002-1825-0097", "password");
    await keycloakProfilePage(page).completeIfShown(
      "sophie.bernard@univ-lorraine.fr",
    );

    await admin.expectNoAccess();
  });
});
