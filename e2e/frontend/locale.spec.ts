import { test } from "@playwright/test";

import messagesEn from "../../packages/frontend/messages/en.json";
import messagesFr from "../../packages/frontend/messages/fr.json";
import { homePage } from "../support/frontend/home.page";

test.describe("public site locale", () => {
  test("a visitor reads the French site, switches to English from the header, and the choice sticks", async ({
    page,
  }) => {
    const home = homePage(page);

    await home.gotoLocale("fr");
    await home.expectLocale("fr", messagesFr.search_landing_title);

    await home.switchLocale(messagesEn.locale_name_en);
    await home.expectLocale("en", messagesEn.search_landing_title);

    await home.goto();
    await home.expectLocale("en", messagesEn.search_landing_title);
  });
});
