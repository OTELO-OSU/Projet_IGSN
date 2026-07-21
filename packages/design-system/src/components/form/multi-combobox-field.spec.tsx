import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { useAppForm } from "./app-form.tsx";

// Twelve items so the "first 10 unselected" cap hides the last two until typed.
// Distinct, non-overlapping labels so substring name matching stays unambiguous.
const items = [
  { value: "fe", label: "Iron" },
  { value: "cu", label: "Copper" },
  { value: "ni", label: "Nickel" },
  { value: "zn", label: "Zinc" },
  { value: "pb", label: "Lead" },
  { value: "au", label: "Gold" },
  { value: "ag", label: "Silver" },
  { value: "sn", label: "Tin" },
  { value: "co", label: "Cobalt" },
  { value: "b", label: "Boron" },
  { value: "c", label: "Carbon" },
  { value: "rn", label: "Radon" },
];

function Harness({
  onSubmit = () => {},
}: {
  onSubmit?: (value: string[]) => void;
} = {}) {
  const form = useAppForm({
    defaultValues: { elements: [] as string[] },
    onSubmit: ({ value }) => onSubmit(value.elements),
  });
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.AppField name="elements">
        {(field) => (
          <field.MultiComboboxField
            label="Elements"
            items={items}
            placeholder="Add elements"
            searchPlaceholder="Search elements..."
            emptyText="No element found"
            removeLabel={(label) => `Remove ${label}`}
          />
        )}
      </form.AppField>
      <button type="submit">Save</button>
    </form>
  );
}

describe("MultiComboboxField", () => {
  it("should show only the first ten unselected options before a query", async () => {
    await render(<Harness />);

    await page.getByRole("combobox", { name: "Elements" }).click();

    await expect
      .element(page.getByRole("option", { name: "Boron" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("option", { name: "Carbon" }))
      .not.toBeInTheDocument();
  });

  it("should reveal an option past the cap once it is searched", async () => {
    await render(<Harness />);

    await page.getByRole("combobox", { name: "Elements" }).click();
    await page.getByPlaceholder("Search elements...").fill("Radon");

    await expect
      .element(page.getByRole("option", { name: "Radon" }))
      .toBeVisible();
  });

  it("should add a picked option as a chip and drop it from the list", async () => {
    await render(<Harness />);

    await page.getByRole("combobox", { name: "Elements" }).click();
    await page.getByRole("option", { name: "Copper" }).click();

    await expect
      .element(page.getByRole("button", { name: "Remove Copper" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("option", { name: "Copper" }))
      .not.toBeInTheDocument();
  });

  it("should remove a selected value via its chip", async () => {
    const onSubmit = vi.fn();
    await render(<Harness onSubmit={onSubmit} />);

    await page.getByRole("combobox", { name: "Elements" }).click();
    await page.getByRole("option", { name: "Copper" }).click();
    await page.getByRole("button", { name: "Remove Copper" }).click();
    await page.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledWith([]));
  });

  it("should submit every picked value", async () => {
    const onSubmit = vi.fn();
    await render(<Harness onSubmit={onSubmit} />);

    await page.getByRole("combobox", { name: "Elements" }).click();
    await page.getByRole("option", { name: "Iron" }).click();
    await page.getByRole("option", { name: "Nickel" }).click();
    await page.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledWith(["fe", "ni"]));
  });
});
