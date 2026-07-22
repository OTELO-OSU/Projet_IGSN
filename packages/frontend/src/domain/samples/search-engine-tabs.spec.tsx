import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { SearchEngineTabs } from "./search-engine-tabs.tsx";

describe("SearchEngineTabs", () => {
  it("should render a tab per engine with the active one selected", async () => {
    const screen = await render(
      <SearchEngineTabs engine="text" onEngineChange={vi.fn()} />,
    );

    await expect
      .element(screen.getByRole("tab", { name: "Text" }))
      .toHaveAttribute("aria-selected", "true");
    await expect
      .element(screen.getByRole("tab", { name: "Location" }))
      .toHaveAttribute("aria-selected", "false");
  });

  it("should report the picked engine", async () => {
    const onEngineChange = vi.fn();
    const screen = await render(
      <SearchEngineTabs engine="text" onEngineChange={onEngineChange} />,
    );

    await screen.getByRole("tab", { name: "Location" }).click();

    expect(onEngineChange).toHaveBeenCalledWith("location");
  });
});
