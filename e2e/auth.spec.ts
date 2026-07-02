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

    await shibbolethLoginPage(page).login("user1", "password");
    await keycloakProfilePage(page).completeIfShown(
      "marie.dupont@univ-lorraine.fr",
    );

    await admin.expectSignedIn();
    await admin.expectApiVerified("Marie Dupont");
  });

  test("a researcher signs in with ORCID", async ({ page }) => {
    const admin = adminPage(page);
    await admin.goto();
    await admin.signInWithOrcid();

    await orcidLoginPage(page).login("0000-0002-1825-0097", "password");
    await keycloakProfilePage(page).completeIfShown(
      "camille.rousseau@univ-lorraine.fr",
    );

    await admin.expectSignedIn();
    await admin.expectApiVerified("Camille Rousseau");
  });
});
