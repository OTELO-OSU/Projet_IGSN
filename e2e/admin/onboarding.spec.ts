import { charterPage } from "../support/admin/charter.page";
import { institutionalGroupsPage } from "../support/admin/institutional-groups.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import { settingsPage } from "../support/admin/settings.page";
import { RESEARCHERS, completeIdpLogin } from "../support/admin/sign-in";
import { sampleNamed, test } from "../support/db";
import { headerPage } from "../support/frontend/header.page";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";

test.describe("onboarding", () => {
  test("a researcher signing in from a sample page accepts the terms of use, then declares their institution before reaching the app", async ({
    page,
    samples,
  }) => {
    const charter = charterPage(page);
    const groups = institutionalGroupsPage(page);
    const list = sampleListPage(page);
    const settings = settingsPage(page);

    await sampleDetailPage(page).goto(sampleNamed(samples, "Basalt 42").igsn);
    await headerPage(page).signIn();
    await completeIdpLogin(page, RESEARCHERS.theo);

    await charter.expectShown();
    await charter.expectAcceptDisabled();
    await groups.expectNotShown();

    await charter.dismissWithEscape();
    await charter.expectShown();

    await charter.accept();

    await charter.expectNotShown();
    await groups.expectShown();

    await page.reload();

    await groups.expectShown();
    await charter.expectNotShown();

    await groups.declare({
      organization: "Université de Lorraine",
      osu: "Observatoire Terre et Environnement de Lorraine",
      laboratory: "Centre de recherches pétrographiques et géochimiques",
    });

    await list.expectVisible();
    await groups.expectNotShown();

    await page.reload();

    await list.expectVisible();
    await groups.expectNotShown();

    await settings.openGroups();
    await settings.setInstitution({
      organization: "Université Grenoble Alpes",
      osu: "Observatoire des sciences de l'univers de Grenoble",
      laboratory: "ISTerre",
    });

    await page.reload();

    await settings.expectInstitution("ISTerre");
  });
});
