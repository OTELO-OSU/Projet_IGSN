import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { LazyLocationMap } from "./lazy-location-map.tsx";

describe("LazyLocationMap", () => {
  it("should mount the map client-side inside the named map box", async () => {
    // The wrapper renders nothing until mounted (leaflet touches `window`), so
    // this covers the whole client-only path: mount gate, then lazy import.
    const screen = await render(<LazyLocationMap onSearch={vi.fn()} />);

    // Generous timeouts: this is the one test that pays the real dynamic import
    // of leaflet, which is slow when the whole suite runs in parallel.
    const box = screen.getByRole("group", { name: "Search area map" });
    await expect.element(box, { timeout: 15_000 }).toBeInTheDocument();
    await vi.waitFor(
      () =>
        expect(
          box.element().querySelector(".leaflet-container"),
        ).not.toBeNull(),
      { timeout: 15_000 },
    );
  });
});
