import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import type { FieldSuggestionRule } from "./field-suggestion-context.tsx";

import { useAppForm } from "./app-form.tsx";
import { FieldDisabledProvider } from "./field-disabled-context.tsx";
import { FieldSuggestionProvider } from "./field-suggestion-context.tsx";

const items = [
  { value: "rock_powder", label: "Rock powder" },
  { value: "thin_section", label: "Thin section" },
];

const parentValues: FieldSuggestionRule = {
  label: "Parent values",
  forField: (name) =>
    name === "name"
      ? [{ source: "IGSN-1", value: "Basalt 42" }]
      : [{ source: "IGSN-1", value: "rock_powder" }],
};

function Harness({
  rule = parentValues,
  isFieldDisabled = () => false,
}: {
  rule?: FieldSuggestionRule;
  isFieldDisabled?: (name: string) => boolean;
}) {
  const form = useAppForm({ defaultValues: { name: "", nature: "" } });
  return (
    <FieldDisabledProvider value={isFieldDisabled}>
      <FieldSuggestionProvider value={rule}>
        <form>
          <form.AppField name="name">
            {(field) => <field.TextField label="Sample name" />}
          </form.AppField>
          <form.AppField name="nature">
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
        </form>
      </FieldSuggestionProvider>
    </FieldDisabledProvider>
  );
}

describe("FieldSuggestions", () => {
  it("should fill the field with the suggested value when its chip is clicked", async () => {
    await render(<Harness />);

    await page.getByRole("button", { name: "IGSN-1: Basalt 42" }).click();

    await expect
      .element(page.getByLabelText("Sample name"))
      .toHaveValue("Basalt 42");
  });

  it("should show the item label rather than the stored code on a combobox chip", async () => {
    await render(<Harness />);

    await expect
      .element(page.getByRole("button", { name: "IGSN-1: Rock powder" }))
      .toBeVisible();
  });

  it("should render one chip per source when two sources suggest the same value", async () => {
    await render(
      <Harness
        rule={{
          label: "Parent values",
          forField: (field) =>
            field === "name"
              ? [
                  { source: "IGSN-1", value: "Basalt 42" },
                  { source: "IGSN-2", value: "Basalt 42" },
                ]
              : [],
        }}
      />,
    );

    await expect
      .element(page.getByRole("button", { name: "IGSN-1: Basalt 42" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "IGSN-2: Basalt 42" }))
      .toBeVisible();
  });

  it("should render no chip when the field is disabled", async () => {
    await render(<Harness isFieldDisabled={(name) => name === "name"} />);

    await expect
      .element(page.getByRole("button", { name: "IGSN-1: Basalt 42" }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: "IGSN-1: Rock powder" }))
      .toBeVisible();
  });

  it("should render no chip when the rule suggests nothing", async () => {
    await render(
      <Harness rule={{ label: "Parent values", forField: () => [] }} />,
    );

    await expect
      .element(page.getByRole("list", { name: "Parent values" }))
      .not.toBeInTheDocument();
  });
});
