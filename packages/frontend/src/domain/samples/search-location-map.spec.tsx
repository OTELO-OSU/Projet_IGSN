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

  it("should report a normalized bbox after a drag", async () => {
    const { onSelect, map } = await renderDrawer();

    map.fire("mousedown", { latlng: L.latLng(40, -10) });
    map.fire("mouseup", { latlng: L.latLng(50, 10) });

    expect(onSelect).toHaveBeenCalledWith("-10,40,10,50");
  });

  it("should replace the previous selection on a second drag", async () => {
    const { onSelect, map } = await renderDrawer("-10,40,10,50");

    map.fire("mousedown", { latlng: L.latLng(0, 0) });
    map.fire("mouseup", { latlng: L.latLng(5, 5) });

    expect(onSelect).toHaveBeenLastCalledWith("0,0,5,5");
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

  it("should let a keyboard user set the box via numeric fields", async () => {
    const onSearch = vi.fn();
    const screen = await render(<SearchLocationMap onSearch={onSearch} />);

    await screen
      .getByRole("spinbutton", { name: "West longitude" })
      .fill("-10");
    await screen.getByRole("spinbutton", { name: "South latitude" }).fill("40");
    await screen.getByRole("spinbutton", { name: "East longitude" }).fill("10");
    await screen.getByRole("spinbutton", { name: "North latitude" }).fill("50");

    const button = screen.getByRole("button", { name: "Search" });
    await expect.element(button).toBeEnabled();
    await button.click();

    expect(onSearch).toHaveBeenCalledWith("-10,40,10,50");
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
