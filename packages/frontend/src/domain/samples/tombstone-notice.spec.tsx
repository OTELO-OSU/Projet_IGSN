import { TombstoneNotice } from "#/domain/samples/tombstone-notice.tsx";

import { renderWithRouter } from "../../../test/render-with-router.tsx";

describe("TombstoneNotice", () => {
  it("should tell the visitor the sample was removed, without naming it", async () => {
    const screen = await renderWithRouter(<TombstoneNotice />);

    await expect
      .element(
        screen.getByRole("heading", {
          level: 1,
          name: "This sample has been removed",
        }),
      )
      .toBeInTheDocument();
    await expect
      .element(
        screen.getByText(
          "The sample this identifier pointed to has been removed from the registry.",
        ),
      )
      .toBeInTheDocument();
  });

  it("should offer a way back to the public search", async () => {
    const screen = await renderWithRouter(<TombstoneNotice />);

    await expect
      .element(screen.getByRole("link", { name: "Search a sample" }))
      .toHaveAttribute("href", "/");
  });
});
