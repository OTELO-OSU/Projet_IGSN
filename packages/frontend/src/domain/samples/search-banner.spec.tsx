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

  it("should hide the engine tabs once a location search is active", async () => {
    const screen = await render(
      <SearchBanner shrunk engine="location" onEngineChange={vi.fn()}>
        <div>map</div>
      </SearchBanner>,
    );

    expect(screen.getByRole("tab", { name: "Location" }).query()).toBeNull();
    await expect.element(screen.getByText("map")).toBeInTheDocument();
  });
});
