import L from "leaflet";
import { MapContainer, useMap } from "react-leaflet";
import { vi } from "vitest";
import { render } from "vitest-browser-react";

import {
  RectangleDrawer,
  SearchLocationMap,
  formatBbox,
} from "./search-location-map.tsx";

// Resolves with the Leaflet map once the container is ready, so a test can fire
// synthetic Leaflet mouse events (latlng supplied directly, no pixel math).
function CaptureMap({ onMap }: { onMap: (map: L.Map) => void }) {
  const map = useMap();
  onMap(map);
  return null;
}

describe("formatBbox", () => {
  it("should normalize two corners to west,south,east,north", () => {
    // Corners given north-east then south-west; output keeps west <= east.
    expect(formatBbox(L.latLng(50, 10), L.latLng(40, -10))).toBe(
      "-10,40,10,50",
    );
  });

  it("should round to six decimals", () => {
    expect(formatBbox(L.latLng(1.2345678, 2.3456789), L.latLng(3, 4))).toBe(
      "2.345679,1.234568,4,3",
    );
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
    // Releasing over a control (zoom +/-, attribution) or off the map never
    // fires the map's mouseup, which would leave the box tracking the cursor.
    // A document-level mouseup ends the drag wherever the release lands.
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
  it("should disable Search until a box is selected", async () => {
    const screen = await render(<SearchLocationMap onSearch={vi.fn()} />);

    await expect
      .element(screen.getByRole("button", { name: "Search" }))
      .toBeDisabled();
  });

  it("should show the OSM attribution", async () => {
    const screen = await render(<SearchLocationMap onSearch={vi.fn()} />);

    await expect
      .element(screen.getByRole("link", { name: /OpenStreetMap/ }))
      .toBeInTheDocument();
  });

  it("should stay usable in compact mode with a selected box", async () => {
    // Compact mode (banner shrunk) recenters on the box via fitBounds; assert
    // the wiring stays usable, not Leaflet's internal viewport.
    const screen = await render(
      <SearchLocationMap
        onSearch={vi.fn()}
        initialBbox="-10,40,10,50"
        compact
      />,
    );

    await expect
      .element(screen.getByRole("button", { name: "Search" }))
      .toBeEnabled();
  });

  it("should search the selected box on click", async () => {
    const onSearch = vi.fn();
    const screen = await render(
      <SearchLocationMap onSearch={onSearch} initialBbox="-10,40,10,50" />,
    );

    const button = screen.getByRole("button", { name: "Search" });
    await expect.element(button).toBeEnabled();
    await button.click();

    expect(onSearch).toHaveBeenCalledWith("-10,40,10,50");
  });

  it("should give the map region an accessible name", async () => {
    const screen = await render(<SearchLocationMap onSearch={vi.fn()} />);

    await expect
      .element(screen.getByRole("group", { name: "Search area map" }))
      .toBeInTheDocument();
  });

  it("should keep Search disabled for an antimeridian box (west > east)", async () => {
    const screen = await render(
      // west 10 > east -10 is out of v1 scope; the schema rejects it.
      <SearchLocationMap onSearch={vi.fn()} initialBbox="10,40,-10,50" />,
    );

    await expect
      .element(screen.getByRole("button", { name: "Search" }))
      .toBeDisabled();
  });
});
