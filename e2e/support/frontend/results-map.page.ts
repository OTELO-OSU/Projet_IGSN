import { expect, type Page } from "@playwright/test";

const CLUSTER_NAME = /^(\d+) samples$/;
const ZOOM_CONTROL = /^Zoom (in|out)$/;

export function resultsMapPage(page: Page) {
  const dialog = page.getByRole("dialog", {
    name: "Search results on the map",
  });
  const map = dialog.getByRole("region", { name: "Map" });
  const isPointsRequest = (url: string) =>
    new URL(url).pathname === "/api/samples/map/points";
  const waitForMap = () =>
    page.waitForResponse((response) => isPointsRequest(response.url()));

  const card = (name: string) =>
    dialog.getByRole("listitem").filter({ hasText: name });

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

  return {
    open: async () => {
      const loaded = waitForMap();
      await page.getByRole("radio", { name: "See on map" }).click();
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
    expectMarkedSampleCount: (count: number) =>
      expect.poll(markedSampleCount).toBe(count),
    expectEveryMarkedSampleCounted: async () => {
      await expect.poll(markedSampleCount).toBeGreaterThan(0);
      const count = await markedSampleCount();
      await expect(
        dialog.getByText(count === 1 ? "1 result" : `${count} results`, {
          exact: true,
        }),
      ).toBeVisible();
    },
    expectMarker: (name: string) =>
      expect(map.getByRole("button", { name, exact: true })).toBeVisible(),
    expectMarkerTooltip: async (name: string, igsn: string) => {
      await map.getByRole("button", { name, exact: true }).hover();
      await expect(map.getByRole("tooltip")).toHaveText(
        new RegExp(`^${name}\\s*${igsn}$`),
      );
    },
    selectMarker: (name: string) =>
      map.getByRole("button", { name, exact: true }).click(),
    expectSelected: (name: string) =>
      expect(card(name).getByRole("button", { name })).toHaveAttribute(
        "aria-current",
        "true",
      ),
    openListedInNewTab: async (name: string): Promise<Page> => {
      const [popup] = await Promise.all([
        page.waitForEvent("popup"),
        card(name)
          .getByRole("link", { name: "View sample (opens in a new tab)" })
          .click(),
      ]);
      return popup;
    },
  };
}
