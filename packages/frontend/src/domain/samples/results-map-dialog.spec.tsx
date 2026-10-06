import { vi } from "vitest";
import { userEvent } from "vitest/browser";

import { publishedSample } from "../../../test/published-sample.ts";
import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { ResultsMapButton, ResultsMapDialog } from "./results-map-dialog.tsx";

const PARAMS = { page: 1, perPage: 10, search: "basalt", filters: {} };

const BASALT = {
  ...publishedSample(),
  location: { position: { type: "point", latitude: 46, longitude: 2 } },
  publishingError: null,
};

const MAP_RESPONSE = {
  data: [
    {
      longitude: 2,
      latitude: 46,
      count: 1,
      extent: { west: 2, south: 46, east: 2, north: 46 },
      sample: { igsn: BASALT.igsn, name: BASALT.name, material: null },
    },
  ],
  meta: { extent: { west: -5, south: 42, east: 8, north: 51 } },
};

function stubApi(total = 1) {
  const listResponse = { data: [BASALT], meta: { total } };
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(
      async (input) =>
        new Response(
          JSON.stringify(
            (input as URL).pathname.endsWith("/samples/map")
              ? MAP_RESPONSE
              : listResponse,
          ),
        ),
    );
}

type FetchSpy = ReturnType<typeof stubApi>;

const requestsOf = (fetchSpy: FetchSpy, isMap: boolean) =>
  fetchSpy.mock.calls
    .map(([input]) => input as URL)
    .filter((url) => url.pathname.endsWith("/samples/map") === isMap)
    .map((url) => url.searchParams);

const viewports = (fetchSpy: FetchSpy) =>
  requestsOf(fetchSpy, true).map((params) => params.get("viewport"));

async function renderOpenDialog(total?: number) {
  const fetchSpy = stubApi(total);
  const screen = await renderWithRouter(
    <>
      <style>{".leaflet-container { width: 400px; height: 400px; }"}</style>
      <ResultsMapDialog open onOpenChange={vi.fn()} params={PARAMS} />
    </>,
  );
  await vi.waitFor(() => expect(viewports(fetchSpy)).toHaveLength(2), {
    timeout: 15_000,
  });
  const lastListed = () => {
    const params = requestsOf(fetchSpy, false).at(-1);
    return {
      viewport: params?.get("viewport"),
      perPage: params?.get("perPage"),
    };
  };
  return { screen, fetchSpy, lastListed };
}

async function panRight(fetchSpy: FetchSpy) {
  document.querySelector<HTMLElement>(".leaflet-container")?.focus();
  await userEvent.keyboard("{ArrowRight}");
  await vi.waitFor(() => expect(viewports(fetchSpy)).toHaveLength(3));
}

type Screen = Awaited<ReturnType<typeof renderOpenDialog>>["screen"];

const markerOf = (screen: Screen) =>
  screen
    .getByRole("region", { name: "Map" })
    .getByRole("button", { name: "Basalt 42" });

const cardOf = (screen: Screen) =>
  screen.getByRole("listitem").getByRole("button", { name: "Basalt 42" });

describe("ResultsMapDialog", () => {
  it("should ask to open the map from the See on map button", async () => {
    const onClick = vi.fn();
    const screen = await renderWithRouter(
      <ResultsMapButton onClick={onClick} />,
    );

    await screen.getByRole("button", { name: "See on map" }).click();

    expect(onClick).toHaveBeenCalled();
  });

  it("should list the map's viewport, 500 samples at most, from opening and after a move", async () => {
    const { fetchSpy, lastListed } = await renderOpenDialog();
    await vi.waitFor(() =>
      expect(lastListed()).toEqual({
        viewport: viewports(fetchSpy).at(-1),
        perPage: "500",
      }),
    );

    await panRight(fetchSpy);

    await vi.waitFor(() =>
      expect(lastListed()).toEqual({
        viewport: viewports(fetchSpy).at(-1),
        perPage: "500",
      }),
    );
  });

  it("should mark a sample's card current and focus it when its marker is clicked", async () => {
    const { screen } = await renderOpenDialog();
    const card = cardOf(screen);
    await expect.element(card).toBeInTheDocument();

    await markerOf(screen).click();

    await expect.element(card).toHaveAttribute("aria-current", "true");
    await expect.element(card).toHaveFocus();
  });

  it("should mark a sample's card current when it is clicked", async () => {
    const { screen } = await renderOpenDialog();

    await cardOf(screen).click();

    await expect
      .element(cardOf(screen))
      .toHaveAttribute("aria-current", "true");
  });

  it("should keep the selected sample highlighted on the map once the pointer leaves its card", async () => {
    const { screen } = await renderOpenDialog();
    await markerOf(screen).click();

    await cardOf(screen).hover();
    await cardOf(screen).unhover();

    await expect.element(markerOf(screen)).toHaveClass("bg-amber-500");
  });

  it("should clear the selection when the map's background is clicked", async () => {
    const { screen } = await renderOpenDialog();
    await markerOf(screen).click();
    await expect
      .element(cardOf(screen))
      .toHaveAttribute("aria-current", "true");

    document.querySelector<HTMLElement>(".leaflet-container")?.click();

    await expect.element(cardOf(screen)).not.toHaveAttribute("aria-current");
  });

  it("should offer the card field picker over the list", async () => {
    const { screen } = await renderOpenDialog();

    await expect
      .element(screen.getByRole("button", { name: "Add field results" }))
      .toBeInTheDocument();
  });

  it.each([
    { total: 500, capped: false },
    { total: 501, capped: true },
  ])(
    "should say only the first 500 are listed when $total match: $capped",
    async ({ total, capped }) => {
      const { screen } = await renderOpenDialog(total);
      await expect
        .element(screen.getByText(`${total} results`, { exact: true }))
        .toBeInTheDocument();

      expect(
        screen.getByText(/Only the first 500 results are listed/).query() !==
          null,
      ).toBe(capped);
    },
  );
});
