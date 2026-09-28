import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import type { FieldSuggestionRule } from "./field-suggestion-context.tsx";

import { TooltipProvider } from "../ui/tooltip.tsx";
import { useAppForm } from "./app-form.tsx";
import { FieldDisabledProvider } from "./field-disabled-context.tsx";
import { FieldSuggestionProvider } from "./field-suggestion-context.tsx";

const items = [
  { value: "rock_powder", label: "Rock powder" },
  { value: "thin_section", label: "Thin section" },
];

const parentRule = (
  forField: FieldSuggestionRule["forField"],
): FieldSuggestionRule => ({
  label: "Parent values",
  sourceShortLabel: (index) => `P${index + 1}`,
  booleanLabel: (value) => (value ? "yes" : "no"),
  forField,
});

const parentValues = parentRule((name) =>
  name === "name"
    ? [{ source: "IGSN-1", value: "Basalt 42" }]
    : [{ source: "IGSN-1", value: "rock_powder" }],
);

function Harness({
  rule = parentValues,
  isFieldDisabled = () => false,
}: {
  rule?: FieldSuggestionRule;
  isFieldDisabled?: (name: string) => boolean;
}) {
  const form = useAppForm({ defaultValues: { name: "", nature: "" } });
  return (
    <TooltipProvider>
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
    </TooltipProvider>
  );
}

function SwitchHarness({ rule }: { rule: FieldSuggestionRule }) {
  const form = useAppForm({ defaultValues: { oriented: false } });
  return (
    <TooltipProvider>
      <FieldSuggestionProvider value={rule}>
        <form.AppField name="oriented">
          {(field) => <field.SwitchField label="Oriented" />}
        </form.AppField>
      </FieldSuggestionProvider>
    </TooltipProvider>
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
        rule={parentRule((field) =>
          field === "name"
            ? [
                { source: "IGSN-1", value: "Basalt 42" },
                { source: "IGSN-2", value: "Basalt 42" },
              ]
            : [],
        )}
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

  it("should skip a source without a value and keep the next source's short label", async () => {
    await render(
      <Harness
        rule={parentRule((field) =>
          field === "name"
            ? [
                { source: "IGSN-1", value: undefined },
                { source: "IGSN-2", value: "Basalt 42" },
              ]
            : [],
        )}
      />,
    );

    const suggestions = page
      .getByRole("list", { name: "Parent values" })
      .getByRole("button");
    await expect.element(suggestions).toHaveAccessibleName("IGSN-2: Basalt 42");
    await expect.element(suggestions).toHaveTextContent("P2");
  });

  it("should show the parent name in a tooltip when a suggestion is hovered", async () => {
    await render(<Harness />);

    await page.getByRole("button", { name: "IGSN-1: Basalt 42" }).hover();

    await expect.element(page.getByRole("tooltip")).toHaveTextContent("IGSN-1");
  });

  it("should keep the suggestions once one filled the field", async () => {
    await render(<Harness />);

    await page.getByRole("button", { name: "IGSN-1: Basalt 42" }).click();

    await expect
      .element(page.getByLabelText("Sample name"))
      .toHaveValue("Basalt 42");
    await expect
      .element(page.getByRole("button", { name: "IGSN-1: Basalt 42" }))
      .toBeVisible();
  });

  it("should render no slot list for a field no source can fill", async () => {
    await render(<Harness rule={parentRule(() => [])} />);

    await expect
      .element(page.getByRole("list", { name: "Parent values" }))
      .not.toBeInTheDocument();
  });

  it("should label a switch slot through the rule and turn the switch on when it is clicked", async () => {
    await render(
      <SwitchHarness
        rule={parentRule(() => [
          { source: "IGSN-1", value: true },
          { source: "IGSN-2", value: false },
        ])}
      />,
    );

    await expect
      .element(page.getByRole("button", { name: "IGSN-2: no" }))
      .toBeVisible();
    await page.getByRole("button", { name: "IGSN-1: yes" }).click();

    await expect
      .element(page.getByRole("switch", { name: "Oriented" }))
      .toBeChecked();
  });
});
