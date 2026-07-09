import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { SearchField } from "./search-field.tsx";

const labels = { label: "Search samples", placeholder: "Search by name…" };

describe("SearchField", () => {
  it("should render the current search term", async () => {
    const screen = await render(
      <SearchField {...labels} defaultValue="Basalt" onSearch={vi.fn()} />,
    );

    await expect
      .element(screen.getByRole("searchbox", { name: "Search samples" }))
      .toHaveValue("Basalt");
  });

  it("should call onSearch with the typed term after the debounce", async () => {
    const onSearch = vi.fn();
    const screen = await render(
      <SearchField {...labels} onSearch={onSearch} />,
    );

    await screen.getByRole("searchbox").fill("granite");

    // Debounced: not fired synchronously on input.
    expect(onSearch).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(onSearch).toHaveBeenCalledWith("granite"));
  });

  it("should not call onSearch before the user types", async () => {
    const onSearch = vi.fn();
    await render(
      <SearchField {...labels} defaultValue="Basalt" onSearch={onSearch} />,
    );

    expect(onSearch).not.toHaveBeenCalled();
  });
});
