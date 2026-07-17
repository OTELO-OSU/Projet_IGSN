import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { useAppForm } from "./app-form.tsx";

const items = [
  { value: "temperature_controlled", label: "Temperature controlled" },
  { value: "light_controlled", label: "Light controlled" },
  {
    value: "no_specific_condition",
    label: "No specific condition",
    disabled: true,
  },
];

function Harness({
  onSubmit = () => {},
  maxOne = false,
}: {
  onSubmit?: (value: string[]) => void;
  maxOne?: boolean;
}) {
  const form = useAppForm({
    defaultValues: { conditions: [] as string[] },
    onSubmit: ({ value }) => onSubmit(value.conditions),
  });
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.AppField
        name="conditions"
        validators={{
          onChange: ({ value }: { value: string[] }) =>
            maxOne && value.length > 1
              ? { message: "Pick at most one" }
              : undefined,
        }}
      >
        {(field) => (
          <field.CheckboxGroupField label="Storage conditions" items={items} />
        )}
      </form.AppField>
      <button type="submit">Save</button>
    </form>
  );
}

describe("CheckboxGroupField", () => {
  it("should name the group and each checkbox accessibly", async () => {
    await render(<Harness />);

    await expect
      .element(page.getByRole("group", { name: "Storage conditions" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("checkbox", { name: "Light controlled" }))
      .toBeVisible();
  });

  it("should submit the checked values in the items order", async () => {
    const onSubmit = vi.fn();
    await render(<Harness onSubmit={onSubmit} />);

    // Checked in reverse order; the stored array follows the items order.
    await page.getByRole("checkbox", { name: "Light controlled" }).click();
    await page
      .getByRole("checkbox", { name: "Temperature controlled" })
      .click();
    await page.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith([
        "temperature_controlled",
        "light_controlled",
      ]),
    );
  });

  it("should uncheck a value on a second click", async () => {
    const onSubmit = vi.fn();
    await render(<Harness onSubmit={onSubmit} />);

    await page.getByRole("checkbox", { name: "Light controlled" }).click();
    await page.getByRole("checkbox", { name: "Light controlled" }).click();
    await page.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledWith([]));
  });

  it("should keep a disabled item unreachable", async () => {
    await render(<Harness />);

    await expect
      .element(page.getByRole("checkbox", { name: "No specific condition" }))
      .toBeDisabled();
  });

  it("should announce the field error", async () => {
    await render(<Harness maxOne />);

    await page.getByRole("checkbox", { name: "Light controlled" }).click();
    await page
      .getByRole("checkbox", { name: "Temperature controlled" })
      .click();

    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent("Pick at most one");
  });
});
