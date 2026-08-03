import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { vi } from "vitest";

import { render } from "../../test/render.tsx";
import { SampleForm } from "./sample-form.tsx";

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({ user: { access_token: "tok" } }),
}));

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
      .element(screen.getByRole("group", { name: "Collection date *" }))
      .toBeVisible();
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

    await screen.getByRole("switch", { name: "Date range" }).click();
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

    await screen.getByRole("switch", { name: "Date range" }).click();
    await screen.getByLabelText("Start date").fill("2026-01-05");
    await screen.getByLabelText("End date").fill("2026-02-10");
    await screen.getByRole("switch", { name: "Date range" }).click();

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

    await screen.getByRole("switch", { name: "Date range" }).click();
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
    await screen.getByRole("switch", { name: "Date range" }).click();
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

    await screen.getByRole("switch", { name: "Date range" }).click();
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

  it("should show the unit only once its value is set, marked required", async () => {
    const screen = await renderDescriptionTab();

    await expect
      .element(
        screen.getByRole("combobox", { name: "Volume unit", exact: true }),
      )
      .not.toBeInTheDocument();

    await screen.getByLabelText("Volume", { exact: true }).fill("250");

    await expect
      .element(
        screen.getByRole("combobox", { name: "Volume unit *", exact: true }),
      )
      .toBeVisible();
  });

  it("should hide the unit again when its value is cleared, keeping the selection", async () => {
    const screen = await renderDescriptionTab();

    await screen.getByLabelText("Volume", { exact: true }).fill("250");
    await screen.getByRole("combobox", { name: "Volume unit *" }).click();
    await screen.getByRole("option", { name: "cm³" }).click();
    await screen.getByLabelText("Volume", { exact: true }).fill("");

    // By label, so the assertion holds whether or not the required marker is on.
    await expect
      .element(screen.getByLabelText("Volume unit"))
      .not.toBeInTheDocument();
    await expect.element(screen.getByRole("alert")).not.toBeInTheDocument();

    // ADR 0015 rule 1: the selection is still there when the value comes back.
    await screen.getByLabelText("Volume", { exact: true }).fill("250");
    await expect
      .element(screen.getByRole("combobox", { name: "Volume unit *" }))
      .toHaveTextContent("cm³");
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

  it("should show the orientation explanation only for an oriented sample", async () => {
    const screen = await renderDescriptionTab();

    await expect
      .element(screen.getByLabelText("Orientation explanation"))
      .not.toBeInTheDocument();

    await screen.getByRole("combobox", { name: "Oriented sample" }).click();
    await screen.getByRole("option", { name: "Yes" }).click();
    await screen
      .getByLabelText("Orientation explanation")
      .fill("Marked north face");

    await screen.getByRole("combobox", { name: "Oriented sample" }).click();
    await screen.getByRole("option", { name: "No" }).click();
    await expect
      .element(screen.getByLabelText("Orientation explanation"))
      .not.toBeInTheDocument();

    // ADR 0015 rule 1: the text is still there when the answer comes back.
    await screen.getByRole("combobox", { name: "Oriented sample" }).click();
    await screen.getByRole("option", { name: "Yes" }).click();
    await expect
      .element(screen.getByLabelText("Orientation explanation"))
      .toHaveValue("Marked north face");
  });

  it("should clear an error left on a field whose condition stops holding", async () => {
    // The form-level validator rebuilds the whole field-error map on every run,
    // so an error on a field that no longer renders clears itself and cannot
    // block the save from a control the user can no longer reach.
    const onSubmit = vi.fn();
    const screen = await renderDescriptionTab(onSubmit);

    await screen.getByLabelText("Volume", { exact: true }).fill("250");
    await screen.getByRole("button", { name: "Create" }).click();
    expect(onSubmit).not.toHaveBeenCalled();
    await expect
      .element(screen.getByText("Select a unit for the entered value."))
      .toBeVisible();

    await screen.getByLabelText("Volume", { exact: true }).fill("");

    await expect.element(screen.getByRole("alert")).not.toBeInTheDocument();
    await screen.getByRole("button", { name: "Create" }).click();
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it("should not bring back a hidden value the save dropped", async () => {
    const onSubmit = vi.fn();
    const screen = await renderDescriptionTab(onSubmit);

    await screen.getByRole("combobox", { name: "Oriented sample" }).click();
    await screen.getByRole("option", { name: "Yes" }).click();
    await screen
      .getByLabelText("Orientation explanation")
      .fill("Marked north face");
    await screen.getByRole("combobox", { name: "Oriented sample" }).click();
    await screen.getByRole("option", { name: "No" }).click();
    await screen.getByRole("button", { name: "Create" }).click();

    // ADR 0015 rule 2: the hidden explanation is not part of the save.
    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ description: { oriented: false } }),
      ),
    );

    // Rule 3: the form resets on what was saved, so the leftover is gone.
    await screen.getByRole("combobox", { name: "Oriented sample" }).click();
    await screen.getByRole("option", { name: "Yes" }).click();
    await expect
      .element(screen.getByLabelText("Orientation explanation"))
      .toHaveValue("");
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

  it("should submit no measurement at all when clearing a value leaves its unit behind", async () => {
    const onSubmit = vi.fn();
    const screen = await renderDescriptionTab(onSubmit);

    await screen.getByLabelText("Length", { exact: true }).fill("10");
    await screen.getByRole("combobox", { name: "Length unit" }).click();
    await screen.getByRole("option", { name: "cm", exact: true }).click();
    await screen.getByLabelText("Length", { exact: true }).fill("");
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.lastCall?.[0]).not.toHaveProperty("description");
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
        availability: "exists",
      }),
    );
  });
});
