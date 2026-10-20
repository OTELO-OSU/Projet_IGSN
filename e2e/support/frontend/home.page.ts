import { expect, type Page } from "@playwright/test";

import { frontendUrl } from "../urls";

export function homePage(page: Page) {
  return {
    goto: () => page.goto(frontendUrl),
    gotoLocale: (locale: string) => page.goto(`${frontendUrl}/${locale}`),
    expectLocale: async (locale: string, title: string) => {
      await page.waitForURL((url) => url.pathname.startsWith(`/${locale}`));
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
    },
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
