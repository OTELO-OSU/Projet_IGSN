import L from "leaflet";
import { MapContainer, useMap } from "react-leaflet";
import { vi } from "vitest";
import { render } from "vitest-browser-react";

import {
  RectangleDrawer,
  SearchLocationMap,
  formatBbox,
} from "./search-location-map.tsx";

// Hands the map out so a test can fire Leaflet events by latlng, no pixel math.
function CaptureMap({ onMap }: { onMap: (map: L.Map) => void }) {
  const map = useMap();
  onMap(map);
  return null;
}

// Leaflet draws a Rectangle as an SVG path in the overlay pane.
const rectanglePaths = () =>
  document.querySelectorAll(".leaflet-overlay-pane path");

describe("formatBbox", () => {
  it("should normalize two corners to west,south,east,north", () => {
    expect(formatBbox(L.latLng(50, 10), L.latLng(40, -10))).toBe(
      "-10,40,10,50",
    );
  });

  it("should round to six decimals", () => {
    expect(formatBbox(L.latLng(1.2345678, 2.3456789), L.latLng(3, 4))).toBe(
      "2.345679,1.234568,4,3",
    );
  });

  it.each([
    // A release off the container: Leaflet extrapolates past the world.
    [L.latLng(40, 185), L.latLng(50, 220), "180,40,180,50"],
    [L.latLng(-95, -190), L.latLng(50, 10), "-180,-90,10,50"],
  ])("should clamp %o / %o to the world", (a, b, expected) => {
    expect(formatBbox(a, b)).toBe(expected);
  });
});

describe("RectangleDrawer", () => {
  async function renderDrawer(bbox?: string) {
    const onSelect = vi.fn();
    let resolveMap: (map: L.Map) => void;
    const mapReady = new Promise<L.Map>((resolve) => {
      resolveMap = resolve;
    });
    await render(
      <MapContainer center={[20, 0]} zoom={2} style={{ height: 400 }}>
        <CaptureMap onMap={(map) => resolveMap(map)} />
        <RectangleDrawer bbox={bbox} onSelect={onSelect} />
      </MapContainer>,
    );
    return { onSelect, map: await mapReady };
  }

  it("should report a normalized bbox after a shift+drag", async () => {
    const { onSelect, map } = await renderDrawer();

    map.fire("mousedown", {
      latlng: L.latLng(40, -10),
      originalEvent: { shiftKey: true },
    });
    map.fire("mouseup", { latlng: L.latLng(50, 10) });

    expect(onSelect).toHaveBeenCalledWith("-10,40,10,50");
  });

  it("should replace the previous selection on a second shift+drag", async () => {
    const { onSelect, map } = await renderDrawer("-10,40,10,50");

    map.fire("mousedown", {
      latlng: L.latLng(0, 0),
      originalEvent: { shiftKey: true },
    });
    map.fire("mouseup", { latlng: L.latLng(5, 5) });

    expect(onSelect).toHaveBeenLastCalledWith("0,0,5,5");
  });

  it("should end the drag when the button is released off the map surface", async () => {
    const { onSelect, map } = await renderDrawer();

    map.fire("mousedown", {
      latlng: L.latLng(40, -10),
      originalEvent: { shiftKey: true },
    });
    expect(map.dragging.enabled()).toBe(false);

    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(map.dragging.enabled()).toBe(true);
  });

  it("should ignore a shift+click with no drag", async () => {
    // A zero-area box passes the schema and would match nothing.
    const { onSelect, map } = await renderDrawer("-10,40,10,50");

    map.fire("mousedown", {
      latlng: L.latLng(40, -10),
      originalEvent: { shiftKey: true },
    });
    map.fire("mouseup", { latlng: L.latLng(40, -10) });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("should not draw on a plain drag (no shift)", async () => {
    const { onSelect, map } = await renderDrawer();

    map.fire("mousedown", {
      latlng: L.latLng(40, -10),
      originalEvent: { shiftKey: false },
    });
    map.fire("mouseup", { latlng: L.latLng(50, 10) });

    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("SearchLocationMap", () => {
  it("should render no standalone Search button (a shared button owns submit)", async () => {
    const screen = await render(<SearchLocationMap onChange={vi.fn()} />);

    await vi.waitFor(() =>
      expect(document.querySelector(".leaflet-container")).not.toBeNull(),
    );
    expect(screen.getByRole("button", { name: "Search" }).query()).toBeNull();
  });

  it("should show the OSM attribution", async () => {
    const screen = await render(<SearchLocationMap onChange={vi.fn()} />);

    await expect
      .element(screen.getByRole("link", { name: /OpenStreetMap/ }))
      .toBeInTheDocument();
  });

  it("should render the rectangle for a passed value (rehydration)", async () => {
    await render(<SearchLocationMap onChange={vi.fn()} value="-10,40,10,50" />);

    await vi.waitFor(() => expect(rectanglePaths().length).toBeGreaterThan(0));
  });

  it("should render no rectangle for an absent value and not throw", async () => {
    await render(<SearchLocationMap onChange={vi.fn()} />);

    expect(rectanglePaths().length).toBe(0);
  });
});
