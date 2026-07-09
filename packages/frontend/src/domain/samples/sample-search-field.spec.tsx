import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { SampleSearchField } from "./sample-search-field.tsx";

const labels = { label: "Search samples", placeholder: "Search by name…" };

describe("SampleSearchField", () => {
  it("should render the current search term", async () => {
    const screen = await render(
      <SampleSearchField
        {...labels}
        defaultValue="Basalt"
        onSearch={vi.fn()}
      />,
    );

    await expect
      .element(screen.getByRole("searchbox", { name: "Search samples" }))
      .toHaveValue("Basalt");
  });

  it("should call onSearch with the typed term after the debounce", async () => {
    const onSearch = vi.fn();
    const screen = await render(
      <SampleSearchField {...labels} defaultValue="" onSearch={onSearch} />,
    );

    await screen.getByRole("searchbox").fill("granite");

    await vi.waitFor(() => expect(onSearch).toHaveBeenCalledWith("granite"));
  });

  it("should not call onSearch before the user types", async () => {
    const onSearch = vi.fn();
    await render(
      <SampleSearchField
        {...labels}
        defaultValue="Basalt"
        onSearch={onSearch}
      />,
    );

    expect(onSearch).not.toHaveBeenCalled();
  });
});
