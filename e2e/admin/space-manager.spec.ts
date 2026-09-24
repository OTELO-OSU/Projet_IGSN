import { managedGroupsSection } from "../support/admin/managed-groups.page";
import { manualGroupPage } from "../support/admin/manual-group.page";
import { manualGroupsPage } from "../support/admin/manual-groups.page";
import { sampleEditPage } from "../support/admin/sample-edit.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import { sampleModerationPage } from "../support/admin/sample-moderation.page";
import { signInAsResearcher } from "../support/admin/sign-in";
import { userPage } from "../support/admin/user.page";
import { usersPage } from "../support/admin/users.page";
import { test } from "../support/db";
import { maildev } from "../support/maildev";
import { adminUrl } from "../support/urls";

test.describe("space manager", () => {
  test("a super admin grants a researcher its managed groups", async ({
    page,
    world,
  }) => {
    const { jean, nadia } = world.researchers;
    const institution = world.institutions.jean;
    const users = usersPage(page);
    const user = userPage(page);
    const managed = managedGroupsSection(page);

    await signInAsResearcher(page, nadia);
    await users.open();
    await users.expectVisible();
    await users.openUser(jean.email);
    await managed.expectVisible();

    await managed.grant("Managed OSUs", institution.osuCode, institution.osu);
    await managed.grant(
      "Managed laboratories",
      institution.laboratoryCode,
      institution.managedLaboratory,
    );
    await user.save();

    await page.reload();

    await managed.expectGranted(institution.osu);
    await managed.expectGranted(institution.managedLaboratory);
    await user.expectVisible(jean.email);
  });

  test("a space manager sees only the users of the groups it moderates", async ({
    page,
    world,
  }) => {
    const { hugo, jean, marie, nadia, sophie } = world.researchers;
    const users = usersPage(page);

    await signInAsResearcher(page, marie);
    await users.open();
    await users.expectVisible();

    await users.expectListed(jean.email);
    await users.expectListed(hugo.email);
    await users.expectNotListed(sophie.email);
    await users.expectNotListed(nadia.email);
    await users.expectNotListed(marie.email);
  });

  test("a space manager accepts a pending account it moderates", async ({
    page,
    world,
  }) => {
    const { hugo, marie } = world.researchers;
    const users = usersPage(page);
    const user = userPage(page);

    await signInAsResearcher(page, marie);
    await users.open();
    await users.openUser(hugo.email);

    await user.setStatus("Active");
    await page.reload();

    await user.expectStatus("Active");
  });

  test("a space manager bans then reactivates an account it moderates", async ({
    page,
    world,
  }) => {
    const { jean, marie } = world.researchers;
    const users = usersPage(page);
    const user = userPage(page);

    await signInAsResearcher(page, marie);
    await users.open();
    await users.openUser(jean.email);

    await user.setStatus("Disabled");
    await page.reload();
    await user.expectStatus("Disabled");

    await user.setStatus("Active");
    await page.reload();
    await user.expectStatus("Active");
  });

  test("a dual manager edits the manual groups it manages, not the role", async ({
    page,
    world,
  }) => {
    const { jean, marie } = world.researchers;
    const users = usersPage(page);
    const user = userPage(page);
    const managed = managedGroupsSection(page);

    await signInAsResearcher(page, marie);
    await users.open();
    await users.openUser(jean.email);

    await managed.expectAbsent();
    await user.expectGroupLocked(world.manualGroups.GeoRift.name);

    await user.associateGroup(world.manualGroups["OZCAR-RI"].name);
    await page.reload();

    await user.expectGroup(world.manualGroups["OZCAR-RI"].name);
  });

  test("a space manager cannot reach a user outside its groups", async ({
    page,
    world,
  }) => {
    const user = userPage(page);

    await signInAsResearcher(page, world.researchers.marie);
    await page.goto(`${adminUrl}/users/${world.researchers.sophie.id}`, {
      waitUntil: "commit",
    });

    await user.expectNotFound();
  });

  test("a manual group manager reaches no user page", async ({
    page,
    world,
  }) => {
    const users = usersPage(page);
    const samples = sampleListPage(page);

    await signInAsResearcher(page, world.researchers.pierre);

    await users.expectNoMenuEntry();

    await page.goto(`${adminUrl}/users/${world.researchers.jean.id}`, {
      waitUntil: "commit",
    });

    await samples.expectVisible();
  });

  test("a manual group manager curates the members of its own groups", async ({
    page,
    world,
  }) => {
    const { luc, pierre } = world.researchers;
    const groups = manualGroupsPage(page);
    const group = manualGroupPage(page);

    await signInAsResearcher(page, pierre);
    await groups.open();
    await groups.expectVisible();

    await groups.expectNoGroupRow(world.manualGroups["OZCAR-RI"].name);
    await groups.openGroup(world.manualGroups["ANR CritMet"].name);
    await group.expectNoEditControl();

    await group.associate(luc.email);
    await group.expectMember(luc.email, "Active");

    await group.detach("Luc Moreau");
    await group.expectNoMember(luc.email);
  });

  test("a manual group manager cannot detach a member owning a published sample", async ({
    page,
    world,
  }) => {
    const groups = manualGroupsPage(page);
    const group = manualGroupPage(page);

    await signInAsResearcher(page, world.researchers.pierre);
    await groups.open();
    await groups.openGroup(world.manualGroups["ProfilLoire 2024"].name);

    await group.expectDetachDisabled("Pierre Durand");
  });

  test("a space manager remains an ordinary researcher", async ({
    page,
    world,
  }) => {
    const samples = sampleListPage(page);

    await signInAsResearcher(page, world.researchers.marie);

    await samples.expectVisible();
  });

  test("a space manager edits a sample of the groups it manages", async ({
    page,
    request,
    world,
  }) => {
    const { jean, marie } = world.researchers;
    const { samples } = world;
    const moderation = sampleModerationPage(page);
    const edit = sampleEditPage(page);
    const target = samples.find(
      (sample) => sample.owner === "jean" && sample.status === "draft",
    );
    if (!target) throw new Error("no draft sample owned by Jean was seeded");

    await signInAsResearcher(page, marie);
    await moderation.open();
    await moderation.expectVisible();
    await moderation.expectSampleRowWithOwnerStatus(target.name, "Active");

    await moderation.openSample(target.name);
    await edit.expectVisible();
    await edit.fillSpecificName(`MC-${Date.now()}`);
    await edit.save();

    await maildev(request).expectMail(
      jean.email,
      `The sample "${target.name}" was edited by a moderator`,
      [`/samples/${target.id}`],
    );
  });
});
