import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { vi } from "vitest";

import { render } from "../../test/render.tsx";
import { SampleForm } from "./sample-form.tsx";

const noop = () => {};

const createAction = (onSubmit: (value: CreateSample) => void) =>
  ({ kind: "submit", label: "Create", onSubmit }) as const;

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
            oriented: false,
            collectionDate: {
              precision: "day",
              start: "2026-01-05",
              end: "2026-01-05",
            },
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
            oriented: false,
            collectionDate: {
              precision: "day",
              start: "2026-01-05",
              end: "2026-02-10",
            },
          },
        }),
      ),
    );
  });

  it("should open in single mode when editing a sample whose start === end", async () => {
    const screen = await renderDescriptionTab(noop, {
      collectionDate: {
        precision: "day",
        start: "2026-01-05",
        end: "2026-01-05",
      },
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
      collectionDate: {
        precision: "day",
        start: "2026-01-05",
        end: "2026-02-10",
      },
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
            oriented: false,
            collectionDate: {
              precision: "day",
              start: "2026-01-05",
              end: "2026-01-05",
            },
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

    await expect
      .element(screen.getByRole("alert").first())
      .toHaveTextContent(/use the single date mode/i);
    await expect
      .element(screen.getByRole("alert").nth(1))
      .toHaveTextContent(/use the single date mode/i);
    await screen.getByRole("button", { name: "Create" }).click();
    expect(onSubmit).not.toHaveBeenCalled();

    await screen.getByRole("switch", { name: "Date range" }).click();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: {
            oriented: false,
            collectionDate: {
              precision: "day",
              start: "2026-01-05",
              end: "2026-01-05",
            },
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

    await screen.getByLabelText("End date").fill("2026-03-01");
    await expect.element(screen.getByRole("alert")).not.toBeInTheDocument();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: {
            oriented: false,
            collectionDate: {
              precision: "day",
              start: "2026-02-10",
              end: "2026-03-01",
            },
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

  it("should submit an hour-precision range with the picked time zone", async () => {
    const onSubmit = vi.fn();
    const screen = await renderDescriptionTab(onSubmit);

    await screen.getByRole("switch", { name: "Specify time" }).click();
    await screen.getByRole("switch", { name: "Date range" }).click();
    await screen.getByLabelText("Start date").fill("2026-01-05T08:30");
    await screen.getByLabelText("End date").fill("2026-01-06T17:00");
    await screen.getByRole("combobox", { name: "Time zone *" }).click();
    await screen.getByPlaceholder("Search a time zone...").fill("Europe/Paris");
    await screen.getByRole("option", { name: "Europe/Paris" }).click();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: {
            oriented: false,
            collectionDate: {
              precision: "hour",
              start: "2026-01-05T08:30",
              end: "2026-01-06T17:00",
              timeZone: "Europe/Paris",
            },
          },
        }),
      ),
    );
  });

  it("should open in time mode with the saved time zone", async () => {
    const screen = await renderDescriptionTab(noop, {
      collectionDate: {
        precision: "hour",
        start: "2026-01-05T08:30",
        end: "2026-01-06T17:00",
        timeZone: "Europe/Paris",
      },
    });

    await expect
      .element(screen.getByRole("switch", { name: "Specify time" }))
      .toBeChecked();
    await expect
      .element(screen.getByLabelText("Start date"))
      .toHaveValue("2026-01-05T08:30");
    await expect
      .element(screen.getByRole("combobox", { name: "Time zone *" }))
      .toHaveTextContent("Europe/Paris");
  });

  it("should keep the picked day when switching time on and back off", async () => {
    const onSubmit = vi.fn();
    const screen = await renderDescriptionTab(onSubmit);

    await screen.getByLabelText("Date *", { exact: true }).fill("2026-01-05");
    await screen.getByRole("switch", { name: "Specify time" }).click();

    await expect
      .element(screen.getByLabelText("Date *", { exact: true }))
      .toHaveValue("2026-01-05T00:00");

    await screen.getByRole("switch", { name: "Specify time" }).click();

    await expect
      .element(screen.getByLabelText("Date *", { exact: true }))
      .toHaveValue("2026-01-05");
    await expect
      .element(screen.getByLabelText("Time zone"))
      .not.toBeInTheDocument();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: {
            oriented: false,
            collectionDate: {
              precision: "day",
              start: "2026-01-05",
              end: "2026-01-05",
            },
          },
        }),
      ),
    );
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

    await expect
      .element(screen.getByLabelText("Volume unit"))
      .not.toBeInTheDocument();
    await expect.element(screen.getByRole("alert")).not.toBeInTheDocument();

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

    await screen.getByRole("switch", { name: "Oriented sample" }).click();
    await screen
      .getByLabelText("Orientation explanation")
      .fill("Marked north face");

    await screen.getByRole("switch", { name: "Oriented sample" }).click();
    await expect
      .element(screen.getByLabelText("Orientation explanation"))
      .not.toBeInTheDocument();

    await screen.getByRole("switch", { name: "Oriented sample" }).click();
    await expect
      .element(screen.getByLabelText("Orientation explanation"))
      .toHaveValue("Marked north face");
  });

  it("should clear an error left on a field whose condition stops holding", async () => {
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

    await screen.getByRole("switch", { name: "Oriented sample" }).click();
    await screen
      .getByLabelText("Orientation explanation")
      .fill("Marked north face");
    await screen.getByRole("switch", { name: "Oriented sample" }).click();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ description: { oriented: false } }),
      ),
    );

    await screen.getByRole("switch", { name: "Oriented sample" }).click();
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

    await screen.getByRole("combobox", { name: "Mass unit" }).click();
    await screen.getByRole("option", { name: "kg", exact: true }).click();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: { oriented: false, mass: { value: 1.2, unit: "kg" } },
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

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ description: { oriented: false } }),
      ),
    );
  });

  it("should submit a full description", async () => {
    const onSubmit = vi.fn();
    const screen = await renderDescriptionTab(onSubmit);

    await screen.getByLabelText("Date *", { exact: true }).fill("2026-01-05");
    await screen.getByRole("switch", { name: "Oriented sample" }).click();
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
    await screen.getByRole("option", { name: "cm³", exact: true }).click();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: {
            collectionDate: {
              precision: "day",
              start: "2026-01-05",
              end: "2026-01-05",
            },
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

  it("should submit only the default answers when the section is left empty", async () => {
    const onSubmit = vi.fn();
    const screen = await renderDescriptionTab(onSubmit);

    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        manualGroupIds: [],
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: null,
        material: null,
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: null,
        geologicalContextDescription: null,
        geomorphologicalEnvironment: null,
        location: null,
        existenceStatus: "exists",
        availabilityStatus: "available",
        description: { oriented: false },
        security: {
          radioactivity: false,
          asbestosRich: false,
          chemicalRisk: false,
        },
      }),
    );
  });
});
