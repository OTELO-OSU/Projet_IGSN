import { expect, type Page } from "@playwright/test";

import { frontendUrl } from "../urls";

const CLUSTER_NAME = /^(\d+) samples$/;
const ZOOM_CONTROL = /^Zoom (in|out)$/;

export function resultsMapPage(page: Page) {
  const dialog = page.getByRole("dialog", {
    name: "Search results on the map",
  });
  const map = dialog.getByRole("region", { name: "Map" });
  const waitForMap = () =>
    page.waitForResponse((response) =>
      response.url().includes("/api/samples/map"),
    );

  async function markerNames(): Promise<string[]> {
    const names = await map
      .getByRole("button")
      .evaluateAll((buttons) =>
        buttons.map(
          (button) =>
            button.getAttribute("aria-label") ??
            button.getAttribute("title") ??
            "",
        ),
      );
    return names.filter((name) => !ZOOM_CONTROL.test(name));
  }

  async function markedSampleCount(): Promise<number> {
    const names = await markerNames();
    return names.reduce(
      (total, name) => total + Number(CLUSTER_NAME.exec(name)?.[1] ?? 1),
      0,
    );
  }

  async function drag(offsetX: number) {
    const box = await map.boundingBox();
    if (!box) throw new Error("the results map is not rendered");
    const x = box.x + box.width * 0.1;
    const y = box.y + box.height * 0.85;
    const moved = waitForMap();
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + offsetX, y, { steps: 10 });
    await page.mouse.up();
    await moved;
  }

  return {
    gotoOpen: async (query: string) => {
      const loaded = waitForMap();
      await page.goto(`${frontendUrl}/search?${query}&map=true`);
      await loaded;
      await expect(map.getByRole("button", { name: "Zoom in" })).toBeVisible();
    },
    open: async () => {
      const loaded = waitForMap();
      await page.getByRole("button", { name: "See on map" }).click();
      await loaded;
      await page.waitForURL(/[?&]map=true/);
      await expect(map.getByRole("button", { name: "Zoom in" })).toBeVisible();
    },
    expectResultCount: (count: number) =>
      expect(
        dialog.getByText(count === 1 ? "1 result" : `${count} results`, {
          exact: true,
        }),
      ).toBeVisible(),
    expectListed: (name: string) =>
      expect(dialog.getByRole("link", { name })).toBeVisible(),
    expectMarkedSampleCount: (count: number) =>
      expect.poll(markedSampleCount).toBe(count),
    expectMarker: (name: string) =>
      expect(map.getByRole("button", { name, exact: true })).toBeVisible(),
    clickFirstCluster: () =>
      map.getByRole("button", { name: CLUSTER_NAME }).first().click(),
    openSample: async (name: string) => {
      await map.getByRole("button", { name, exact: true }).click();
      await map.getByRole("link", { name: "View sample" }).click();
    },
    stopSearchingWhileMoving: () =>
      dialog.getByRole("switch", { name: "Search while moving map" }).click(),
    panRight: () => drag(150),
    expectLocationSearchUntouched: () =>
      expect(page).not.toHaveURL(/[?&]bbox=/),
  };
}
