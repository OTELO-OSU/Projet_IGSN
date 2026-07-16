import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import {
  type AgeFormValues,
  EMPTY_AGE_FORM_VALUES,
} from "#/samples/age-form.ts";
import { NumericAgeFormSection } from "#/samples/numeric-age-form-section.tsx";

function Harness({ values }: { values?: Partial<AgeFormValues> } = {}) {
  const form = useAppForm({
    defaultValues: { age: { ...EMPTY_AGE_FORM_VALUES, ...values } },
    onSubmit: () => {},
  });
  return (
    <form.AppForm>
      <NumericAgeFormSection />
    </form.AppForm>
  );
}

const toggle = () => page.getByRole("switch", { name: "Record a numeric age" });

describe("NumericAgeFormSection", () => {
  it("should be off by default, hiding the numeric fields", async () => {
    await render(<Harness />);

    await expect.element(toggle()).not.toBeChecked();
    await expect
      .element(page.getByRole("textbox", { name: "Numeric age" }))
      .not.toBeInTheDocument();
  });

  it("should show a single fixed-value input when enabled", async () => {
    await render(<Harness />);

    await toggle().click();

    await expect
      .element(page.getByRole("radio", { name: "Fixed value" }))
      .toBeChecked();
    await expect
      .element(page.getByRole("textbox", { name: "Numeric age" }))
      .toBeInTheDocument();
  });

  it("should show min and max inputs in range mode", async () => {
    await render(<Harness />);

    await toggle().click();
    await page.getByRole("radio", { name: "Range (min / max)" }).click();

    await expect
      .element(page.getByRole("textbox", { name: "Numeric age minimum" }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole("textbox", { name: "Numeric age maximum" }))
      .toBeInTheDocument();
  });

  it("should clear entered values when the block is disabled and re-enabled", async () => {
    await render(<Harness />);

    await toggle().click();
    await page.getByRole("textbox", { name: "Numeric age" }).fill("42");
    await toggle().click();
    await toggle().click();

    await expect
      .element(page.getByRole("textbox", { name: "Numeric age" }))
      .toHaveValue("");
  });

  it("should clear the fixed value when switching to range and back", async () => {
    await render(<Harness />);

    await toggle().click();
    await page.getByRole("textbox", { name: "Numeric age" }).fill("42");
    await page.getByRole("radio", { name: "Range (min / max)" }).click();
    await page.getByRole("radio", { name: "Fixed value" }).click();

    await expect
      .element(page.getByRole("textbox", { name: "Numeric age" }))
      .toHaveValue("");
  });

  it("should clear the unit when its value is emptied", async () => {
    await render(<Harness />);

    await toggle().click();
    await page.getByRole("textbox", { name: "Numeric age" }).fill("42");
    await page.getByRole("combobox", { name: "Units *" }).click();
    await page.getByRole("option", { name: "Ma", exact: true }).click();
    await page.getByRole("textbox", { name: "Numeric age" }).fill("");

    await expect
      .element(page.getByRole("combobox", { name: "Units" }))
      .toHaveTextContent("Select a unit");
  });

  it("should start enabled in fixed mode when a fixed value is prefilled", async () => {
    await render(<Harness values={{ numericAge: "5" }} />);

    await expect.element(toggle()).toBeChecked();
    await expect
      .element(page.getByRole("radio", { name: "Fixed value" }))
      .toBeChecked();
    await expect
      .element(page.getByRole("textbox", { name: "Numeric age" }))
      .toHaveValue("5");
  });

  it("should mark the other bound required once one range bound has a value", async () => {
    await render(<Harness />);

    await toggle().click();
    await page.getByRole("radio", { name: "Range (min / max)" }).click();
    await page.getByRole("textbox", { name: "Numeric age minimum" }).fill("10");

    await expect
      .element(page.getByRole("textbox", { name: "Numeric age maximum *" }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole("textbox", { name: "Numeric age minimum" }))
      .toBeInTheDocument();
  });

  it("should start enabled in range mode when a range value is prefilled", async () => {
    await render(<Harness values={{ numericAgeMin: "10" }} />);

    await expect.element(toggle()).toBeChecked();
    await expect
      .element(page.getByRole("radio", { name: "Range (min / max)" }))
      .toBeChecked();
    await expect
      .element(page.getByRole("textbox", { name: "Numeric age minimum" }))
      .toHaveValue("10");
  });
});
