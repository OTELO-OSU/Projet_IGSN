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

  it("should call onSearch with the current term when the button is clicked", async () => {
    const onSearch = vi.fn();
    const screen = await render(
      <SearchField
        {...labels}
        defaultValue="Basalt"
        buttonLabel="Search"
        onSearch={onSearch}
      />,
    );

    await screen.getByRole("button", { name: "Search" }).click();

    expect(onSearch).toHaveBeenCalledWith("Basalt");
  });

  it("should not search while typing when searchOnType is false", async () => {
    const onSearch = vi.fn();
    const screen = await render(
      <SearchField
        {...labels}
        searchOnType={false}
        buttonLabel="Search"
        onSearch={onSearch}
      />,
    );

    await screen.getByRole("searchbox").fill("granite");
    // No debounced search: only submit reports the term.
    await vi.waitFor(() => expect(onSearch).not.toHaveBeenCalled());

    await screen.getByRole("button", { name: "Search" }).click();
    expect(onSearch).toHaveBeenCalledWith("granite");
  });

  it("should disable the button and not submit when the query is empty", async () => {
    const onSearch = vi.fn();
    const screen = await render(
      <SearchField {...labels} buttonLabel="Search" onSearch={onSearch} />,
    );

    const button = screen.getByRole("button", { name: "Search" });
    await expect.element(button).toBeDisabled();

    // Enter on the empty field must not fire a search either.
    await screen.getByRole("searchbox").fill("granite");
    await screen.getByRole("searchbox").fill("");
    await expect.element(button).toBeDisabled();
  });
});
