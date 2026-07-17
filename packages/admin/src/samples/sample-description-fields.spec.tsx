import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { SampleForm } from "./sample-form.tsx";

const noop = () => {};

const createAction = (onSubmit: (value: CreateSample) => void) =>
  ({ kind: "submit", label: "Create", onSubmit }) as const;

// Renders the form with the required fields prefilled and opens the
// Description tab, so each test only drives the description inputs.
async function renderDescriptionTab(
  onSubmit: (value: CreateSample) => void = noop,
  description?: CreateSample["description"],
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
        description,
      }}
      primaryAction={createAction(onSubmit)}
    />,
  );
  await screen.getByRole("tab", { name: "Physical description" }).click();
  return screen;
}

describe("SampleDescriptionFields", () => {
  it("should submit a single date as the degenerate range start === end", async () => {
    const onSubmit = vi.fn();
    const screen = await renderDescriptionTab(onSubmit);

    // Single date is the default mode: one date input, no range bounds.
    await expect
      .element(screen.getByLabelText("Start date"))
      .not.toBeInTheDocument();
    await screen.getByLabelText("Date *", { exact: true }).fill("2026-01-05");
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: {
            collectionDate: { start: "2026-01-05", end: "2026-01-05" },
          },
        }),
      ),
    );
  });

  it("should submit the start and end entered in range mode", async () => {
    const onSubmit = vi.fn();
    const screen = await renderDescriptionTab(onSubmit);

    await screen.getByRole("combobox", { name: "Collection date" }).click();
    await screen.getByRole("option", { name: "Date range" }).click();
    await screen.getByLabelText("Start date").fill("2026-01-05");
    await screen.getByLabelText("End date").fill("2026-02-10");
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: {
            collectionDate: { start: "2026-01-05", end: "2026-02-10" },
          },
        }),
      ),
    );
  });

  it("should open in single mode when editing a sample whose start === end", async () => {
    const screen = await renderDescriptionTab(noop, {
      collectionDate: { start: "2026-01-05", end: "2026-01-05" },
    });

    await expect
      .element(screen.getByLabelText("Date *", { exact: true }))
      .toHaveValue("2026-01-05");
    await expect
      .element(screen.getByLabelText("Start date"))
      .not.toBeInTheDocument();
  });

  it("should open in range mode when editing a sample whose start differs from end", async () => {
    const screen = await renderDescriptionTab(noop, {
      collectionDate: { start: "2026-01-05", end: "2026-02-10" },
    });

    await expect
      .element(screen.getByLabelText("Start date"))
      .toHaveValue("2026-01-05");
    await expect
      .element(screen.getByLabelText("End date"))
      .toHaveValue("2026-02-10");
  });

  it("should collapse a range to its start when switching back to single mode", async () => {
    const onSubmit = vi.fn();
    const screen = await renderDescriptionTab(onSubmit);

    await screen.getByRole("combobox", { name: "Collection date" }).click();
    await screen.getByRole("option", { name: "Date range" }).click();
    await screen.getByLabelText("Start date").fill("2026-01-05");
    await screen.getByLabelText("End date").fill("2026-02-10");
    await screen.getByRole("combobox", { name: "Collection date" }).click();
    await screen.getByRole("option", { name: "Single date" }).click();

    await expect
      .element(screen.getByLabelText("Date *", { exact: true }))
      .toHaveValue("2026-01-05");
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: {
            collectionDate: { start: "2026-01-05", end: "2026-01-05" },
          },
        }),
      ),
    );
  });

  it("should reject the same date on both range bounds, until single mode is used instead", async () => {
    const onSubmit = vi.fn();
    const screen = await renderDescriptionTab(onSubmit);

    await screen.getByRole("combobox", { name: "Collection date" }).click();
    await screen.getByRole("option", { name: "Date range" }).click();
    await screen.getByLabelText("Start date").fill("2026-01-05");
    await screen.getByLabelText("End date").fill("2026-01-05");

    // Both bounds carry the error: each field validates the pair.
    await expect
      .element(screen.getByRole("alert").first())
      .toHaveTextContent(/use the single date mode/i);
    await expect
      .element(screen.getByRole("alert").nth(1))
      .toHaveTextContent(/use the single date mode/i);
    await screen.getByRole("button", { name: "Create" }).click();
    expect(onSubmit).not.toHaveBeenCalled();

    // Following the advice clears the error and submits the degenerate range.
    await screen.getByRole("combobox", { name: "Collection date" }).click();
    await screen.getByRole("option", { name: "Single date" }).click();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: {
            collectionDate: { start: "2026-01-05", end: "2026-01-05" },
          },
        }),
      ),
    );
  });

  it("should reject a range whose start is after its end, on both fields", async () => {
    const onSubmit = vi.fn();
    const screen = await renderDescriptionTab(onSubmit);

    await screen.getByRole("combobox", { name: "Collection date" }).click();
    await screen.getByRole("option", { name: "Date range" }).click();
    await screen.getByLabelText("Start date").fill("2026-02-10");
    await screen.getByLabelText("End date").fill("2026-01-05");

    await expect
      .element(screen.getByRole("alert").first())
      .toHaveTextContent("The start date must be before the end date.");
    await expect
      .element(screen.getByRole("alert").nth(1))
      .toHaveTextContent("The start date must be before the end date.");
    await screen.getByRole("button", { name: "Create" }).click();
    expect(onSubmit).not.toHaveBeenCalled();

    // Fixing either bound clears the error on both and the range submits.
    await screen.getByLabelText("End date").fill("2026-03-01");
    await expect.element(screen.getByRole("alert")).not.toBeInTheDocument();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: {
            collectionDate: { start: "2026-02-10", end: "2026-03-01" },
          },
        }),
      ),
    );
  });

  it("should reject a collection date in the future", async () => {
    const onSubmit = vi.fn();
    const screen = await renderDescriptionTab(onSubmit);

    await screen.getByLabelText("Date *", { exact: true }).fill("2999-01-01");

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent("The collection date cannot be in the future.");
    await screen.getByRole("button", { name: "Create" }).click();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("should disable the unit until its value is set, then mark it required", async () => {
    const screen = await renderDescriptionTab();

    await expect
      .element(
        screen.getByRole("combobox", { name: "Volume unit", exact: true }),
      )
      .toBeDisabled();

    await screen.getByLabelText("Volume", { exact: true }).fill("250");

    await expect
      .element(
        screen.getByRole("combobox", { name: "Volume unit *", exact: true }),
      )
      .toBeEnabled();
  });

  it("should reject a non positive measurement value", async () => {
    const onSubmit = vi.fn();
    const screen = await renderDescriptionTab(onSubmit);

    await screen.getByLabelText("Mass", { exact: true }).fill("-3");

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent("Enter a number greater than zero.");
    await screen.getByRole("button", { name: "Create" }).click();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("should disable the orientation explanation until the sample is oriented", async () => {
    const screen = await renderDescriptionTab();

    await expect
      .element(screen.getByLabelText("Orientation explanation"))
      .toBeDisabled();

    await screen.getByRole("combobox", { name: "Oriented sample" }).click();
    await screen.getByRole("option", { name: "Yes" }).click();
    await expect
      .element(screen.getByLabelText("Orientation explanation"))
      .toBeEnabled();

    await screen.getByRole("combobox", { name: "Oriented sample" }).click();
    await screen.getByRole("option", { name: "No" }).click();
    await expect
      .element(screen.getByLabelText("Orientation explanation"))
      .toBeDisabled();
  });

  it("should block submit with an error on the unit when a value has no unit", async () => {
    const onSubmit = vi.fn();
    const screen = await renderDescriptionTab(onSubmit);

    await screen.getByLabelText("Mass", { exact: true }).fill("1.2");
    await screen.getByRole("button", { name: "Create" }).click();

    expect(onSubmit).not.toHaveBeenCalled();
    await expect
      .element(screen.getByText("Select a unit for the entered value."))
      .toBeVisible();

    // Selecting the unit clears the error and the measurement submits.
    await screen.getByRole("combobox", { name: "Mass unit" }).click();
    await screen.getByRole("option", { name: "kg", exact: true }).click();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: { mass: { value: 1.2, unit: "kg" } },
        }),
      ),
    );
  });

  it("should block submit with an error on the value when clearing it leaves its unit behind", async () => {
    const onSubmit = vi.fn();
    const screen = await renderDescriptionTab(onSubmit);

    await screen.getByLabelText("Length", { exact: true }).fill("10");
    await screen.getByRole("combobox", { name: "Length unit" }).click();
    await screen.getByRole("option", { name: "cm", exact: true }).click();
    await screen.getByLabelText("Length", { exact: true }).fill("");
    await screen.getByRole("button", { name: "Create" }).click();

    expect(onSubmit).not.toHaveBeenCalled();
    await expect
      .element(screen.getByText("Enter a value for the selected unit."))
      .toBeVisible();
  });

  it("should submit a full description", async () => {
    const onSubmit = vi.fn();
    const screen = await renderDescriptionTab(onSubmit);

    await screen.getByLabelText("Date *", { exact: true }).fill("2026-01-05");
    await screen.getByRole("combobox", { name: "Oriented sample" }).click();
    await screen.getByRole("option", { name: "Yes" }).click();
    await screen
      .getByLabelText("Orientation explanation")
      .fill("Marked north face");
    await screen.getByLabelText("Open description").fill("Fine-grained basalt");
    await screen.getByLabelText("Length", { exact: true }).fill("10");
    await screen.getByRole("combobox", { name: "Length unit" }).click();
    await screen.getByRole("option", { name: "cm", exact: true }).click();
    await screen.getByLabelText("Width", { exact: true }).fill("5");
    await screen.getByRole("combobox", { name: "Width unit" }).click();
    await screen.getByRole("option", { name: "cm", exact: true }).click();
    await screen.getByLabelText("Thickness", { exact: true }).fill("20");
    await screen.getByRole("combobox", { name: "Thickness unit" }).click();
    await screen.getByRole("option", { name: "mm", exact: true }).click();
    await screen.getByLabelText("Mass", { exact: true }).fill("1.2");
    await screen.getByRole("combobox", { name: "Mass unit" }).click();
    await screen.getByRole("option", { name: "kg", exact: true }).click();
    await screen.getByLabelText("Volume", { exact: true }).fill("250");
    await screen.getByRole("combobox", { name: "Volume unit" }).click();
    // Volume options carry the display symbol, not the stored code.
    await screen.getByRole("option", { name: "cm³", exact: true }).click();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: {
            collectionDate: { start: "2026-01-05", end: "2026-01-05" },
            oriented: true,
            orientationExplanation: "Marked north face",
            openDescription: "Fine-grained basalt",
            length: { value: 10, unit: "cm" },
            width: { value: 5, unit: "cm" },
            thickness: { value: 20, unit: "mm" },
            mass: { value: 1.2, unit: "kg" },
            volume: { value: 250, unit: "cm3" },
          },
        }),
      ),
    );
  });

  it("should submit no description when the section is left empty", async () => {
    const onSubmit = vi.fn();
    const screen = await renderDescriptionTab(onSubmit);

    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: null,
        material: null,
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: null,
        location: null,
      }),
    );
  });
});
