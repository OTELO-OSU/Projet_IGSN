import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { SearchBanner } from "./search-banner.tsx";

describe("SearchBanner", () => {
  it("should show the engine tabs when not shrunk", async () => {
    const screen = await render(
      <SearchBanner shrunk={false} engine="text" onEngineChange={vi.fn()}>
        <div>field</div>
      </SearchBanner>,
    );

    await expect
      .element(screen.getByRole("tab", { name: "Location" }))
      .toBeInTheDocument();
  });

  it("should keep the engine tabs when shrunk, so location can switch back to text", async () => {
    const screen = await render(
      <SearchBanner shrunk engine="location" onEngineChange={vi.fn()}>
        <div>map</div>
      </SearchBanner>,
    );

    await expect
      .element(screen.getByRole("tab", { name: "Text" }))
      .toBeInTheDocument();
    await expect.element(screen.getByText("map")).toBeInTheDocument();
  });
});
