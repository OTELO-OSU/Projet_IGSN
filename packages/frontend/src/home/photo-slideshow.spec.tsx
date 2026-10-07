import { render } from "vitest-browser-react";

import { PhotoSlideshow } from "./photo-slideshow.tsx";

const CAROUSEL_LAYOUT = `
  [data-slot="carousel-content"] { overflow: hidden; width: 300px; }
  [data-slot="carousel-content"] > div { display: flex; }
  [data-slot="carousel-item"] { flex: 0 0 100%; min-width: 0; }
  img { display: block; width: 100%; height: 50px; }
`;

const FIRST = "A caver abseiling down a rock shaft";
const SECOND =
  "Opening a sediment core taken in the Landes de Gascogne, France";

async function renderSlideshow() {
  const screen = await render(
    <>
      <style>{CAROUSEL_LAYOUT}</style>
      <PhotoSlideshow />
      <button type="button">Outside</button>
    </>,
  );
  await screen.getByRole("button", { name: "Outside" }).hover();
  return screen;
}

function settle() {
  return new Promise((resolve) => setTimeout(resolve, 1000));
}

describe("PhotoSlideshow", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should advance to the next photo after the autoplay interval", async () => {
    const screen = await renderSlideshow();
    await expect.element(screen.getByAltText(FIRST)).toBeInViewport();

    vi.advanceTimersByTime(3000);

    await expect.element(screen.getByAltText(SECOND)).toBeInViewport();
    await expect.element(screen.getByAltText(FIRST)).not.toBeInViewport();
  });

  it("should hold autoplay while the pointer is over it", async () => {
    const screen = await renderSlideshow();
    await expect.element(screen.getByAltText(FIRST)).toBeInViewport();

    await screen.getByAltText(FIRST).hover();
    vi.advanceTimersByTime(3000);
    await settle();

    await expect
      .element(screen.getByAltText(FIRST))
      .toBeInViewport({ ratio: 1 });
  });

  it("should show the page of the clicked dot and mark that dot current", async () => {
    const screen = await renderSlideshow();
    const third = screen.getByRole("button", { name: "Page 3" });

    await third.click();

    await expect
      .element(
        screen.getByAltText(
          "Collecting stones from a landslide deposit near Amulet Peak, Alaska",
        ),
      )
      .toBeInViewport();
    await expect.element(third).toHaveAttribute("aria-current", "true");
  });
});
