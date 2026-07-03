import { type Page } from "@playwright/test";

import { adminPage } from "./admin.page";
import { keycloakProfilePage } from "./keycloak-profile.page";
import { shibbolethLoginPage } from "./shibboleth-login.page";

// A SAML researcher from the mock IdP (see saml-idp/authsources.php). Login and
// email are firstname.lastname@univ-lorraine.fr.
export type Researcher = { username: string; email: string };

// Each parallel test signs in as a distinct researcher: concurrent
// first-broker-login for the *same* brokered identity races in Keycloak (one
// session imports the account, the others hit the account-conflict page).
export const RESEARCHERS = {
  jean: { username: "jean.martin", email: "jean.martin@univ-lorraine.fr" },
  pierre: {
    username: "pierre.durand",
    email: "pierre.durand@univ-lorraine.fr",
  },
  camille: {
    username: "camille.petit",
    email: "camille.petit@univ-lorraine.fr",
  },
} satisfies Record<string, Researcher>;

// Shared entry point for the sample journeys: a researcher signs in through their
// institution and lands in the app. See auth.spec.ts for the flow under test.
export async function signInAsResearcher(page: Page, researcher: Researcher) {
  const admin = adminPage(page);
  await admin.goto();
  await admin.signInWithInstitution();
  await shibbolethLoginPage(page).login(researcher.username, "password");
  await keycloakProfilePage(page).completeIfShown(researcher.email);
  await admin.expectSignedIn();
}
