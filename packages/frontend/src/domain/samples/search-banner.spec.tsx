import { render } from "vitest-browser-react";

import { SearchBanner } from "./search-banner.tsx";

describe("SearchBanner", () => {
  it("should render its title and children", async () => {
    const screen = await render(
      <SearchBanner>
        <div>compose widget</div>
      </SearchBanner>,
    );

    await expect
      .element(screen.getByRole("heading", { name: "Results of your search" }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("compose widget"))
      .toBeInTheDocument();
  });
});
