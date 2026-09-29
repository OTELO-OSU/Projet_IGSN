import type { SampleMapCluster } from "@projet-igsn/domain/sample/map/model";

import { vi } from "vitest";
import { userEvent } from "vitest/browser";

import { publishedSample } from "../../../test/published-sample.ts";
import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { ResultsMap } from "./results-map.tsx";

const FRANCE = { west: -5, south: 42, east: 8, north: 51 };

const single = (
  igsn: string,
  name: string,
  longitude: number,
): SampleMapCluster => ({
  longitude,
  latitude: 46,
  count: 1,
  extent: { west: longitude, south: 46, east: longitude, north: 46 },
  sample: {
    igsn,
    name,
    material: "rock_and_sediment.rock.igneous.volcanic.mafic.basalt",
  },
});

const BASALT = single("0123456789ABCDEFGHJKMNPQRS", "Basalt 42", 2);
const GRANITE = single("TVWXYZ0123456789ABCDEFGHJK", "Granite 7", -2);

const CLUSTER: SampleMapCluster = {
  longitude: 3,
  latitude: 46,
  count: 12,
  extent: { west: 2, south: 45, east: 4, north: 47 },
};

type MapProps = Parameters<typeof ResultsMap>[0];

async function renderMap(props: Partial<MapProps> = {}) {
  const onViewportChange = vi.fn();
  const onUserMove = vi.fn();
  const screen = await renderWithRouter(
    <>
      <style>{".leaflet-container { width: 400px; height: 400px; }"}</style>
      <ResultsMap
        clusters={[]}
        fitTo={FRANCE}
        filters={{}}
        onViewportChange={onViewportChange}
        onUserMove={onUserMove}
        {...props}
      />
    </>,
    ["/samples/$igsn"],
  );
  await vi.waitFor(() => expect(onViewportChange).toHaveBeenCalled());
  return { screen, onViewportChange, onUserMove };
}

const lastViewport = (spy: ReturnType<typeof vi.fn>) => spy.mock.lastCall?.[0];

describe("ResultsMap", () => {
  it("should report a user move, never the opening fit", async () => {
    const { onViewportChange, onUserMove } = await renderMap();
    expect(onUserMove).not.toHaveBeenCalled();

    document.querySelector<HTMLElement>(".leaflet-container")?.focus();
    await userEvent.keyboard("{ArrowRight}");

    await vi.waitFor(() => expect(onUserMove).toHaveBeenCalledTimes(1));
    expect(onUserMove).toHaveBeenCalledWith(
      lastViewport(onViewportChange).bbox,
    );
  });

  it("should open a sample's popup with its IGSN, name, deepest material and a link to its page", async () => {
    const { screen } = await renderMap({ clusters: [BASALT] });

    await screen.getByRole("button", { name: "Basalt 42" }).click();

    await expect
      .element(screen.getByText("0123456789ABCDEFGHJKMNPQRS"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Basalt", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("link", { name: "View sample" }))
      .toHaveAttribute("href", "/samples/0123456789ABCDEFGHJKMNPQRS");
  });

  it("should set the hovered sample's marker apart from the others", async () => {
    const { screen } = await renderMap({
      clusters: [BASALT, GRANITE],
      highlighted: {
        igsn: BASALT.sample?.igsn ?? "",
        position: { type: "point", longitude: BASALT.longitude, latitude: 46 },
      },
    });

    const basalt = screen.getByRole("button", { name: "Basalt 42" });
    const granite = screen.getByRole("button", { name: "Granite 7" });
    await expect.element(basalt).toBeInTheDocument();
    expect(basalt.element().className).not.toBe(granite.element().className);
  });

  it("should highlight the cluster holding a hovered sample", async () => {
    const { screen } = await renderMap({
      clusters: [CLUSTER],
      highlighted: {
        igsn: "0123456789ABCDEFGHJKMNPQRS",
        position: { type: "point", longitude: 3, latitude: 46 },
      },
    });

    await expect
      .element(screen.getByRole("button", { name: "12 samples" }))
      .toHaveClass("bg-amber-500");
  });

  it("should highlight no cluster for a hovered sample outside every cluster", async () => {
    const { screen } = await renderMap({
      clusters: [CLUSTER],
      highlighted: {
        igsn: "0123456789ABCDEFGHJKMNPQRS",
        position: { type: "point", longitude: 139.7, latitude: 35.7 },
      },
    });

    await expect
      .element(screen.getByRole("button", { name: "12 samples" }))
      .not.toHaveClass("bg-amber-500");
  });

  it("should zoom to a cluster's extent on click", async () => {
    const { screen, onViewportChange } = await renderMap({
      clusters: [CLUSTER],
    });
    const openingZoom = lastViewport(onViewportChange).zoom;

    await screen.getByRole("button", { name: "12 samples" }).click();

    await vi.waitFor(() =>
      expect(lastViewport(onViewportChange).zoom).toBeGreaterThan(openingZoom),
    );
  });

  it("should list ten of a cluster's samples and count the rest at max zoom", async () => {
    const samples = Array.from({ length: 10 }, (_, index) => ({
      ...publishedSample({
        igsn: `0123456789ABCDEFGHJKMNPQR${index}`,
        name: `Sample ${index}`,
      }),
      publishingError: null,
    }));
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ data: samples, meta: { total: 12 } })),
      );
    const { screen } = await renderMap({
      clusters: [
        { ...CLUSTER, extent: { west: 3, south: 46, east: 3, north: 46 } },
      ],
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
      const area: SampleMapCluster = {
        ...BASALT,
        sample: {
          ...BASALT.sample!,
          position: {
            type: "area",
            westLongitude: 2,
            southLatitude: 45,
            eastLongitude: east,
            northLatitude: 45.05 + (east - 2),
          },
        },
      };

      await renderMap({ clusters: [area] });

      await vi.waitFor(() =>
        expect(
          document.querySelectorAll(".leaflet-overlay-pane path"),
        ).toHaveLength(paths),
      );
    },
  );
});
