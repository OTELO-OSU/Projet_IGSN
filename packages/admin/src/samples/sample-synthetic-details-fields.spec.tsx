import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { TooltipProvider } from "@projet-igsn/design-system/components/ui/tooltip";
import { organizationLabel } from "@projet-igsn/domain/institutional-group/label";
import { vi } from "vitest";

import { render } from "../../test/render.tsx";
import { SampleForm } from "./sample-form.tsx";

const noop = () => {};

const createAction = (onSubmit: (value: CreateSample) => void) =>
  ({ kind: "submit", label: "Create", onSubmit }) as const;

const SYNTHETIC_MATERIAL = "Synthetic rock / mineral";

const syntheticDefaults = {
  name: "Synthetic forsterite",
  nature: "thin_section",
  type: "dredge",
  material: "synthetic_rock_mineral",
  collectionMethod: null,
  collectionMethodDescription: null,
} satisfies Partial<CreateSample> as CreateSample;

type Screen = Awaited<ReturnType<typeof render>>;

async function renderSyntheticForm(
  onSubmit: (value: CreateSample) => void = noop,
  defaultValues: CreateSample = syntheticDefaults,
): Promise<Screen> {
  const screen = await render(
    <SampleForm
      onCancel={noop}
      defaultValues={defaultValues}
      primaryAction={createAction(onSubmit)}
    />,
  );
  await screen.getByRole("tab", { name: "Synthetic details" }).click();
  return screen;
}

const pickMaterial = async (screen: Screen, option: string) => {
  await screen.getByRole("tab", { name: "Sample type" }).click();
  await screen
    .getByRole("combobox", { name: "Material *", exact: true })
    .click();
  await screen.getByRole("option", { name: option, exact: true }).click();
};

const pickOption = async (screen: Screen, combobox: string, option: string) => {
  await screen.getByRole("combobox", { name: combobox, exact: true }).click();
  await screen.getByRole("option", { name: option, exact: true }).click();
};

describe("SampleSyntheticDetailsFields", () => {
  it("should swap the location tab for the synthetic details tab with the material", async () => {
    const screen = await render(
      <SampleForm
        onCancel={noop}
        defaultValues={{ ...syntheticDefaults, material: "fossil" }}
        primaryAction={createAction(noop)}
      />,
    );

    await expect
      .element(screen.getByRole("tab", { name: "Synthetic details" }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByRole("tab", { name: "Location" }))
      .toBeVisible();

    await pickMaterial(screen, SYNTHETIC_MATERIAL);

    await expect
      .element(screen.getByRole("tab", { name: "Synthetic details" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("tab", { name: "Location" }))
      .not.toBeInTheDocument();

    await pickMaterial(screen, "Fossil");

    await expect
      .element(screen.getByRole("tab", { name: "Synthetic details" }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByRole("tab", { name: "Location" }))
      .toBeVisible();
  });

  it("should submit the entered synthesis details", async () => {
    const onSubmit = vi.fn();
    const screen = await renderSyntheticForm(onSubmit);

    await pickOption(screen, "Starting material *", "Synthetic");
    await pickOption(screen, "Nature of starting material *", "Powder");
    await screen
      .getByLabelText("Starting material composition *", { exact: true })
      .fill("SiO2 + MgO");
    await pickOption(screen, "Final product *", "Glass");
    await pickOption(screen, "Experiment type", "Fusion");
    await screen
      .getByLabelText("Experiment duration", { exact: true })
      .fill("3");
    await pickOption(screen, "Experiment duration unit *", "h");
    await screen.getByLabelText("Date *", { exact: true }).fill("2026-01-05");
    await screen
      .getByLabelText("Operator name *", { exact: true })
      .fill("Marie Curie");
    await screen
      .getByLabelText("Operator ORCID", { exact: true })
      .fill("0000-0002-1825-0097");
    await screen
      .getByRole("combobox", { name: "Research structure of the operator" })
      .click();
    await screen
      .getByPlaceholder("Search organizations...")
      .fill(organizationLabel("02feahw73"));
    await screen
      .getByRole("option", { name: organizationLabel("02feahw73") })
      .click();
    await screen
      .getByLabelText("Synthesis temperature", { exact: true })
      .fill("1200");
    await pickOption(screen, "Synthesis temperature unit *", "°C");
    await screen
      .getByLabelText("Synthesis pressure", { exact: true })
      .fill("2");
    await pickOption(screen, "Synthesis pressure unit *", "kbar");
    await screen
      .getByLabelText("Experimental protocol", { exact: true })
      .fill("Piston cylinder run");
    await screen
      .getByLabelText("Experiment purpose", { exact: true })
      .fill("Phase equilibria");
    await screen
      .getByLabelText("Equipment used", { exact: true })
      .fill("Piston cylinder");
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          syntheticDetails: {
            startingMaterial: "synthetic",
            startingMaterialNature: "powder",
            startingMaterialComposition: "SiO2 + MgO",
            finalProduct: "glass",
            experimentType: "fusion",
            experimentDuration: { value: 3, unit: "hour" },
            synthesisDate: { start: "2026-01-05", end: "2026-01-05" },
            operatorName: "Marie Curie",
            operatorOrcid: "0000-0002-1825-0097",
            researchStructure: ["02feahw73"],
            temperature: { value: 1200, unit: "celsius" },
            pressure: { value: 2, unit: "kbar" },
            experimentalProtocol: "Piston cylinder run",
            experimentPurpose: "Phase equilibria",
            equipmentUsed: "Piston cylinder",
          },
        }),
      ),
    );
  });

  it("should keep the synthesis details in the draft but drop them from the payload once the material is no longer synthetic", async () => {
    const onSubmit = vi.fn();
    const screen = await renderSyntheticForm(onSubmit);

    await screen
      .getByLabelText("Operator name *", { exact: true })
      .fill("Marie Curie");

    await pickMaterial(screen, "Fossil");
    await pickMaterial(screen, SYNTHETIC_MATERIAL);
    await screen.getByRole("tab", { name: "Synthetic details" }).click();
    await expect
      .element(screen.getByLabelText("Operator name *", { exact: true }))
      .toHaveValue("Marie Curie");

    await pickMaterial(screen, "Fossil");
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0]).not.toHaveProperty("syntheticDetails");
  });

  it.each([
    { nature: "Natural", visible: false },
    { nature: "Synthetic", visible: true },
    { nature: "Mixture", visible: true },
  ])(
    "should show the starting material composition for the $nature nature: $visible",
    async ({ nature, visible }) => {
      const screen = await renderSyntheticForm();

      await pickOption(screen, "Starting material *", nature);

      const composition = screen.getByLabelText(
        "Starting material composition *",
        { exact: true },
      );
      if (visible) {
        await expect.element(composition).toBeVisible();
      } else {
        await expect.element(composition).not.toBeInTheDocument();
      }
    },
  );

  it("should drop the starting material composition from the payload once the nature is natural", async () => {
    const onSubmit = vi.fn();
    const screen = await renderSyntheticForm(onSubmit);

    await pickOption(screen, "Starting material *", "Synthetic");
    await screen
      .getByLabelText("Starting material composition *", { exact: true })
      .fill("SiO2 + MgO");
    await pickOption(screen, "Starting material *", "Natural");
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          syntheticDetails: { startingMaterial: "natural" },
        }),
      ),
    );
  });

  it("should hide the duration and submit only the flag when the duration is not relevant", async () => {
    const onSubmit = vi.fn();
    const screen = await renderSyntheticForm(onSubmit);

    await screen
      .getByLabelText("Experiment duration", { exact: true })
      .fill("3");
    await pickOption(screen, "Experiment duration unit *", "h");
    await screen.getByRole("switch", { name: "Duration not relevant" }).click();

    await expect
      .element(screen.getByLabelText("Experiment duration", { exact: true }))
      .not.toBeInTheDocument();
    await expect
      .element(
        screen.getByRole("combobox", {
          name: "Experiment duration unit *",
          exact: true,
        }),
      )
      .not.toBeInTheDocument();

    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          syntheticDetails: { experimentDurationNotRelevant: true },
        }),
      ),
    );
  });

  it.each([
    { value: "Experiment duration", unit: "Experiment duration unit *" },
    { value: "Synthesis temperature", unit: "Synthesis temperature unit *" },
    { value: "Synthesis pressure", unit: "Synthesis pressure unit *" },
  ])(
    "should reveal $unit only once $value is entered",
    async ({ value, unit }) => {
      const screen = await renderSyntheticForm();

      await expect
        .element(screen.getByRole("combobox", { name: unit, exact: true }))
        .not.toBeInTheDocument();

      await screen.getByLabelText(value, { exact: true }).fill("5");

      await expect
        .element(screen.getByRole("combobox", { name: unit, exact: true }))
        .toBeVisible();
    },
  );

  it("should submit a synthesis date range and report an out-of-order one on both dates", async () => {
    const onSubmit = vi.fn();
    const screen = await renderSyntheticForm(onSubmit);

    await screen.getByRole("switch", { name: "Date range" }).click();
    await screen.getByLabelText("Start date *").fill("2026-02-10");
    await screen.getByLabelText("End date *").fill("2026-01-05");

    await expect
      .element(screen.getByRole("alert").first())
      .toHaveTextContent("The start date must be before the end date.");
    await screen.getByRole("button", { name: "Create" }).click();
    expect(onSubmit).not.toHaveBeenCalled();

    await screen.getByLabelText("End date *").fill("2026-03-10");
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          syntheticDetails: {
            synthesisDate: { start: "2026-02-10", end: "2026-03-10" },
          },
        }),
      ),
    );
  });

  it("should freeze the identifying synthesis fields of a published sample and keep the rest editable", async () => {
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          status="published"
          defaultValues={{
            ...syntheticDefaults,
            scientificContext: {
              provenanceStatus: "historical_specimen",
              collectionCurator: "Georges Cuvier",
              collectionOrigin: "scientific_expedition",
            },
            syntheticDetails: {
              startingMaterial: "synthetic",
              startingMaterialNature: "powder",
              startingMaterialComposition: "SiO2 + MgO",
              finalProduct: "glass",
              experimentType: "fusion",
              synthesisDate: { start: "2026-01-05", end: "2026-01-05" },
              operatorName: "Marie Curie",
              researchStructure: ["02feahw73"],
              temperature: { value: 1200, unit: "celsius" },
            },
          }}
          primaryAction={{ kind: "submit", label: "Save", onSubmit: noop }}
        />
      </TooltipProvider>,
    );

    await screen.getByRole("tab", { name: "Synthetic details" }).click();

    for (const name of [
      "Starting material *",
      "Nature of starting material *",
      "Final product *",
      "Experiment type",
    ]) {
      await expect
        .element(screen.getByRole("combobox", { name, exact: true }))
        .toBeDisabled();
    }
    await expect
      .element(
        screen.getByLabelText("Starting material composition *", {
          exact: true,
        }),
      )
      .toBeDisabled();
    await expect
      .element(screen.getByLabelText("Date *", { exact: true }))
      .toBeDisabled();
    await expect
      .element(screen.getByRole("switch", { name: "Duration not relevant" }))
      .toBeDisabled();
    await expect
      .element(screen.getByLabelText("Operator name *", { exact: true }))
      .toBeDisabled();

    await expect
      .element(screen.getByLabelText("Synthesis temperature", { exact: true }))
      .toBeEnabled();
    await expect
      .element(screen.getByLabelText("Synthesis pressure", { exact: true }))
      .toBeEnabled();
    await expect
      .element(screen.getByLabelText("Experimental protocol", { exact: true }))
      .toBeEnabled();
    await expect
      .element(screen.getByLabelText("Experiment purpose", { exact: true }))
      .toBeEnabled();
    await expect
      .element(screen.getByLabelText("Equipment used", { exact: true }))
      .toBeEnabled();
  });
});
