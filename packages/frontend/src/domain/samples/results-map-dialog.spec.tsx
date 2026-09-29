import { vi } from "vitest";
import { userEvent } from "vitest/browser";

import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { ResultsMapButton, ResultsMapDialog } from "./results-map-dialog.tsx";

const PARAMS = { page: 1, perPage: 10, search: "basalt", filters: {} };

const MAP_RESPONSE = {
  data: [],
  meta: { extent: { west: -5, south: 42, east: 8, north: 51 } },
};

const LIST_RESPONSE = { data: [], meta: { total: 0 } };

function stubApi() {
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(
      async (input) =>
        new Response(
          JSON.stringify(
            (input as URL).pathname.endsWith("/samples/map")
              ? MAP_RESPONSE
              : LIST_RESPONSE,
          ),
        ),
    );
}

type FetchSpy = ReturnType<typeof stubApi>;

const viewportsOf = (fetchSpy: FetchSpy, isMap: boolean) =>
  fetchSpy.mock.calls
    .map(([input]) => input as URL)
    .filter((url) => url.pathname.endsWith("/samples/map") === isMap)
    .map((url) => url.searchParams.get("viewport"));

const viewports = (fetchSpy: FetchSpy) => viewportsOf(fetchSpy, true);

async function renderOpenDialog() {
  const fetchSpy = stubApi();
  const screen = await renderWithRouter(
    <>
      <style>{".leaflet-container { width: 400px; height: 400px; }"}</style>
      <ResultsMapDialog open onOpenChange={vi.fn()} params={PARAMS} />
    </>,
  );
  await vi.waitFor(() => expect(viewports(fetchSpy)).toHaveLength(2), {
    timeout: 15_000,
  });
  const listedViewport = () => viewportsOf(fetchSpy, false).at(-1);
  return { screen, fetchSpy, listedViewport };
}

async function panRight(fetchSpy: FetchSpy) {
  document.querySelector<HTMLElement>(".leaflet-container")?.focus();
  await userEvent.keyboard("{ArrowRight}");
  await vi.waitFor(() => expect(viewports(fetchSpy)).toHaveLength(3));
}

describe("ResultsMapDialog", () => {
  it("should ask to open the map from the See on map button", async () => {
    const onClick = vi.fn();
    const screen = await renderWithRouter(
      <ResultsMapButton onClick={onClick} />,
    );

    await screen.getByRole("button", { name: "See on map" }).click();

    expect(onClick).toHaveBeenCalled();
  });

  it("should search the viewport the reader moves the map to", async () => {
    const { screen, fetchSpy, listedViewport } = await renderOpenDialog();
    await expect
      .element(screen.getByRole("switch", { name: "Search while moving map" }))
      .toBeChecked();

    await panRight(fetchSpy);

    await vi.waitFor(() =>
      expect(listedViewport()).toBe(viewports(fetchSpy).at(-1)),
    );
  });

  it("should keep the search as is when the reader moves the map with the box unticked", async () => {
    const { screen, fetchSpy, listedViewport } = await renderOpenDialog();
    await screen
      .getByRole("switch", { name: "Search while moving map" })
      .click();

    await panRight(fetchSpy);

    expect(listedViewport()).toBeNull();
  });
});
