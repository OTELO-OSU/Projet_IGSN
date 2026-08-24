import { managedGroupsSection } from "../support/admin/managed-groups.page";
import { manualGroupPage } from "../support/admin/manual-group.page";
import { manualGroupsPage } from "../support/admin/manual-groups.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { userPage } from "../support/admin/user.page";
import { usersPage } from "../support/admin/users.page";
import { test } from "../support/db";
import { adminUrl } from "../support/urls";

const OTELO = "Observatoire Terre et Environnement de Lorraine (OTELo)";
const GEORESSOURCES = "GéoRessources (GEORESSOURCES) (UMR7359)";
const OUT_OF_SCOPE_USER = `${adminUrl}/users/01980e2d-6f9b-7000-8000-000000000003`;
const JEAN_USER = `${adminUrl}/users/01980e2d-6f9b-7000-8000-000000000002`;

test.describe("space manager", () => {
  test("a super admin grants a researcher its managed groups", async ({
    page,
  }) => {
    const users = usersPage(page);
    const user = userPage(page);
    const managed = managedGroupsSection(page);

    await signInAsResearcher(page, RESEARCHERS.nadia);
    await users.open();
    await users.expectVisible();
    await users.openUser(RESEARCHERS.jean.email);
    await managed.expectVisible();

    await managed.grant("Managed OSUs", "OTELo", OTELO);
    await managed.grant("Managed laboratories", "UMR7359", GEORESSOURCES);
    await user.save();

    await page.reload();

    await managed.expectGranted(OTELO);
    await managed.expectGranted(GEORESSOURCES);
    await user.expectVisible(RESEARCHERS.jean.email);
  });

  test("a space manager sees only the users of the groups it moderates", async ({
    page,
  }) => {
    const users = usersPage(page);

    await signInAsResearcher(page, RESEARCHERS.marie);
    await users.open();
    await users.expectVisible();

    await users.expectListed(RESEARCHERS.jean.email);
    await users.expectListed(RESEARCHERS.hugo.email);
    await users.expectNotListed(RESEARCHERS.sophie.email);
    await users.expectNotListed(RESEARCHERS.nadia.email);
    await users.expectNotListed(RESEARCHERS.marie.email);
  });

  test("a space manager accepts a pending account it moderates", async ({
    page,
  }) => {
    const users = usersPage(page);
    const user = userPage(page);

    await signInAsResearcher(page, RESEARCHERS.marie);
    await users.open();
    await users.openUser(RESEARCHERS.hugo.email);

    await user.setStatus("Active");
    await page.reload();

    await user.expectStatus("Active");
  });

  test("a space manager bans then reactivates an account it moderates", async ({
    page,
  }) => {
    const users = usersPage(page);
    const user = userPage(page);

    await signInAsResearcher(page, RESEARCHERS.marie);
    await users.open();
    await users.openUser(RESEARCHERS.jean.email);

    await user.setStatus("Disabled");
    await page.reload();
    await user.expectStatus("Disabled");

    await user.setStatus("Active");
    await page.reload();
    await user.expectStatus("Active");
  });

  test("a dual manager edits the manual groups it manages, not the role", async ({
    page,
  }) => {
    const users = usersPage(page);
    const user = userPage(page);
    const managed = managedGroupsSection(page);

    await signInAsResearcher(page, RESEARCHERS.marie);
    await users.open();
    await users.openUser(RESEARCHERS.jean.email);

    await managed.expectAbsent();
    await user.expectGroupLocked("GeoRift");

    await user.associateGroup("OZCAR-RI");
    await page.reload();

    await user.expectGroup("OZCAR-RI");
  });

  test("a space manager cannot reach a user outside its groups", async ({
    page,
  }) => {
    const user = userPage(page);

    await signInAsResearcher(page, RESEARCHERS.marie);
    await page.goto(OUT_OF_SCOPE_USER, { waitUntil: "commit" });

    await user.expectNotFound();
  });

  test("a manual group manager reaches no user page", async ({ page }) => {
    const users = usersPage(page);
    const samples = sampleListPage(page);

    await signInAsResearcher(page, RESEARCHERS.pierre);

    await users.expectNoMenuEntry();

    await page.goto(JEAN_USER, { waitUntil: "commit" });

    await samples.expectVisible();
  });

  test("a manual group manager curates the members of its own groups", async ({
    page,
  }) => {
    const groups = manualGroupsPage(page);
    const group = manualGroupPage(page);

    await signInAsResearcher(page, RESEARCHERS.pierre);
    await groups.open();
    await groups.expectVisible();

    await groups.expectNoGroupRow("OZCAR-RI");
    await groups.openGroup("ANR CritMet");
    await group.expectNoEditControl();

    await group.associate("Moreau", RESEARCHERS.luc.email);
    await group.expectMember(RESEARCHERS.luc.email, "Active");

    await group.detach("Luc Moreau");
    await group.expectNoMember(RESEARCHERS.luc.email);
  });

  test("a manual group manager cannot detach a member owning a published sample", async ({
    page,
  }) => {
    const groups = manualGroupsPage(page);
    const group = manualGroupPage(page);

    await signInAsResearcher(page, RESEARCHERS.pierre);
    await groups.open();
    await groups.openGroup("ProfilLoire 2024");

    await group.expectDetachDisabled("Pierre Durand");
  });

  test("a space manager remains an ordinary researcher", async ({ page }) => {
    const samples = sampleListPage(page);

    await signInAsResearcher(page, RESEARCHERS.marie);

    await samples.expectVisible();
  });
});
