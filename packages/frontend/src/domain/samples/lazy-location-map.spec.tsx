import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { LazyLocationMap } from "./lazy-location-map.tsx";

describe("LazyLocationMap", () => {
  it("should mount the map client-side inside the named map box", async () => {
    const screen = await render(<LazyLocationMap onChange={vi.fn()} />);

    // Generous timeouts: this test pays leaflet's real dynamic import.
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
