import { test } from "../support/db";
import { partnersPage } from "../support/frontend/partners.page";

test.describe("partners page", () => {
  test("a reader follows the header nav to the partners and their roles", async ({
    page,
  }) => {
    const partners = partnersPage(page);
    await partners.gotoHome();

    await partners.followNavLink();

    await partners.expectPage();
    for (const [name, role] of [
      ["CNRS", "Initiated by"],
      ["OSU OTELo", "Led by"],
      ["GaiaData", "Funded by"],
      ["Marmelab", "Developed by"],
    ] as const) {
      await partners.expectPartner(name, role);
    }
  });

  test.describe("on a small screen", () => {
    test.use({ viewport: { width: 320, height: 800 } });

    test("a reader opens the menu to reach the partners, without horizontal scroll", async ({
      page,
    }) => {
      const partners = partnersPage(page);
      await partners.gotoHome();

      await partners.openMenu();
      await partners.followNavLink();

      await partners.expectPage();
      await partners.expectNoHorizontalScroll();
    });
  });
});
