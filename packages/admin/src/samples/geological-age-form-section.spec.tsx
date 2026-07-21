import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import {
  type AgeFormValues,
  EMPTY_AGE_FORM_VALUES,
} from "#/samples/age-form.ts";
import { GeologicalAgeFormSection } from "#/samples/geological-age-form-section.tsx";

function Harness({ values }: { values?: Partial<AgeFormValues> } = {}) {
  const form = useAppForm({
    defaultValues: { age: { ...EMPTY_AGE_FORM_VALUES, ...values } },
    onSubmit: () => {},
  });
  return (
    <form.AppForm>
      <GeologicalAgeFormSection />
    </form.AppForm>
  );
}

const toggle = () =>
  page.getByRole("switch", { name: "Record a stratigraphic age" });

describe("GeologicalAgeFormSection", () => {
  it("should be off by default, showing the unit but hiding the time scale", async () => {
    await render(<Harness />);

    await expect.element(toggle()).not.toBeChecked();
    await expect
      .element(
        page.getByRole("combobox", { name: "Geological age time scale" }),
      )
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("textbox", { name: "Geological unit" }))
      .toBeInTheDocument();
  });

  it("should show a single fixed select plus the unit when enabled", async () => {
    await render(<Harness />);

    await toggle().click();

    await expect
      .element(page.getByRole("radio", { name: "Fixed value" }))
      .toBeChecked();
    await expect
      .element(
        page.getByRole("combobox", { name: "Geological age time scale" }),
      )
      .toBeInTheDocument();
    await expect
      .element(page.getByRole("textbox", { name: "Geological unit" }))
      .toBeInTheDocument();
  });

  it("should show min and max selects in range mode", async () => {
    await render(<Harness />);

    await toggle().click();
    await page.getByRole("radio", { name: "Range (min / max)" }).click();

    await expect
      .element(
        page.getByRole("combobox", { name: "Geological age (min) time scale" }),
      )
      .toBeInTheDocument();
    await expect
      .element(
        page.getByRole("combobox", { name: "Geological age (max) time scale" }),
      )
      .toBeInTheDocument();
  });

  it("should keep the unit and its value when the time scale is toggled", async () => {
    await render(<Harness />);

    await page.getByRole("textbox", { name: "Geological unit" }).fill("Bed A");
    await toggle().click();
    await toggle().click();

    await expect
      .element(page.getByRole("textbox", { name: "Geological unit" }))
      .toHaveValue("Bed A");
  });

  it("should keep the time scale off when only a unit is prefilled", async () => {
    await render(<Harness values={{ geologicalUnit: "Bed A" }} />);

    await expect.element(toggle()).not.toBeChecked();
    await expect
      .element(page.getByRole("textbox", { name: "Geological unit" }))
      .toHaveValue("Bed A");
  });

  it("should clear the fixed age when switching to range and back", async () => {
    await render(
      <Harness
        values={{ geologicalAgeMin: "ics1", geologicalAgeMax: "ics1" }}
      />,
    );
    const combobox = page.getByRole("combobox", {
      name: "Geological age time scale",
    });

    await expect
      .element(combobox)
      .toHaveTextContent("Quaternary Holocene (ICS1)");

    await page.getByRole("radio", { name: "Range (min / max)" }).click();
    await page.getByRole("radio", { name: "Fixed value" }).click();

    await expect.element(combobox).toHaveTextContent("Select a geological age");
  });

  it("should mark the other bound required once one range bound has a value", async () => {
    await render(<Harness values={{ geologicalAgeMin: "ics1" }} />);

    await expect
      .element(
        page.getByRole("combobox", {
          name: "Geological age (max) time scale *",
        }),
      )
      .toBeInTheDocument();
    await expect
      .element(
        page.getByRole("combobox", { name: "Geological age (min) time scale" }),
      )
      .toBeInTheDocument();
  });

  it("should start enabled in range mode when a range value is prefilled", async () => {
    await render(<Harness values={{ geologicalAgeMin: "ics1" }} />);

    await expect.element(toggle()).toBeChecked();
    await expect
      .element(page.getByRole("radio", { name: "Range (min / max)" }))
      .toBeChecked();
    await expect
      .element(
        page.getByRole("combobox", { name: "Geological age (min) time scale" }),
      )
      .toHaveTextContent("Quaternary Holocene (ICS1)");
  });
});
