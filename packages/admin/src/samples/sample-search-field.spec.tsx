import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { SampleSearchField } from "./sample-search-field.tsx";

const noop = () => {};

describe("SampleSearchField", () => {
  it("should render an accessible search field", async () => {
    const screen = await render(<SampleSearchField onSearch={noop} />);

    await expect
      .element(screen.getByRole("searchbox", { name: /search samples/i }))
      .toBeVisible();
  });

  it("should prefill the field from defaultValue", async () => {
    const screen = await render(
      <SampleSearchField defaultValue="basalt" onSearch={noop} />,
    );

    await expect
      .element(screen.getByRole("searchbox", { name: /search samples/i }))
      .toHaveValue("basalt");
  });

  it("should debounce input before calling onSearch with the typed value", async () => {
    const onSearch = vi.fn();
    const screen = await render(<SampleSearchField onSearch={onSearch} />);

    await screen
      .getByRole("searchbox", { name: /search samples/i })
      .fill("granite");

    // Debounced: not fired synchronously on input.
    expect(onSearch).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(onSearch).toHaveBeenCalledWith("granite"));
  });
});
