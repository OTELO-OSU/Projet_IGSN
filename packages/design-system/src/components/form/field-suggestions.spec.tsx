import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import type { FieldSuggestionRule } from "./field-suggestion-context.tsx";

import { TooltipProvider } from "../ui/tooltip.tsx";
import { useAppForm } from "./app-form.tsx";
import { FieldDisabledProvider } from "./field-disabled-context.tsx";
import {
  FieldSuggestionCascadeProvider,
  FieldSuggestionProvider,
} from "./field-suggestion-context.tsx";

const items = [
  { value: "rock_powder", label: "Rock powder" },
  { value: "thin_section", label: "Thin section" },
];

const parentRule = (
  forField: FieldSuggestionRule["forField"],
): FieldSuggestionRule => ({
  label: "Parent values",
  noValueLabel: "no value",
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

function CascadeHarness({ rule }: { rule: FieldSuggestionRule }) {
  const form = useAppForm({ defaultValues: { gate: false, explanation: "" } });
  return (
    <TooltipProvider>
      <FieldSuggestionProvider value={rule}>
        <form.AppField name="gate">
          {(field) => <field.SwitchField label="Gate" />}
        </form.AppField>
        <FieldSuggestionCascadeProvider value={["gate"]}>
          <form.AppField name="explanation">
            {(field) => <field.TextField label="Explanation" />}
          </form.AppField>
        </FieldSuggestionCascadeProvider>
      </FieldSuggestionProvider>
    </TooltipProvider>
  );
}

const cascadeRule = parentRule((name) =>
  name === "gate"
    ? [{ source: "IGSN-1", value: true }]
    : [
        { source: "IGSN-1", value: "from one" },
        { source: "IGSN-2", value: "from two" },
      ],
);

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

  it("should keep a slot for a source without a value, disabled, in that source's position", async () => {
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

    const slots = page
      .getByRole("list", { name: "Parent values" })
      .getByRole("button");
    await expect.element(slots.nth(0)).toHaveAccessibleName("IGSN-1: no value");
    await expect.element(slots.nth(0)).toBeDisabled();
    await expect
      .element(slots.nth(1))
      .toHaveAccessibleName("IGSN-2: Basalt 42");
  });

  it("should show each slot's parent name as a label above its button", async () => {
    await render(
      <Harness
        rule={parentRule((field) =>
          field === "name"
            ? [
                { source: "IGSN-1", value: "Basalt 42" },
                { source: "IGSN-2", value: undefined },
              ]
            : [],
        )}
      />,
    );

    const slots = page.getByRole("list", { name: "Parent values" });
    await expect
      .element(slots.getByText("IGSN-1", { exact: true }))
      .toBeVisible();
    await expect
      .element(slots.getByText("IGSN-2", { exact: true }))
      .toBeVisible();
  });

  it("should show the full value in a tooltip when a valued chip is hovered", async () => {
    await render(
      <Harness
        rule={parentRule((field) =>
          field === "name"
            ? [
                {
                  source: "IGSN-1",
                  value: "A basalt sampled in the Massif Central",
                },
              ]
            : [],
        )}
      />,
    );

    await page
      .getByRole("button", {
        name: "IGSN-1: A basalt sampled in the Massif Central",
      })
      .hover();

    await expect
      .element(page.getByRole("tooltip"))
      .toHaveTextContent("A basalt sampled in the Massif Central");
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

  it("should set the gate fields of the clicked source before the field itself", async () => {
    await render(<CascadeHarness rule={cascadeRule} />);

    await page.getByRole("button", { name: "IGSN-1: from one" }).click();

    await expect
      .element(page.getByRole("switch", { name: "Gate" }))
      .toBeChecked();
    await expect
      .element(page.getByLabelText("Explanation"))
      .toHaveValue("from one");
  });

  it("should leave the gate fields alone when the clicked source has no value for them", async () => {
    await render(<CascadeHarness rule={cascadeRule} />);

    await page.getByRole("button", { name: "IGSN-2: from two" }).click();

    await expect
      .element(page.getByLabelText("Explanation"))
      .toHaveValue("from two");
    await expect
      .element(page.getByRole("switch", { name: "Gate" }))
      .not.toBeChecked();
  });
});
