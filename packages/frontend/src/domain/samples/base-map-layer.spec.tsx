import { MapContainer } from "react-leaflet";
import { render } from "vitest-browser-react";

import { BaseMapLayer } from "./base-map-layer.tsx";

describe("BaseMapLayer", () => {
  it("should credit OpenFreeMap, OpenMapTiles and OpenStreetMap", async () => {
    const screen = await render(
      <MapContainer center={[39.9, 116.4]} zoom={7} style={{ height: 400 }}>
        <BaseMapLayer />
      </MapContainer>,
    );

    for (const name of ["OpenFreeMap", "OpenMapTiles", "OpenStreetMap"]) {
      await expect
        .element(screen.getByRole("link", { name }))
        .toHaveAttribute("href", expect.stringContaining(name.toLowerCase()));
    }
  });
});
