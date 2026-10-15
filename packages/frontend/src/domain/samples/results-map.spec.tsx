import type {
  SampleMapDetail,
  SampleMapPointsResponse,
} from "@projet-igsn/domain/sample/map/model";

import { vi } from "vitest";
import { userEvent } from "vitest/browser";

import { publishedSample } from "../../../test/published-sample.ts";
import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { ResultsMap } from "./results-map.tsx";

const FRANCE = { west: -5, south: 42, east: 8, north: 51 };

type Point = [number: number, longitude: number, latitude: number];

const pointsOf = (points: Point[]): SampleMapPointsResponse["data"] => ({
  numbers: points.map(([number]) => number),
  longitudes: points.map(([, longitude]) => longitude),
  latitudes: points.map(([, , latitude]) => latitude),
});

const OFFSET_DEGREES = 0.05;
const group = (
  firstNumber: number,
  count: number,
  longitude: number,
  latitude: number,
): Point[] =>
  Array.from({ length: count }, (_, index) => [
    firstNumber + index,
    longitude + (index % 2 ? OFFSET_DEGREES : -OFFSET_DEGREES),
    latitude + (Math.floor(index / 2) % 2 ? OFFSET_DEGREES : -OFFSET_DEGREES),
  ]);

const BASALT: SampleMapDetail = {
  internalNumber: 42,
  igsn: "0123456789ABCDEFGHJKMNPQRS",
  name: "Basalt 42",
};
const GRANITE: SampleMapDetail = {
  internalNumber: 7,
  igsn: "TVWXYZ0123456789ABCDEFGHJK",
  name: "Granite 7",
};
const BASALT_POINT: Point = [42, 2, 46];
const GRANITE_POINT: Point = [7, -2, 46];
const CLUSTER_POINTS = group(1000, 12, 3, 46);

type MapProps = Parameters<typeof ResultsMap>[0];

function stubApi({
  details = [BASALT, GRANITE],
  listed = { data: [], meta: { total: 0 } },
  detailsArrive = Promise.resolve(),
}: {
  details?: SampleMapDetail[];
  listed?: unknown;
  detailsArrive?: Promise<void>;
} = {}) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = input as URL;
    if (!url.pathname.endsWith("/samples/map/samples")) {
      return new Response(JSON.stringify(listed));
    }
    await detailsArrive;
    const numbers = url.searchParams.get("numbers")?.split(",").map(Number);
    return new Response(
      JSON.stringify({
        data: details.filter(({ internalNumber }) =>
          numbers?.includes(internalNumber),
        ),
      }),
    );
  });
}

async function renderMap(props: Partial<MapProps> = {}) {
  const onViewportChange = vi.fn();
  const onSelectSample = vi.fn();
  const screen = await renderWithRouter(
    <>
      <style>{".leaflet-container { width: 400px; height: 400px; }"}</style>
      <ResultsMap
        points={pointsOf([])}
        fitTo={FRANCE}
        filters={{}}
        onViewportChange={onViewportChange}
        onSelectSample={onSelectSample}
        {...props}
      />
    </>,
    ["/samples/$igsn"],
  );
  await vi.waitFor(() => expect(onViewportChange).toHaveBeenCalled());
  return { screen, onViewportChange, onSelectSample };
}

const lastViewport = (spy: ReturnType<typeof vi.fn>) => spy.mock.lastCall?.[0];

describe("ResultsMap", () => {
  it("should announce the map is loading until its clusters arrive", async () => {
    const announcements: (string | null)[] = [];
    const observer = new MutationObserver(() =>
      announcements.push(
        document.querySelector('[role="status"]')?.textContent ?? null,
      ),
    );
    observer.observe(document.body, { childList: true, subtree: true });

    const { screen } = await renderMap({ points: pointsOf(CLUSTER_POINTS) });

    await expect
      .element(screen.getByRole("button", { name: "12 samples" }))
      .toBeInTheDocument();
    observer.disconnect();
    expect(announcements).toContain("Loading samples on the map…");
    await expect.element(screen.getByRole("status")).not.toBeInTheDocument();
  });

  it("should show an indeterminate preparing bar until the clusters arrive", async () => {
    const bars = new Set<string>();
    const observer = new MutationObserver(() => {
      const bar = document.querySelector("progress");
      if (bar) {
        bars.add(
          JSON.stringify({
            status: document.querySelector('[role="status"]')?.textContent,
            value: bar.getAttribute("value"),
          }),
        );
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const { screen } = await renderMap({
      points: pointsOf(CLUSTER_POINTS),
      showProgress: true,
    });

    await expect
      .element(screen.getByRole("button", { name: "12 samples" }))
      .toBeInTheDocument();
    observer.disconnect();
    expect([...bars]).toEqual([
      JSON.stringify({ status: "Preparing the map…", value: null }),
    ]);
    expect(screen.getByRole("progressbar").query()).toBeNull();
  });

  it("should show the map error instead of the loading status when the cluster worker fails", async () => {
    const RealWorker = Worker;
    vi.spyOn(globalThis, "Worker").mockImplementation(function () {
      return new RealWorker(
        URL.createObjectURL(
          new Blob(['throw new Error("Cluster index failed")'], {
            type: "text/javascript",
          }),
        ),
      );
    });

    const { screen } = await renderMap({ points: pointsOf(CLUSTER_POINTS) });

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent("The map could not load the results.");
    expect(screen.getByRole("status").query()).toBeNull();
  });

  it("should label a single sample's marker Sample until its details arrive, then show its name and IGSN", async () => {
    let releaseDetails = () => {};
    stubApi({
      detailsArrive: new Promise((resolve) => {
        releaseDetails = resolve;
      }),
    });
    const { screen } = await renderMap({ points: pointsOf([BASALT_POINT]) });

    await screen.getByRole("button", { name: "Sample", exact: true }).hover();
    await expect
      .element(screen.getByRole("tooltip"))
      .toHaveTextContent(/^Sample$/);
    releaseDetails();

    await screen.getByRole("button", { name: "Basalt 42" }).hover();
    await expect
      .element(screen.getByRole("tooltip"))
      .toHaveTextContent(/^Basalt 420123456789ABCDEFGHJKMNPQRS$/);
  });

  it.each([
    {
      input: "a click",
      act: async (marker: HTMLElement) => marker.click(),
    },
    {
      input: "Enter",
      act: async (marker: HTMLElement) => {
        marker.focus();
        await userEvent.keyboard("{Enter}");
      },
    },
  ])(
    "should select a sample from its marker on $input, opening no popup",
    async ({ act }) => {
      stubApi();
      const { screen, onSelectSample } = await renderMap({
        points: pointsOf([BASALT_POINT]),
      });
      const marker = screen.getByRole("button", { name: "Basalt 42" });
      await expect.element(marker).toBeInTheDocument();

      await act(marker.element() as HTMLElement);

      await vi.waitFor(() =>
        expect(onSelectSample).toHaveBeenCalledWith({
          igsn: "0123456789ABCDEFGHJKMNPQRS",
          position: { type: "point", latitude: 46, longitude: 2 },
        }),
      );
      expect(document.querySelector(".leaflet-popup")).toBeNull();
    },
  );

  it("should set the hovered sample's marker apart from the others", async () => {
    stubApi();
    const { screen } = await renderMap({
      points: pointsOf([BASALT_POINT, GRANITE_POINT]),
      highlighted: {
        igsn: BASALT.igsn,
        position: { type: "point", longitude: 2, latitude: 46 },
      },
    });

    const basalt = screen.getByRole("button", { name: "Basalt 42" });
    const granite = screen.getByRole("button", { name: "Granite 7" });
    await expect.element(basalt).toBeInTheDocument();
    await expect.element(granite).toBeInTheDocument();
    expect(basalt.element().className).not.toBe(granite.element().className);
  });

  it("should highlight the cluster whose extent holds a hovered sample", async () => {
    const { screen } = await renderMap({
      points: pointsOf(CLUSTER_POINTS),
      highlighted: {
        igsn: BASALT.igsn,
        position: { type: "point", longitude: 3, latitude: 46 },
      },
    });

    await expect
      .element(screen.getByRole("button", { name: "12 samples" }))
      .toHaveClass("bg-tertiary");
  });

  it("should highlight no cluster for a hovered sample outside every cluster's extent", async () => {
    const { screen } = await renderMap({
      points: pointsOf(CLUSTER_POINTS),
      highlighted: {
        igsn: BASALT.igsn,
        position: { type: "point", longitude: 5.5, latitude: 47.5 },
      },
    });

    await expect
      .element(screen.getByRole("button", { name: "12 samples" }))
      .not.toHaveClass("bg-tertiary");
  });

  it("should draw a crowded cluster's bubble larger than a sparse one's", async () => {
    const { screen } = await renderMap({
      points: pointsOf([...group(1, 2, -2, 46), ...group(100, 100, 3, 46)]),
    });
    const sparse = screen.getByRole("button", { name: "2 samples" });
    const crowded = screen.getByRole("button", { name: "100 samples" });
    await expect.element(crowded).toBeInTheDocument();

    expect(crowded.element().getBoundingClientRect().width).toBeGreaterThan(
      sparse.element().getBoundingClientRect().width,
    );
  });

  it.each([
    {
      input: "a click",
      act: async (bubble: HTMLElement) => bubble.click(),
    },
    {
      input: "Enter",
      act: async (bubble: HTMLElement) => {
        bubble.focus();
        await userEvent.keyboard("{Enter}");
      },
    },
  ])(
    "should zoom to a cluster's extent on $input on its bubble, keeping the selection",
    async ({ act }) => {
      stubApi();
      const { screen, onViewportChange, onSelectSample } = await renderMap({
        points: pointsOf(CLUSTER_POINTS),
      });
      const bubble = screen.getByRole("button", { name: "12 samples" });
      await expect.element(bubble).toBeInTheDocument();
      const openingZoom = lastViewport(onViewportChange).zoom;

      await act(bubble.element() as HTMLElement);

      await vi.waitFor(
        () =>
          expect(lastViewport(onViewportChange).zoom).toBeGreaterThan(
            openingZoom,
          ),
        { timeout: 3000 },
      );
      expect(onSelectSample).not.toHaveBeenCalled();
    },
  );

  it("should center the map on a located sample", async () => {
    const { onViewportChange } = await renderMap({
      centered: {
        igsn: GRANITE.igsn,
        position: { type: "point", latitude: 49, longitude: 6 },
      },
    });

    await vi.waitFor(
      () => {
        const [west, south, east, north] = lastViewport(onViewportChange)
          .bbox.split(",")
          .map(Number);
        expect(Math.abs((west + east) / 2 - 6)).toBeLessThan(0.5);
        expect(Math.abs((south + north) / 2 - 49)).toBeLessThan(1);
      },
      { timeout: 3000 },
    );
  });

  it("should zoom into the cluster holding a located sample", async () => {
    stubApi();
    const { onViewportChange } = await renderMap({
      points: pointsOf(CLUSTER_POINTS),
      centered: {
        igsn: GRANITE.igsn,
        position: { type: "point", latitude: 46, longitude: 3 },
      },
    });
    const openingZoom = onViewportChange.mock.calls[0]?.[0].zoom;

    await vi.waitFor(
      () =>
        expect(lastViewport(onViewportChange).zoom).toBeGreaterThan(
          openingZoom,
        ),
      { timeout: 3000 },
    );
  });

  it("should keep samples at one spot in one cluster at max zoom, listing ten and counting the rest", async () => {
    const samples = Array.from({ length: 10 }, (_, index) =>
      publishedSample({
        igsn: `0123456789ABCDEFGHJKMNPQR${index}`,
        name: `Sample ${index}`,
      }),
    );
    const fetchSpy = stubApi({
      listed: { data: samples, meta: { total: 12 } },
    });
    const { screen } = await renderMap({
      points: pointsOf(
        Array.from({ length: 12 }, (_, index) => [index + 1, 3, 46]),
      ),
      fitTo: { west: 3, south: 46, east: 3.0001, north: 46.0001 },
      filters: { search: "basalt" },
    });

    await screen.getByRole("button", { name: "12 samples" }).click();

    await expect.element(screen.getByText("and 2 more")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /^Sample \d$/ }).elements(),
    ).toHaveLength(10);
    const url = fetchSpy.mock.lastCall?.[0] as URL;
    expect(url.searchParams.get("search")).toBe("basalt");
  });

  it.each([
    { size: "wide enough", east: 4, paths: 1 },
    { size: "too small", east: 2.05, paths: 0 },
  ])(
    "should draw a single sample's area only when it is $size to read",
    async ({ east, paths }) => {
      stubApi({
        details: [
          {
            ...BASALT,
            position: {
              type: "area",
              westLongitude: 2,
              southLatitude: 45,
              eastLongitude: east,
              northLatitude: 45.05 + (east - 2),
            },
          },
        ],
      });
      const { screen } = await renderMap({ points: pointsOf([BASALT_POINT]) });
      await expect
        .element(screen.getByRole("button", { name: "Basalt 42" }))
        .toBeInTheDocument();

      await vi.waitFor(() =>
        expect(
          document.querySelectorAll(".leaflet-overlay-pane path"),
        ).toHaveLength(paths),
      );
    },
  );
});
