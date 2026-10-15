import { expect, type Page } from "@playwright/test";

import { frontendUrl } from "../urls";

export function homePage(page: Page) {
  return {
    goto: () => page.goto(frontendUrl),
    mapAllSamples: async () => {
      const loaded = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/api/samples/map/points",
      );
      await expect(async () => {
        await page
          .getByRole("link", { name: "Browse all samples on a map" })
          .click();
        await page.waitForURL(
          (url) =>
            /^\/(\w{2}\/?)?$/.test(url.pathname) && url.search === "?map=true",
          { timeout: 2_000 },
        );
      }).toPass({ timeout: 20_000 });
      await loaded;
    },
  };
}
