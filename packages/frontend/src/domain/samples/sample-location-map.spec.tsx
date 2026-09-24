import type { Location } from "@projet-igsn/domain/sample/location/model";
import type L from "leaflet";

import { MapContainer, useMap } from "react-leaflet";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";

import { SampleLocationMap, SampleShape } from "./sample-location-map.tsx";

type Position = NonNullable<Location["position"]>;

function CaptureMap({ onMap }: { onMap: (map: L.Map) => void }) {
  const map = useMap();
  onMap(map);
  return null;
}

const shapePaths = () =>
  document.querySelectorAll(".leaflet-overlay-pane path");

async function renderShape(position: Position) {
  let resolveMap: (map: L.Map) => void;
  const mapReady = new Promise<L.Map>((resolve) => {
    resolveMap = resolve;
  });
  const screen = await render(
    <MapContainer center={[20, 0]} zoom={2} style={{ height: 400 }}>
      <CaptureMap onMap={(map) => resolveMap(map)} />
      <SampleShape position={position} />
    </MapContainer>,
  );
  return { screen, map: await mapReady };
}

describe("SampleShape", () => {
  it.each<[string, Position, string]>([
    [
      "a point",
      { type: "point", latitude: 45.77, longitude: 2.96 },
      "Latitude: 45.77, Longitude: 2.96",
    ],
    [
      "an area",
      {
        type: "area",
        westLongitude: -5.5,
        eastLongitude: 10.25,
        southLatitude: 41.5,
        northLatitude: 51.5,
      },
      "West longitude: -5.5, East longitude: 10.25, South latitude: 41.5, North latitude: 51.5",
    ],
    [
      "a line",
      {
        type: "line",
        startLongitude: 2.35,
        startLatitude: 48.85,
        endLongitude: 4.83,
        endLatitude: 45.76,
      },
      "Start longitude: 2.35, Start latitude: 48.85, End longitude: 4.83, End latitude: 45.76",
    ],
    [
      "a degenerate area, drawn as a point",
      {
        type: "area",
        westLongitude: 2.96,
        eastLongitude: 2.96,
        southLatitude: 45.77,
        northLatitude: 45.77,
      },
      "Latitude: 45.77, Longitude: 2.96",
    ],
  ])(
    "should show the coordinates of %s on hover",
    async (_shape, position, text) => {
      const { screen } = await renderShape(position);
      await vi.waitFor(() => expect(shapePaths().length).toBe(1));

      await userEvent.hover(page.elementLocator(shapePaths()[0] as Element));

      await expect.element(screen.getByRole("tooltip")).toHaveTextContent(text);
    },
  );

  it("should draw one rectangle each side of the antimeridian and show the world", async () => {
    const { map } = await renderShape({
      type: "area",
      westLongitude: 170,
      eastLongitude: -170,
      southLatitude: 0,
      northLatitude: 20,
    });

    await vi.waitFor(() => {
      expect(shapePaths().length).toBe(2);
      expect(map.getBounds().getWest()).toBeLessThanOrEqual(-180);
      expect(map.getBounds().getEast()).toBeGreaterThanOrEqual(180);
    });
  });

  it("should center a point at zoom 5", async () => {
    const { map } = await renderShape({
      type: "point",
      latitude: 45.77,
      longitude: 2.96,
    });

    await vi.waitFor(() => {
      expect(map.getZoom()).toBe(5);
      expect(map.getCenter().lat).toBeCloseTo(45.77);
      expect(map.getCenter().lng).toBeCloseTo(2.96);
    });
  });

  it.each<[string, Position]>([
    [
      "area",
      {
        type: "area",
        westLongitude: 2.95,
        eastLongitude: 2.96,
        southLatitude: 45.76,
        northLatitude: 45.77,
      },
    ],
    [
      "line",
      {
        type: "line",
        startLongitude: 2.95,
        startLatitude: 45.76,
        endLongitude: 2.96,
        endLatitude: 45.77,
      },
    ],
  ])(
    "should fit a small %s no closer than zoom 5",
    async (_shape, position) => {
      const { map } = await renderShape(position);

      await vi.waitFor(() => expect(map.getZoom()).toBe(5));
    },
  );
});

describe("SampleLocationMap", () => {
  it("should show the OSM attribution", async () => {
    const screen = await render(
      <SampleLocationMap
        position={{ type: "point", latitude: 45.77, longitude: 2.96 }}
      />,
    );

    await expect
      .element(screen.getByRole("link", { name: /OpenStreetMap/ }))
      .toBeInTheDocument();
  });
});
