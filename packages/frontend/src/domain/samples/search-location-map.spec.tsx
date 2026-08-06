import L from "leaflet";
import { MapContainer, useMap } from "react-leaflet";
import { vi } from "vitest";
import { render } from "vitest-browser-react";

import {
  FitSelection,
  InvalidateOnResize,
  RectangleDrawer,
  SearchLocationMap,
  formatBbox,
} from "./search-location-map.tsx";

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
    [L.latLng(40, 170), L.latLng(50, 190), "170,40,-170,50"],
    [L.latLng(40, 185), L.latLng(50, 220), "-175,40,-140,50"],
    [L.latLng(40, -100), L.latLng(50, 10), "-100,40,10,50"],
    [L.latLng(-95, -190), L.latLng(50, 10), "170,-90,10,50"],
  ])(
    "should wrap the longitudes of %o / %o and clamp the latitudes",
    (a, b, expected) => {
      expect(formatBbox(a, b)).toBe(expected);
    },
  );

  it.each([
    [L.latLng(40, -194), L.latLng(50, 194)],
    [L.latLng(40, -190), L.latLng(50, 170)],
    [L.latLng(40, -170), L.latLng(50, 197)],
  ])("should select the whole world when %o / %o spans it", (a, b) => {
    expect(formatBbox(a, b)).toBe("-180,40,180,50");
  });
});

describe("RectangleDrawer", () => {
  async function renderDrawer(bbox?: string, drawing = false) {
    const onSelect = vi.fn();
    let resolveMap: (map: L.Map) => void;
    const mapReady = new Promise<L.Map>((resolve) => {
      resolveMap = resolve;
    });
    function Harness({ drawing }: { drawing: boolean }) {
      return (
        <MapContainer center={[20, 0]} zoom={2} style={{ height: 400 }}>
          <CaptureMap onMap={(map) => resolveMap(map)} />
          <RectangleDrawer bbox={bbox} drawing={drawing} onSelect={onSelect} />
        </MapContainer>
      );
    }
    const screen = await render(<Harness drawing={drawing} />);
    return {
      onSelect,
      map: await mapReady,
      setDrawing: (next: boolean) =>
        screen.rerender(<Harness drawing={next} />),
    };
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

  it("should not draw on a click outside draw mode", async () => {
    const { onSelect, map } = await renderDrawer();

    map.fire("click", { latlng: L.latLng(40, -10) });
    map.fire("click", { latlng: L.latLng(50, 10) });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("should report a normalized bbox after two clicks in draw mode", async () => {
    const { onSelect, map } = await renderDrawer(undefined, true);

    map.fire("click", { latlng: L.latLng(40, -10) });
    map.fire("click", { latlng: L.latLng(50, 10) });

    expect(onSelect).toHaveBeenCalledExactlyOnceWith("-10,40,10,50");
  });

  it("should select nothing when both clicks land on the same point", async () => {
    const { onSelect, map } = await renderDrawer(undefined, true);

    map.fire("click", { latlng: L.latLng(40, -10) });
    map.fire("click", { latlng: L.latLng(40, -10) });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("should report nothing after a single click in draw mode", async () => {
    const { onSelect, map } = await renderDrawer(undefined, true);

    map.fire("mousedown", {
      latlng: L.latLng(40, -10),
      originalEvent: { shiftKey: false },
    });
    map.fire("mouseup", { latlng: L.latLng(40, -10) });
    map.fire("click", { latlng: L.latLng(40, -10) });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("should keep the map pannable between the two clicks", async () => {
    const { onSelect, map } = await renderDrawer(undefined, true);

    map.fire("click", { latlng: L.latLng(40, -10) });
    expect(map.dragging.enabled()).toBe(true);

    map.fire("mousedown", {
      latlng: L.latLng(45, 0),
      originalEvent: { shiftKey: false },
    });
    map.fire("mouseup", { latlng: L.latLng(48, 5) });
    map.fire("click", { latlng: L.latLng(50, 10) });

    expect(onSelect).toHaveBeenCalledExactlyOnceWith("-10,40,10,50");
  });

  it("should stretch the pending rectangle without recreating its layer", async () => {
    const { map } = await renderDrawer(undefined, true);

    map.fire("click", { latlng: L.latLng(40, -10) });
    await vi.waitFor(() => expect(rectanglePaths().length).toBe(1));
    const path = rectanglePaths()[0];
    const shape = path?.getAttribute("d");

    map.fire("mousemove", { latlng: L.latLng(50, 10) });

    await vi.waitFor(() =>
      expect(rectanglePaths()[0]?.getAttribute("d")).not.toBe(shape),
    );
    expect(rectanglePaths()[0]).toBe(path);
  });

  it("should drop the pending rectangle when draw mode ends", async () => {
    const { onSelect, map, setDrawing } = await renderDrawer(undefined, true);

    map.fire("click", { latlng: L.latLng(40, -10) });
    await vi.waitFor(() => expect(rectanglePaths().length).toBeGreaterThan(0));

    await setDrawing(false);

    expect(rectanglePaths().length).toBe(0);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("InvalidateOnResize", () => {
  it("should make the map read its new height after the size flips", async () => {
    let resolveMap: (map: L.Map) => void;
    const mapReady = new Promise<L.Map>((resolve) => {
      resolveMap = resolve;
    });
    function Harness({ compact }: { compact: boolean }) {
      return (
        <div style={{ height: compact ? 200 : 400 }}>
          <MapContainer center={[20, 0]} zoom={2} style={{ height: "100%" }}>
            <CaptureMap onMap={(map) => resolveMap(map)} />
            <InvalidateOnResize compact={compact} />
          </MapContainer>
        </div>
      );
    }

    const screen = await render(<Harness compact />);
    const map = await mapReady;
    expect(map.getSize().y).toBe(200);

    await screen.rerender(<Harness compact={false} />);

    await vi.waitFor(() => expect(map.getSize().y).toBe(400));
  });
});

describe("SearchLocationMap", () => {
  it("should render no standalone Search button (a shared button owns submit)", async () => {
    const screen = await render(
      <SearchLocationMap drawing={false} onChange={vi.fn()} />,
    );

    await vi.waitFor(() =>
      expect(document.querySelector(".leaflet-container")).not.toBeNull(),
    );
    expect(screen.getByRole("button", { name: "Search" }).query()).toBeNull();
  });

  it("should show the OSM attribution", async () => {
    const screen = await render(
      <SearchLocationMap drawing={false} onChange={vi.fn()} />,
    );

    await expect
      .element(screen.getByRole("link", { name: /OpenStreetMap/ }))
      .toBeInTheDocument();
  });

  it("should render the rectangle for a passed value (rehydration)", async () => {
    await render(
      <SearchLocationMap
        drawing={false}
        onChange={vi.fn()}
        value="-10,40,10,50"
      />,
    );

    await vi.waitFor(() => expect(rectanglePaths().length).toBeGreaterThan(0));
  });

  it("should render no rectangle for an absent value and not throw", async () => {
    await render(<SearchLocationMap drawing={false} onChange={vi.fn()} />);

    expect(rectanglePaths().length).toBe(0);
  });

  it.each([
    [true, "crosshair"],
    [false, "grab"],
  ])(
    "should show, in draw mode %s, a %s cursor over the map surface",
    async (drawing, cursor) => {
      await render(<SearchLocationMap drawing={drawing} onChange={vi.fn()} />);

      const container = await vi.waitFor(() => {
        const element = document.querySelector(".leaflet-container");
        expect(element).not.toBeNull();
        return element as Element;
      });

      expect(getComputedStyle(container).cursor).toBe(cursor);
    },
  );

  it("should draw one rectangle each side of the antimeridian", async () => {
    await render(
      <SearchLocationMap
        drawing={false}
        onChange={vi.fn()}
        value="170,0,-170,20"
      />,
    );

    await vi.waitFor(() => expect(rectanglePaths().length).toBe(2));
  });
});

describe("FitSelection", () => {
  async function renderFit(bbox: string) {
    let resolveMap: (map: L.Map) => void;
    const mapReady = new Promise<L.Map>((resolve) => {
      resolveMap = resolve;
    });
    await render(
      <MapContainer center={[20, 0]} zoom={2} style={{ height: 400 }}>
        <CaptureMap onMap={(map) => resolveMap(map)} />
        <FitSelection bbox={bbox} />
      </MapContainer>,
    );
    return mapReady;
  }

  it("should fit a plain selection", async () => {
    const map = await renderFit("-10,40,10,50");

    await vi.waitFor(() => {
      const bounds = map.getBounds();
      expect(bounds.getWest()).toBeLessThan(-10);
      expect(bounds.getEast()).toBeGreaterThan(10);
      expect(bounds.getWest()).toBeGreaterThan(-90);
    });
  });

  it("should fit the whole world for a selection crossing the antimeridian", async () => {
    const map = await renderFit("170,0,-170,20");

    await vi.waitFor(() => {
      const bounds = map.getBounds();
      expect(bounds.getWest()).toBeLessThanOrEqual(-180);
      expect(bounds.getEast()).toBeGreaterThanOrEqual(180);
    });
  });
});
