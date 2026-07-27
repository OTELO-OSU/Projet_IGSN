import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { SearchTextInput } from "./search-text-input.tsx";

describe("SearchTextInput", () => {
  it("should render a labelled searchbox seeded from value", async () => {
    const screen = await render(
      <SearchTextInput
        value="granite"
        onChange={vi.fn()}
        label="Search samples"
        placeholder="Search a sample…"
      />,
    );

    await expect
      .element(screen.getByRole("searchbox", { name: "Search samples" }))
      .toHaveValue("granite");
  });

  it("should report each change and render no submit button", async () => {
    const onChange = vi.fn();
    const screen = await render(
      <SearchTextInput
        value=""
        onChange={onChange}
        label="Search samples"
        placeholder="Search a sample…"
      />,
    );

    await screen.getByRole("searchbox", { name: "Search samples" }).fill("gr");

    expect(onChange).toHaveBeenLastCalledWith("gr");
    expect(screen.getByRole("button").query()).toBeNull();
  });
});
