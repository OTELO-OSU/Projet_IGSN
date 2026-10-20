import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { FieldListRemoveButton } from "./field-list-item.tsx";

describe("FieldListRemoveButton", () => {
  it("should call onClick when pressed", async () => {
    const onClick = vi.fn();
    await render(<FieldListRemoveButton label="Remove 1" onClick={onClick} />);

    await page.getByRole("button", { name: "Remove 1" }).click();

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("should be disabled when the disabled prop is set", async () => {
    await render(
      <FieldListRemoveButton label="Remove 1" onClick={vi.fn()} disabled />,
    );

    await expect
      .element(page.getByRole("button", { name: "Remove 1" }))
      .toBeDisabled();
  });
});
