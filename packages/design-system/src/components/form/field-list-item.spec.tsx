import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { FieldListItem, FieldListRemoveButton } from "./field-list-item.tsx";

describe("FieldListItem", () => {
  it("should name the group by its legend", async () => {
    await render(
      <FieldListItem legend="Relation 1" actions={null}>
        <p>Item content</p>
      </FieldListItem>,
    );

    await expect
      .element(page.getByRole("group", { name: "Relation 1" }))
      .toHaveTextContent("Item content");
  });

  it("should render its actions inside the block", async () => {
    await render(
      <FieldListItem
        legend="Relation 1"
        actions={<button type="button">Download</button>}
      >
        <p>Item content</p>
      </FieldListItem>,
    );

    await expect
      .element(
        page
          .getByRole("group", { name: "Relation 1" })
          .getByRole("button", { name: "Download" }),
      )
      .toBeVisible();
  });
});

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
