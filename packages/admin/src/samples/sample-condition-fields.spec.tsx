import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { SampleForm } from "./sample-form.tsx";

const noop = () => {};

const createAction = (onSubmit: (value: CreateSample) => void) =>
  ({ kind: "submit", label: "Create", onSubmit }) as const;

// Renders the form with the required fields prefilled and opens the
// Physical description tab, so each test only drives the condition inputs.
async function renderConditionTab(
  onSubmit: (value: CreateSample) => void = noop,
  condition?: CreateSample["condition"],
) {
  const screen = await render(
    <SampleForm
      onCancel={noop}
      defaultValues={{
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: null,
        material: null,
        collectionMethod: null,
        collectionMethodDescription: null,
        condition,
      }}
      primaryAction={createAction(onSubmit)}
    />,
  );
  await screen.getByRole("tab", { name: "Physical description" }).click();
  return screen;
}

describe("SampleConditionFields", () => {
  it("should submit a full condition", async () => {
    const onSubmit = vi.fn();
    const screen = await renderConditionTab(onSubmit);

    await screen.getByRole("combobox", { name: "Packaging" }).click();
    await screen.getByRole("option", { name: "Glass bottle" }).click();
    await screen
      .getByRole("checkbox", { name: "Temperature controlled" })
      .click();
    await screen.getByRole("checkbox", { name: "Light controlled" }).click();
    await screen
      .getByRole("combobox", { name: "Temperature", exact: true })
      .click();
    await screen.getByRole("option", { name: "Frozen", exact: true }).click();
    await screen.getByLabelText("Temperature value").fill("-18");
    await screen.getByRole("combobox", { name: "Temperature unit *" }).click();
    await screen.getByRole("option", { name: "°C" }).click();
    await screen.getByRole("combobox", { name: "Relative humidity" }).click();
    await screen
      .getByRole("option", { name: "Controlled (e.g. 40% ± 5%)" })
      .click();
    await screen.getByLabelText("Relative humidity in %").fill("40");
    await screen.getByRole("combobox", { name: "Light", exact: true }).click();
    await screen.getByRole("option", { name: "Total darkness" }).click();
    await screen
      .getByRole("combobox", { name: "Pressure", exact: true })
      .click();
    await screen
      .getByRole("option", { name: "Controlled gas pressure (N2, Ar, CO2...)" })
      .click();
    await screen.getByLabelText("Pressure value").fill("1.2");
    await screen.getByRole("combobox", { name: "Pressure unit *" }).click();
    await screen.getByRole("option", { name: "bar", exact: true }).click();
    await screen
      .getByLabelText("Specific sample conditions")
      .fill("Stored under argon");
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          condition: {
            packaging: "glass_bottle",
            storageConditions: ["temperature_controlled", "light_controlled"],
            temperature: {
              type: "frozen",
              measurement: { value: -18, unit: "celsius" },
            },
            humidity: { type: "controlled", percentage: 40 },
            light: "total_darkness",
            pressure: {
              type: "controlled_gas",
              measurement: { value: 1.2, unit: "bar" },
            },
            specificConditions: "Stored under argon",
          },
        }),
      ),
    );
  });

  it("should disable the reading inputs until their category is chosen", async () => {
    const screen = await renderConditionTab();

    await expect
      .element(screen.getByLabelText("Temperature value"))
      .toBeDisabled();
    await expect
      .element(screen.getByLabelText("Relative humidity in %"))
      .toBeDisabled();
    await expect
      .element(screen.getByLabelText("Pressure value"))
      .toBeDisabled();

    await screen
      .getByRole("combobox", { name: "Temperature", exact: true })
      .click();
    await screen.getByRole("option", { name: "Ambient" }).click();
    await expect
      .element(screen.getByLabelText("Temperature value"))
      .toBeEnabled();
  });

  it("should disable the unit until its value is set, then mark it required", async () => {
    const screen = await renderConditionTab();

    await expect
      .element(
        screen.getByRole("combobox", { name: "Pressure unit", exact: true }),
      )
      .toBeDisabled();

    await screen
      .getByRole("combobox", { name: "Pressure", exact: true })
      .click();
    await screen
      .getByRole("option", { name: "Vacuum (partial or total)" })
      .click();
    await screen.getByLabelText("Pressure value").fill("0.5");

    await expect
      .element(
        screen.getByRole("combobox", { name: "Pressure unit *", exact: true }),
      )
      .toBeEnabled();
  });

  it("should block submit with an error on the unit when a value has no unit", async () => {
    const onSubmit = vi.fn();
    const screen = await renderConditionTab(onSubmit);

    await screen
      .getByRole("combobox", { name: "Temperature", exact: true })
      .click();
    await screen.getByRole("option", { name: "Ambient" }).click();
    await screen.getByLabelText("Temperature value").fill("21");
    await screen.getByRole("button", { name: "Create" }).click();

    expect(onSubmit).not.toHaveBeenCalled();
    await expect
      .element(screen.getByText("Select a unit for the entered value."))
      .toBeVisible();

    await screen.getByRole("combobox", { name: "Temperature unit *" }).click();
    await screen.getByRole("option", { name: "°C" }).click();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          condition: {
            temperature: {
              type: "ambient",
              measurement: { value: 21, unit: "celsius" },
            },
          },
        }),
      ),
    );
  });

  it("should reject a humidity percentage outside the selected range", async () => {
    const onSubmit = vi.fn();
    const screen = await renderConditionTab(onSubmit);

    await screen.getByRole("combobox", { name: "Relative humidity" }).click();
    await screen.getByRole("option", { name: "<10% (dehydrated)" }).click();
    await screen.getByLabelText("Relative humidity in %").fill("11");

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent(
        "The percentage must match the selected humidity range.",
      );
    await screen.getByRole("button", { name: "Create" }).click();
    expect(onSubmit).not.toHaveBeenCalled();

    // A percentage inside the range clears the error and submits.
    await screen.getByLabelText("Relative humidity in %").fill("5");
    await expect.element(screen.getByRole("alert")).not.toBeInTheDocument();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          condition: { humidity: { type: "dehydrated", percentage: 5 } },
        }),
      ),
    );
  });

  it("should make no specific condition exclusive with the other storage conditions", async () => {
    const screen = await renderConditionTab();

    await screen
      .getByRole("checkbox", { name: "No specific condition" })
      .click();
    await expect
      .element(screen.getByRole("checkbox", { name: "Temperature controlled" }))
      .toBeDisabled();

    await screen
      .getByRole("checkbox", { name: "No specific condition" })
      .click();
    await screen
      .getByRole("checkbox", { name: "Temperature controlled" })
      .click();
    await expect
      .element(screen.getByRole("checkbox", { name: "No specific condition" }))
      .toBeDisabled();
  });

  it("should prefill the tab when editing a sample with a condition", async () => {
    const screen = await renderConditionTab(noop, {
      packaging: "paper_bag",
      storageConditions: ["moisture_controlled"],
      humidity: { type: "dry", percentage: 20 },
    });

    await expect
      .element(screen.getByRole("combobox", { name: "Packaging" }))
      .toHaveTextContent("Paper bag");
    await expect
      .element(screen.getByRole("checkbox", { name: "Moisture controlled" }))
      .toBeChecked();
    await expect
      .element(screen.getByLabelText("Relative humidity in %"))
      .toHaveValue(20);
  });
});
