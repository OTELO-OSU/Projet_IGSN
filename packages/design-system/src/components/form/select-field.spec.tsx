import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { useAppForm } from "./app-form.tsx";

const items = [
  { value: "core", label: "Core" },
  { value: "dredge", label: "Dredge" },
];

function Harness() {
  const form = useAppForm({
    defaultValues: { type: "" },
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
        name="type"
        validators={{
          onChange: ({ value }: { value: string }) =>
            value ? undefined : { message: "Type is required" },
        }}
      >
        {(field) => (
          <field.SelectField
            label="Type"
            items={items}
            placeholder="Select a type"
          />
        )}
      </form.AppField>
      <button type="submit">Publish</button>
    </form>
  );
}

describe("SelectField", () => {
  it("should show the placeholder until an item is selected", async () => {
    await render(<Harness />);

    await expect
      .element(page.getByRole("combobox", { name: "Type" }))
      .toHaveTextContent("Select a type");
  });

  it("should select an item by its label", async () => {
    await render(<Harness />);

    await page.getByRole("combobox", { name: "Type" }).click();
    await page.getByRole("option", { name: "Dredge" }).click();

    await expect
      .element(page.getByRole("combobox", { name: "Type" }))
      .toHaveTextContent("Dredge");
  });

  it("should announce an accessible error when invalid", async () => {
    await render(<Harness />);

    await page.getByRole("button", { name: "Publish" }).click();

    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent("Type is required");
    await expect
      .element(page.getByRole("combobox", { name: "Type" }))
      .toHaveAttribute("aria-invalid", "true");
  });
});
