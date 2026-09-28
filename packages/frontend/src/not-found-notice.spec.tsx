import { NotFoundNotice } from "#/not-found-notice.tsx";

import { renderWithRouter } from "../test/render-with-router.tsx";

describe("NotFoundNotice", () => {
  it("should name the missing page and offer a way back to the public search", async () => {
    const screen = await renderWithRouter(<NotFoundNotice />);

    await expect
      .element(
        screen.getByRole("heading", { level: 1, name: "Page not found" }),
      )
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("link", { name: "Search a sample" }))
      .toHaveAttribute("href", "/");
  });
});
