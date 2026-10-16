import { render } from "vitest-browser-react";

import { FacetsDialog } from "./facets-dialog.tsx";

describe("FacetsDialog", () => {
  it("should open the filters from the pinned button and close them from Show results", async () => {
    const screen = await render(
      <FacetsDialog values={{}}>
        <p>Nature facet</p>
      </FacetsDialog>,
    );

    await screen.getByRole("button", { name: "Filters" }).click();

    const dialog = screen.getByRole("dialog", { name: "Filters" });
    await expect.element(dialog.getByText("Nature facet")).toBeVisible();

    await dialog.getByRole("button", { name: "Show results" }).click();

    await expect.element(dialog).not.toBeInTheDocument();
  });

  it("should count the active filters on the button", async () => {
    const screen = await render(
      <FacetsDialog
        values={{ nature: "hand_sample", ageMin: 1, ageUnit: "ka" }}
      >
        <p>Nature facet</p>
      </FacetsDialog>,
    );

    await expect
      .element(screen.getByRole("button", { name: "Filters (2)" }))
      .toBeVisible();
  });
});
