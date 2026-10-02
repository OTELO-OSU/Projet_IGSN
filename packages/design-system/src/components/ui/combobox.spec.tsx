import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { Combobox } from "./combobox.tsx";

function Harness({ value }: { value: string }) {
  return (
    <Combobox
      items={[{ value: "basalt", label: "Basalt" }]}
      value={value}
      onChange={() => {}}
      placeholder="Select a value"
      searchPlaceholder="Search..."
      emptyText="No value found"
    />
  );
}

describe("Combobox", () => {
  it("should render the placeholder muted, so an empty selector stands apart from a filled one", async () => {
    await render(<Harness value="" />);

    await expect
      .element(page.getByText("Select a value"))
      .toHaveClass("text-muted-foreground");
  });

  it("should render a selected value unmuted", async () => {
    await render(<Harness value="basalt" />);

    await expect
      .element(page.getByText("Basalt"))
      .not.toHaveClass("text-muted-foreground");
  });
});
