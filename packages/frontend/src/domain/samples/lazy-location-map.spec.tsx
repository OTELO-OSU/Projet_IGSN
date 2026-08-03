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

  it("should enlarge the collapsed map and shrink it back", async () => {
    const screen = await render(
      <LazyLocationMap collapsible onChange={vi.fn()} />,
    );

    await screen.getByRole("button", { name: "Enlarge map" }).click();

    await expect
      .element(screen.getByRole("button", { name: "Shrink map" }))
      .toBeInTheDocument();

    await screen.getByRole("button", { name: "Shrink map" }).click();

    await expect
      .element(screen.getByRole("button", { name: "Enlarge map" }))
      .toBeInTheDocument();
  });

  it("should name the size toggle in a tooltip on hover", async () => {
    const screen = await render(
      <LazyLocationMap collapsible onChange={vi.fn()} />,
    );

    await screen.getByRole("button", { name: "Enlarge map" }).hover();

    await expect
      .element(screen.getByRole("tooltip"))
      .toHaveTextContent("Enlarge map");
  });

  it("should render no size toggle when the map cannot collapse", async () => {
    const screen = await render(<LazyLocationMap onChange={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Enlarge map" }).query(),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Shrink map" }).query(),
    ).toBeNull();
  });
});
