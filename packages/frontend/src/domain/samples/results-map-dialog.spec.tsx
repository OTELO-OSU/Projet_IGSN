import { useState } from "react";
import { vi } from "vitest";
import { userEvent } from "vitest/browser";

import type { ListSamplesParams } from "./client/list-samples.ts";

import { publishedSample } from "../../../test/published-sample.ts";
import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { ResultsMapButton, ResultsMapDialog } from "./results-map-dialog.tsx";

const PARAMS = { page: 1, perPage: 10, search: "basalt", filters: {} };
const ALL_SAMPLES = { page: 1, perPage: 10, filters: {} };

const located = (number: number, name: string) => ({
  ...publishedSample({
    internalNumber: number,
    name,
    igsn: `0123456789ABCDEFGHJK${String(number).padStart(6, "0")}`,
  }),
  location: { position: { type: "point", latitude: 46, longitude: 2 } },
});

const BASALT = located(42, "Basalt 42");

type Point = [number: number, longitude: number, latitude: number];

const DEFAULT_POINTS: Point[] = [
  [42, 2, 46],
  [7, 8, 50],
];

function stubApi({
  points = DEFAULT_POINTS,
  pages = [[BASALT]],
  pointsStatus = 200,
  pointsResponse,
}: {
  points?: Point[];
  pages?: unknown[][];
  pointsStatus?: number;
  pointsResponse?: Promise<Response>;
} = {}) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = input as URL;
    if (url.pathname.endsWith("/samples/map/points")) {
      if (pointsResponse) return pointsResponse;
      return new Response(
        JSON.stringify({
          data: {
            numbers: points.map(([number]) => number),
            longitudes: points.map(([, longitude]) => longitude),
            latitudes: points.map(([, , latitude]) => latitude),
          },
        }),
        { status: pointsStatus },
      );
    }
    if (url.pathname.endsWith("/samples/map/samples")) {
      const numbers = url.searchParams.get("numbers")?.split(",").map(Number);
      return new Response(
        JSON.stringify({
          data: numbers?.includes(42)
            ? [{ internalNumber: 42, igsn: BASALT.igsn, name: BASALT.name }]
            : [],
        }),
      );
    }
    if (url.pathname.endsWith(`/samples/${BASALT.igsn}`)) {
      return new Response(
        JSON.stringify({
          data: { ...BASALT, status: "published", canContactArchive: false },
        }),
      );
    }
    const page = Number(url.searchParams.get("page"));
    return new Response(
      JSON.stringify({ data: pages[page - 1] ?? [], meta: {} }),
    );
  });
}

type FetchSpy = ReturnType<typeof stubApi>;

const requestsTo = (fetchSpy: FetchSpy, path: string) =>
  fetchSpy.mock.calls
    .map(([input]) => input as URL)
    .filter((url) => url.pathname === `/api${path}`)
    .map((url) => url.searchParams);

const listRequests = (fetchSpy: FetchSpy) => requestsTo(fetchSpy, "/samples");

const viewportOf = (params: URLSearchParams | undefined) =>
  params?.get("viewport")?.split(",").map(Number) ?? [];

async function renderOpenDialog(
  api?: Parameters<typeof stubApi>[0],
  params: ListSamplesParams = PARAMS,
) {
  const fetchSpy = stubApi(api);
  const screen = await renderWithRouter(
    <>
      <style>{".leaflet-container { width: 400px; height: 400px; }"}</style>
      <ResultsMapDialog open onOpenChange={vi.fn()} params={params} />
    </>,
  );
  await expect
    .element(screen.getByRole("button", { name: "Zoom in" }), {
      timeout: 15_000,
    })
    .toBeInTheDocument();
  return { screen, fetchSpy };
}

type Screen = Awaited<ReturnType<typeof renderOpenDialog>>["screen"];

const mapOf = (screen: Screen) => screen.getByRole("region", { name: "Map" });

const markerOf = (screen: Screen) =>
  mapOf(screen).getByRole("button", { name: "Basalt 42" });

const cardOf = (screen: Screen) =>
  screen.getByRole("listitem").getByRole("button", { name: "Basalt 42" });

const cards = (screen: Screen) =>
  screen.getByRole("listitem").getByRole("heading");

const sampleRequests = (fetchSpy: FetchSpy) =>
  requestsTo(fetchSpy, `/samples/${BASALT.igsn}`);

async function panRight(fetchSpy: FetchSpy) {
  const listed = listRequests(fetchSpy).length;
  document.querySelector<HTMLElement>(".leaflet-container")?.focus();
  await userEvent.keyboard("{ArrowRight}");
  await vi.waitFor(() =>
    expect(listRequests(fetchSpy).length).toBeGreaterThan(listed),
  );
}

async function scrollToLastCard(screen: Screen, fetchSpy: FetchSpy) {
  const listed = listRequests(fetchSpy).length;
  let isAtTop = false;
  await vi.waitFor(() => {
    isAtTop = !isAtTop;
    if (isAtTop) window.scrollTo(0, 0);
    else cards(screen).elements().at(-1)?.scrollIntoView();
    expect(listRequests(fetchSpy).length).toBeGreaterThan(listed);
  });
}

const afterLayout = () =>
  new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );

const FRANCE_POINTS = (count: number): Point[] =>
  Array.from({ length: count }, (_, index) => [
    index + 1,
    2 + (index % 5),
    44 + Math.floor(index / 5),
  ]);

const page = (from: number, count: number) =>
  Array.from({ length: count }, (_, index) =>
    located(from + index, `Sample ${from + index}`),
  );

function heldPoints(headers: HeadersInit) {
  let stream!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start: (controller) => {
      stream = controller;
    },
  });
  return {
    response: Promise.resolve(new Response(body, { headers })),
    send: (text: string) => stream.enqueue(new TextEncoder().encode(text)),
  };
}

function holdProgressDelay() {
  const realSetTimeout = globalThis.setTimeout;
  const held: (() => void)[] = [];
  vi.spyOn(globalThis, "setTimeout").mockImplementation(((
    handler: () => void,
    delayMs?: number,
    ...args: unknown[]
  ) => {
    if (delayMs !== 500) return realSetTimeout(handler, delayMs, ...args);
    held.push(handler);
    return 0;
  }) as typeof setTimeout);
  return () => held.forEach((handler) => handler());
}

const dialogTitle = (screen: Screen) =>
  screen.getByRole("heading", { name: "Search results on the map" });

function ReopenableDialog() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <style>{".leaflet-container { width: 400px; height: 400px; }"}</style>
      <button type="button" onClick={() => setOpen(true)}>
        Reopen
      </button>
      <ResultsMapDialog
        open={open}
        onOpenChange={setOpen}
        params={ALL_SAMPLES}
      />
    </>
  );
}

describe("ResultsMapDialog", () => {
  it("should show the progress bar from the start on the map of every sample", async () => {
    stubApi({ pointsResponse: new Promise(() => {}) });
    const screen = await renderWithRouter(
      <ResultsMapDialog open onOpenChange={vi.fn()} params={ALL_SAMPLES} />,
    );

    await expect.element(dialogTitle(screen)).toBeInTheDocument();

    expect(screen.getByRole("progressbar").query()).not.toBeNull();
  });

  it("should show the progress bar on a search map only once its load passes 500 ms", async () => {
    const elapse = holdProgressDelay();
    stubApi({ pointsResponse: new Promise(() => {}) });
    const screen = await renderWithRouter(
      <ResultsMapDialog open onOpenChange={vi.fn()} params={PARAMS} />,
    );
    await expect.element(dialogTitle(screen)).toBeInTheDocument();
    expect(screen.getByRole("progressbar").query()).toBeNull();

    elapse();

    await expect.element(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("should show no progress bar on a search map whose points and clusters arrive within 500 ms", async () => {
    const elapse = holdProgressDelay();
    const { screen } = await renderOpenDialog();
    await expect.element(markerOf(screen)).toBeInTheDocument();

    elapse();

    await afterLayout();
    expect(screen.getByRole("progressbar").query()).toBeNull();
  });

  it("should show no progress bar when the map reopens on points already loaded", async () => {
    stubApi();
    const screen = await renderWithRouter(<ReopenableDialog />);
    await expect.element(markerOf(screen)).toBeInTheDocument();
    await screen.getByRole("button", { name: "Close" }).click();
    let barShown = false;
    const observer = new MutationObserver(() => {
      barShown ||= document.querySelector("progress") !== null;
    });
    observer.observe(document.body, { childList: true, subtree: true });

    await screen.getByRole("button", { name: "Reopen" }).click();

    await expect.element(markerOf(screen)).toBeInTheDocument();
    observer.disconnect();
    expect(barShown).toBe(false);
  });

  it.each([
    {
      header: "an uncompressed length",
      headers: new Headers({ "X-Uncompressed-Length": "200" }),
      bar: { name: "Downloading samples… 50%", value: "50" },
    },
    {
      header: "no uncompressed length",
      headers: new Headers(),
      bar: { name: "Downloading samples…", value: null },
    },
  ])(
    "should show the download progress of points sent with $header",
    async ({ headers, bar }) => {
      const points = heldPoints(headers);
      stubApi({ pointsResponse: points.response });
      const screen = await renderWithRouter(
        <ResultsMapDialog open onOpenChange={vi.fn()} params={ALL_SAMPLES} />,
      );
      await expect.element(dialogTitle(screen)).toBeInTheDocument();

      points.send("x".repeat(100));

      const progressbar = screen.getByRole("progressbar", { name: bar.name });
      await expect.element(progressbar).toBeInTheDocument();
      expect(progressbar.element().getAttribute("value")).toBe(bar.value);
    },
  );

  it("should ask to open the map from the See on map button", async () => {
    const onClick = vi.fn();
    const screen = await renderWithRouter(
      <ResultsMapButton onClick={onClick} />,
    );

    await screen.getByRole("button", { name: "See on map" }).click();

    expect(onClick).toHaveBeenCalled();
  });

  it("should load the points once and redraw the clusters as the reader zooms", async () => {
    const { screen, fetchSpy } = await renderOpenDialog({
      points: [[42, 2, 46], [43, 2.3, 46], ...DEFAULT_POINTS.slice(1)],
    });
    const bubble = mapOf(screen).getByRole("button", { name: "2 samples" });

    await bubble.click();

    await expect.element(markerOf(screen)).toBeInTheDocument();
    expect(requestsTo(fetchSpy, "/samples/map/points")).toHaveLength(1);
  });

  it("should show an alert when the points fail to load", async () => {
    stubApi({ pointsStatus: 429 });
    const screen = await renderWithRouter(
      <ResultsMapDialog open onOpenChange={vi.fn()} params={PARAMS} />,
    );

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent("The map could not load the results.");
  });

  it.each([
    {
      fit: "the search bbox",
      params: { ...PARAMS, bbox: "0,40,10,50" },
      points: [[1, 5, 45]] as Point[],
      target: { west: 0, south: 40, east: 10, north: 50 },
    },
    {
      fit: "the points' extent",
      params: PARAMS,
      points: [
        [1, 2, 46],
        [2, 8, 50],
      ] as Point[],
      target: { west: 2, south: 46, east: 8, north: 50 },
    },
  ])("should first fit the map to $fit", async ({ params, points, target }) => {
    const { fetchSpy } = await renderOpenDialog({ points }, params);

    await vi.waitFor(() => expect(listRequests(fetchSpy)).not.toHaveLength(0));
    const [west = 0, south = 0, east = 0, north = 0] = viewportOf(
      listRequests(fetchSpy)[0],
    );
    expect(west).toBeLessThanOrEqual(target.west);
    expect(south).toBeLessThanOrEqual(target.south);
    expect(east).toBeGreaterThanOrEqual(target.east);
    expect(north).toBeGreaterThanOrEqual(target.north);
    expect(east - west).toBeLessThan(4 * (target.east - target.west));
  });

  it("should list the map's viewport 20 cards at a time with no total, from opening and after a move", async () => {
    const { fetchSpy } = await renderOpenDialog();
    await vi.waitFor(() => expect(listRequests(fetchSpy)).toHaveLength(1));
    const opening = listRequests(fetchSpy)[0];

    await panRight(fetchSpy);

    const moved = listRequests(fetchSpy).at(-1);
    expect(
      [opening, moved].map((params) => ({
        page: params?.get("page"),
        perPage: params?.get("perPage"),
        withTotal: params?.get("withTotal"),
        search: params?.get("search"),
      })),
    ).toEqual([
      { page: "1", perPage: "20", withTotal: "false", search: "basalt" },
      { page: "1", perPage: "20", withTotal: "false", search: "basalt" },
    ]);
    expect(moved?.get("viewport")).not.toBe(opening?.get("viewport"));
  });

  it("should count the points inside the map's view", async () => {
    const { screen } = await renderOpenDialog(
      {
        points: [
          [42, 2, 46],
          [7, 6, 48],
          [3, 100, 0],
        ],
      },
      { ...PARAMS, bbox: "-5,42,8,51" },
    );

    await expect
      .element(screen.getByText("2 results", { exact: true }))
      .toBeInTheDocument();
  });

  it("should say nothing matches when the list returns no card in view", async () => {
    const { screen } = await renderOpenDialog({ pages: [[]] });

    await expect
      .element(screen.getByText("No samples match your search."))
      .toBeInTheDocument();
  });

  it("should list an area partly in view whose point lies outside it", async () => {
    const { screen } = await renderOpenDialog(
      { points: [[42, 100, 0]] },
      { ...PARAMS, bbox: "-5,42,8,51" },
    );

    await expect.element(cardOf(screen)).toBeInTheDocument();
    expect(
      screen.getByText("No samples match your search.").query(),
    ).toBeNull();
  });

  it("should load 20 more cards as the reader scrolls to the end, and stop after a short page", async () => {
    const { screen, fetchSpy } = await renderOpenDialog({
      points: FRANCE_POINTS(25),
      pages: [page(1, 20), page(21, 5)],
    });
    await expect.poll(() => cards(screen).elements()).toHaveLength(20);

    await scrollToLastCard(screen, fetchSpy);

    await expect.poll(() => cards(screen).elements()).toHaveLength(25);
    cards(screen).elements().at(-1)?.scrollIntoView();
    await afterLayout();
    expect(listRequests(fetchSpy).map((params) => params.get("page"))).toEqual([
      "1",
      "2",
    ]);
  });

  it("should list a sample once when a later page repeats it", async () => {
    const { screen, fetchSpy } = await renderOpenDialog({
      points: FRANCE_POINTS(25),
      pages: [page(1, 20), [...page(20, 1), ...page(21, 4)]],
    });
    await expect.poll(() => cards(screen).elements()).toHaveLength(20);

    await scrollToLastCard(screen, fetchSpy);

    await expect
      .element(screen.getByRole("heading", { name: "Sample 24" }))
      .toBeInTheDocument();
    expect(cards(screen).elements()).toHaveLength(24);
  });

  it("should mark a loaded sample's card current and focus it when its marker is clicked, fetching nothing", async () => {
    const { screen, fetchSpy } = await renderOpenDialog();
    const card = cardOf(screen);
    await expect.element(card).toBeInTheDocument();

    await markerOf(screen).click();

    await expect.element(card).toHaveAttribute("aria-current", "true");
    await expect.element(card).toHaveFocus();
    expect(cardOf(screen).elements()).toHaveLength(1);
    expect(sampleRequests(fetchSpy)).toHaveLength(0);
  });

  it("should pin a sample's card current and focused atop the list when its marker is clicked before its page is loaded", async () => {
    const { screen, fetchSpy } = await renderOpenDialog({
      pages: [page(7, 1)],
    });
    await expect
      .element(screen.getByRole("heading", { name: "Sample 7" }))
      .toBeInTheDocument();

    await markerOf(screen).click();

    await expect
      .element(cardOf(screen))
      .toHaveAttribute("aria-current", "true");
    await expect.element(cardOf(screen)).toHaveFocus();
    expect(cards(screen).elements()[0]).toHaveTextContent("Basalt 42");
    expect(sampleRequests(fetchSpy)).toHaveLength(1);
  });

  it("should list a pinned sample's card once when its page loads", async () => {
    const { screen, fetchSpy } = await renderOpenDialog({
      points: [...FRANCE_POINTS(20), [42, 10, 52]],
      pages: [page(1, 20), [BASALT]],
    });
    await expect.poll(() => cards(screen).elements()).toHaveLength(20);
    await expect.element(markerOf(screen)).toBeInTheDocument();
    (markerOf(screen).element() as HTMLElement).click();
    await expect
      .element(cardOf(screen))
      .toHaveAttribute("aria-current", "true");
    expect(sampleRequests(fetchSpy)).toHaveLength(1);

    await scrollToLastCard(screen, fetchSpy);

    await vi.waitFor(() => expect(listRequests(fetchSpy)).toHaveLength(2));
    await afterLayout();
    expect(cards(screen).elements()).toHaveLength(21);
    expect(cardOf(screen).elements()).toHaveLength(1);
  });

  it("should drop the pinned card when the map's background is clicked", async () => {
    const { screen } = await renderOpenDialog({ pages: [page(7, 1)] });
    await markerOf(screen).click();
    await expect.element(cardOf(screen)).toBeInTheDocument();

    document.querySelector<HTMLElement>(".leaflet-container")?.click();

    await expect.element(cardOf(screen)).not.toBeInTheDocument();
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

    await expect.element(markerOf(screen)).toHaveClass("bg-tertiary");
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
});
