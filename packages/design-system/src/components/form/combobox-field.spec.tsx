import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { useAppForm } from "./app-form.tsx";

const items = [
  { value: "rock_powder", label: "Rock powder" },
  { value: "thin_section", label: "Thin section" },
];

function Harness() {
  const form = useAppForm({
    defaultValues: { nature: "" },
    onSubmit: () => {},
  });
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.AppField
        name="nature"
        validators={{
          onChange: ({ value }: { value: string }) =>
            value ? undefined : { message: "Nature is required" },
        }}
      >
        {(field) => (
          <field.ComboboxField
            label="Nature"
            items={items}
            placeholder="Select a nature"
            searchPlaceholder="Search nature..."
            emptyText="No nature found"
          />
        )}
      </form.AppField>
      <button type="submit">Publish</button>
    </form>
  );
}

describe("ComboboxField", () => {
  it("should show the placeholder until an item is selected", async () => {
    await render(<Harness />);

    await expect
      .element(page.getByRole("combobox", { name: "Nature" }))
      .toHaveTextContent("Select a nature");
  });

  it("should select an item by its label", async () => {
    await render(<Harness />);

    await page.getByRole("combobox", { name: "Nature" }).click();
    await page.getByText("Thin section").click();

    await expect
      .element(page.getByRole("combobox", { name: "Nature" }))
      .toHaveTextContent("Thin section");
  });

  it("should clear the selection when the selected item is picked again", async () => {
    await render(<Harness />);
    const combobox = page.getByRole("combobox", { name: "Nature" });

    await combobox.click();
    await page.getByText("Thin section").click();
    await expect.element(combobox).toHaveTextContent("Thin section");

    await combobox.click();
    await page.getByRole("option", { name: "Thin section" }).click();

    await expect.element(combobox).toHaveTextContent("Select a nature");
  });

  it("should announce an accessible error when invalid", async () => {
    await render(<Harness />);

    await page.getByRole("button", { name: "Publish" }).click();

    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent("Nature is required");
    await expect
      .element(page.getByRole("combobox", { name: "Nature" }))
      .toHaveAttribute("aria-invalid", "true");
  });
});
