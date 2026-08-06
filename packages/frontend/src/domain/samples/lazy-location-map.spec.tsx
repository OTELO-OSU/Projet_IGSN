import type { Locator } from "vitest/browser";

import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { LazyLocationMap } from "./lazy-location-map.tsx";

// The generous timeout pays leaflet's real dynamic import.
const leafletContainer = (box: Locator) =>
  vi.waitFor(
    () => {
      const element = box.element().querySelector(".leaflet-container");
      expect(element).not.toBeNull();
      return element as Element;
    },
    { timeout: 15_000 },
  );

// ponytail: vitest.config.ts has no tailwind plugin, so h-full/h-100 never
// compile and the map container measures 414x0, too small for a real click to
// land: leaflet's event order is replayed by hand. Drop this for a real
// locator.click({ position }) once the plugin is there.
function fireMouse(
  target: Element,
  type: string,
  clientX: number,
  clientY: number,
  shiftKey = false,
) {
  target.dispatchEvent(
    new MouseEvent(type, { bubbles: true, clientX, clientY, shiftKey }),
  );
}

function clickAt(target: Element, clientX: number, clientY: number) {
  for (const type of ["mousedown", "mouseup", "click"]) {
    fireMouse(target, type, clientX, clientY);
  }
}

function shiftDragAt(
  target: Element,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
) {
  fireMouse(target, "mousedown", fromX, fromY, true);
  fireMouse(target, "mousemove", toX, toY, true);
  fireMouse(target, "mouseup", toX, toY, true);
}

async function enterDrawMode(onChange: (bbox: string) => void) {
  const screen = await render(<LazyLocationMap onChange={onChange} />);
  const box = screen.getByRole("group", { name: "Search area map" });
  const draw = screen.getByRole("button", { name: "Draw an area" });
  await draw.click();
  return { draw, container: await leafletContainer(box) };
}

describe("LazyLocationMap", () => {
  it("should mount the map client-side inside the named map box", async () => {
    const screen = await render(<LazyLocationMap onChange={vi.fn()} />);

    const box = screen.getByRole("group", { name: "Search area map" });
    await expect.element(box).toBeInTheDocument();
    await leafletContainer(box);
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

  it("should press the draw button and turn the map into a drawing surface", async () => {
    const screen = await render(<LazyLocationMap onChange={vi.fn()} />);
    const box = screen.getByRole("group", { name: "Search area map" });
    const container = await leafletContainer(box);
    expect(getComputedStyle(container).cursor).toBe("grab");

    const draw = screen.getByRole("button", { name: "Draw an area" });
    await draw.click();

    await expect.element(draw).toHaveAttribute("aria-pressed", "true");
    await vi.waitFor(() =>
      expect(getComputedStyle(container).cursor).toBe("crosshair"),
    );
  });

  it("should report the area drawn with two clicks and leave draw mode", async () => {
    const onChange = vi.fn();
    const { draw, container } = await enterDrawMode(onChange);

    clickAt(container, 20, 20);
    clickAt(container, 80, 60);

    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    await expect.element(draw).toHaveAttribute("aria-pressed", "false");
  });

  it("should drop a half-drawn area when the reader leaves draw mode", async () => {
    const onChange = vi.fn();
    const { draw, container } = await enterDrawMode(onChange);

    clickAt(container, 20, 20);
    await draw.click();

    expect(onChange).not.toHaveBeenCalled();
    await expect.element(draw).toHaveAttribute("aria-pressed", "false");
    await vi.waitFor(() =>
      expect(
        container.querySelectorAll(".leaflet-overlay-pane path").length,
      ).toBe(0),
    );
  });

  it("should stay in draw mode when both clicks land on the same point", async () => {
    const onChange = vi.fn();
    const { draw, container } = await enterDrawMode(onChange);

    clickAt(container, 20, 20);
    clickAt(container, 20, 20);

    expect(onChange).not.toHaveBeenCalled();
    await expect.element(draw).toHaveAttribute("aria-pressed", "true");
  });

  it("should leave draw mode after a shift+drag drawn while it is on", async () => {
    const onChange = vi.fn();
    const { draw, container } = await enterDrawMode(onChange);

    shiftDragAt(container, 20, 20, 80, 60);

    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    await expect.element(draw).toHaveAttribute("aria-pressed", "false");
  });

  it("should report a shift+drag drawn outside draw mode", async () => {
    const onChange = vi.fn();
    const screen = await render(<LazyLocationMap onChange={onChange} />);
    const box = screen.getByRole("group", { name: "Search area map" });
    const container = await leafletContainer(box);

    shiftDragAt(container, 20, 20, 80, 60);

    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    await expect
      .element(screen.getByRole("button", { name: "Draw an area" }))
      .toHaveAttribute("aria-pressed", "false");
  });

  it("should block resizing while draw mode is on", async () => {
    const screen = await render(
      <LazyLocationMap collapsible onChange={vi.fn()} />,
    );
    const draw = screen.getByRole("button", { name: "Draw an area" });

    await draw.click();

    await expect
      .element(screen.getByRole("button", { name: "Enlarge map" }))
      .toBeDisabled();

    await draw.click();

    await expect
      .element(screen.getByRole("button", { name: "Enlarge map" }))
      .toBeEnabled();
  });

  it("should offer shift+drag in the draw tooltip", async () => {
    const screen = await render(<LazyLocationMap onChange={vi.fn()} />);

    await screen.getByRole("button", { name: "Draw an area" }).hover();

    await expect
      .element(screen.getByRole("tooltip"))
      .toHaveTextContent("Or hold Shift and drag on the map.");
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
