import type {
  CreateSample,
  SampleStatus,
} from "@projet-igsn/domain/sample/sample";
import type { ComponentProps } from "react";

import { TooltipProvider } from "@projet-igsn/design-system/components/ui/tooltip";
import { vi } from "vitest";

import { render } from "../../test/render.tsx";
import { SampleForm } from "./sample-form.tsx";

const noop = () => {};

const createAction = (onSubmit: (value: CreateSample) => void) =>
  ({ kind: "submit", label: "Create", onSubmit }) as const;

const publishableScientificContext = {
  provenanceStatus: "collection_specimen",
  collectionCurator: "Georges Cuvier",
  collectionOrigin: "scientific_expedition",
} as const;

const publishableRepository = { currentArchive: "02feahw73" } as const;

const NO_ANSWERS = {
  description: { oriented: false },
  security: { radioactivity: false, asbestosRich: false, chemicalRisk: false },
} as const;

type Screen = Awaited<ReturnType<typeof render>>;

async function renderLocation(
  typeOption: "Point" | "Polygon" | "Line",
  onSubmit: (value: CreateSample) => void = noop,
): Promise<Screen> {
  const screen = await render(
    <SampleForm
      onCancel={noop}
      defaultValues={{
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: "dredge",
        material: "fossil",
        collectionMethod: null,
        collectionMethodDescription: null,
      }}
      primaryAction={createAction(onSubmit)}
    />,
  );

  await screen.getByRole("tab", { name: "Location" }).click();
  await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
  await screen.getByRole("option", { name: typeOption }).click();
  return screen;
}

const MSL_SYSTEM = "MSL height (EPSG:5714) - Mean sea level";

async function fillVertical(screen: Screen) {
  await screen.getByLabelText("Vertical position").fill("100");
  await screen.getByRole("combobox", { name: "Vertical reference *" }).click();
  await screen.getByRole("option", { name: "Bathymetry" }).click();
  await screen
    .getByRole("combobox", { name: "Vertical reference system" })
    .click();
  await screen.getByRole("option", { name: MSL_SYSTEM }).click();
}

const BASALT_TEAM = {
  id: "3f2504e0-4f89-41d3-9a0c-0305000000a1",
  name: "Basalt team",
};
const FOSSIL_TEAM = {
  id: "3f2504e0-4f89-41d3-9a0c-0305000000a2",
  name: "Fossil team",
};
const MANUAL_GROUPS = [BASALT_TEAM, FOSSIL_TEAM];

describe("SampleForm", () => {
  it("should reject a blank name and not submit", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(onSubmit)} />,
    );

    await screen.getByRole("button", { name: "Create" }).click();

    await expect.element(screen.getByText("Name is required")).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("should submit the entered name and selected nature with null type and material", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(onSubmit)} />,
    );

    await screen.getByLabelText(/name/i).fill("Basalte du Massif Central");
    await screen.getByRole("combobox", { name: /nature/i }).click();
    await screen.getByText("Thin section").click();
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
        ...NO_ANSWERS,
      }),
    );
  });

  it("should prefill the fields and use the given primary label", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm
        onCancel={noop}
        defaultValues={{
          name: "Basalte du Massif Central",
          nature: "thin_section",
          type: "core.section",
          material: null,
          collectionMethod: null,
          collectionMethodDescription: null,
        }}
        primaryAction={{ kind: "submit", label: "Save", onSubmit }}
      />,
    );

    await expect
      .element(screen.getByLabelText(/name/i))
      .toHaveValue("Basalte du Massif Central");

    await screen.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        manualGroupIds: [],
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: "core.section",
        material: null,
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: null,
        geologicalContextDescription: null,
        geomorphologicalEnvironment: null,
        location: null,
        existenceStatus: "exists",
        availabilityStatus: "available",
        ...NO_ANSWERS,
      }),
    );
  });

  it("should submit the selected type", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(onSubmit)} />,
    );

    await screen.getByLabelText(/name/i).fill("Basalte du Massif Central");
    await screen.getByRole("combobox", { name: "Nature" }).click();
    await screen.getByText("Thin section").click();
    await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
    await screen.getByRole("option", { name: "Dredge" }).click();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        manualGroupIds: [],
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: "dredge",
        material: null,
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: null,
        geologicalContextDescription: null,
        geomorphologicalEnvironment: null,
        location: null,
        existenceStatus: "exists",
        availabilityStatus: "available",
        ...NO_ANSWERS,
      }),
    );
  });

  it("should show the sub-type select only for a type with sub-values", async () => {
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(noop)} />,
    );

    await expect
      .element(screen.getByRole("combobox", { name: "Core" }))
      .not.toBeInTheDocument();

    await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
    await screen.getByRole("option", { name: "Core" }).click();

    await expect
      .element(screen.getByRole("combobox", { name: "Core" }))
      .toBeVisible();
  });

  it("should submit the selected sub-type as the full type path", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(onSubmit)} />,
    );

    await screen.getByLabelText(/name/i).fill("Basalte du Massif Central");
    await screen.getByRole("combobox", { name: "Nature" }).click();
    await screen.getByText("Thin section").click();
    await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
    await screen.getByRole("option", { name: "Core" }).click();
    await screen.getByRole("combobox", { name: "Core" }).click();
    await screen.getByRole("option", { name: "Half round" }).click();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        manualGroupIds: [],
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: "core.half_round",
        material: null,
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: null,
        geologicalContextDescription: null,
        geomorphologicalEnvironment: null,
        location: null,
        existenceStatus: "exists",
        availabilityStatus: "available",
        ...NO_ANSWERS,
      }),
    );
  });

  it("should save a bare ancestor type as a draft (completeness is a publish gate)", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(onSubmit)} />,
    );

    await screen.getByLabelText(/name/i).fill("Basalte du Massif Central");
    await screen.getByRole("combobox", { name: "Nature" }).click();
    await screen.getByText("Thin section").click();
    await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
    await screen.getByRole("option", { name: "Core" }).click();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        manualGroupIds: [],
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: "core",
        material: null,
        specificName: null,
        geologicalContextDescription: null,
        geomorphologicalEnvironment: null,
        collectionMethod: null,
        collectionMethodDescription: null,
        location: null,
        existenceStatus: "exists",
        availabilityStatus: "available",
        ...NO_ANSWERS,
      }),
    );
  });

  it("should reset the sub-type when the type changes", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(onSubmit)} />,
    );

    await screen.getByLabelText(/name/i).fill("Basalte du Massif Central");
    await screen.getByRole("combobox", { name: "Nature" }).click();
    await screen.getByText("Thin section").click();
    await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
    await screen.getByRole("option", { name: "Core" }).click();
    await screen.getByRole("combobox", { name: "Core" }).click();
    await screen.getByRole("option", { name: "Half round" }).click();
    await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
    await screen.getByRole("option", { name: "Dredge" }).click();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        manualGroupIds: [],
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: "dredge",
        material: null,
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: null,
        geologicalContextDescription: null,
        geomorphologicalEnvironment: null,
        location: null,
        existenceStatus: "exists",
        availabilityStatus: "available",
        ...NO_ANSWERS,
      }),
    );
  });

  it("should prefill the type and sub-type selects from a nested path", async () => {
    const screen = await render(
      <SampleForm
        onCancel={noop}
        defaultValues={{
          name: "Basalte du Massif Central",
          nature: "thin_section",
          type: "core.section",
          material: null,
          collectionMethod: null,
          collectionMethodDescription: null,
        }}
        primaryAction={{ kind: "submit", label: "Save", onSubmit: noop }}
      />,
    );

    await expect
      .element(screen.getByRole("combobox", { name: "Type *", exact: true }))
      .toHaveTextContent("Core");
    await expect
      .element(screen.getByRole("combobox", { name: "Core" }))
      .toHaveTextContent("Section");
  });

  it("should drill down the material cascade and submit the leaf path", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(onSubmit)} />,
    );

    await screen.getByLabelText(/name/i).fill("Basalt");
    await screen.getByRole("combobox", { name: "Nature" }).click();
    await screen.getByText("Thin section").click();

    await screen.getByRole("tab", { name: "Sample type" }).click();
    await screen
      .getByRole("combobox", { name: "Material *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Rock", exact: true }).click();
    await screen.getByRole("combobox", { name: "Rock *", exact: true }).click();
    await screen.getByRole("option", { name: "Igneous", exact: true }).click();

    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        manualGroupIds: [],
        name: "Basalt",
        nature: "thin_section",
        type: null,
        material: "rock.igneous",
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: null,
        geologicalContextDescription: null,
        geomorphologicalEnvironment: null,
        location: null,
        existenceStatus: "exists",
        availabilityStatus: "available",
        ...NO_ANSWERS,
      }),
    );
  });

  it("should show the texture field for an igneous branch and submit the chosen texture", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(onSubmit)} />,
    );

    await screen.getByLabelText(/name/i).fill("Granite");
    await screen.getByRole("combobox", { name: "Nature" }).click();
    await screen.getByText("Thin section").click();
    await screen.getByRole("tab", { name: "Sample type" }).click();

    await expect
      .element(screen.getByRole("combobox", { name: "Texture" }))
      .not.toBeInTheDocument();

    await screen
      .getByRole("combobox", { name: "Material *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Rock", exact: true }).click();
    await screen.getByRole("combobox", { name: "Rock *", exact: true }).click();
    await screen.getByRole("option", { name: "Igneous", exact: true }).click();
    await screen
      .getByRole("combobox", { name: "Igneous *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Plutonic", exact: true }).click();
    await screen
      .getByRole("combobox", { name: "Plutonic *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Felsic", exact: true }).click();
    await screen
      .getByRole("combobox", { name: "Felsic *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Granite", exact: true }).click();

    await screen.getByRole("combobox", { name: "Texture" }).click();
    await screen.getByRole("option", { name: "Phaneritic" }).click();

    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        manualGroupIds: [],
        name: "Granite",
        nature: "thin_section",
        type: null,
        material: "rock.igneous.plutonic.felsic.granite",
        texture: "phaneritic",
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: null,
        geologicalContextDescription: null,
        geomorphologicalEnvironment: null,
        location: null,
        existenceStatus: "exists",
        availabilityStatus: "available",
        ...NO_ANSWERS,
      }),
    );
  }, 15000);

  it("should keep the texture when refining deeper within the same branch", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(onSubmit)} />,
    );

    await screen.getByLabelText(/name/i).fill("Granite");
    await screen.getByRole("combobox", { name: "Nature" }).click();
    await screen.getByText("Thin section").click();
    await screen.getByRole("tab", { name: "Sample type" }).click();

    await screen
      .getByRole("combobox", { name: "Material *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Rock", exact: true }).click();
    await screen.getByRole("combobox", { name: "Rock *", exact: true }).click();
    await screen.getByRole("option", { name: "Igneous", exact: true }).click();
    await screen
      .getByRole("combobox", { name: "Igneous *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Plutonic", exact: true }).click();

    await screen.getByRole("combobox", { name: "Texture" }).click();
    await screen.getByRole("option", { name: "Phaneritic" }).click();

    await screen
      .getByRole("combobox", { name: "Plutonic *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Felsic", exact: true }).click();
    await screen
      .getByRole("combobox", { name: "Felsic *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Granite", exact: true }).click();

    await expect
      .element(screen.getByRole("combobox", { name: "Texture" }))
      .toHaveTextContent("Phaneritic");

    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        manualGroupIds: [],
        name: "Granite",
        nature: "thin_section",
        type: null,
        material: "rock.igneous.plutonic.felsic.granite",
        texture: "phaneritic",
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: null,
        geologicalContextDescription: null,
        geomorphologicalEnvironment: null,
        location: null,
        existenceStatus: "exists",
        availabilityStatus: "available",
        ...NO_ANSWERS,
      }),
    );
  });

  it("should drop the texture when the material branch changes", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(onSubmit)} />,
    );

    await screen.getByLabelText(/name/i).fill("Rock");
    await screen.getByRole("combobox", { name: "Nature" }).click();
    await screen.getByText("Thin section").click();
    await screen.getByRole("tab", { name: "Sample type" }).click();

    await screen
      .getByRole("combobox", { name: "Material *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Rock", exact: true }).click();
    await screen.getByRole("combobox", { name: "Rock *", exact: true }).click();
    await screen.getByRole("option", { name: "Igneous", exact: true }).click();
    await screen
      .getByRole("combobox", { name: "Igneous *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Plutonic", exact: true }).click();

    await screen.getByRole("combobox", { name: "Texture" }).click();
    await screen.getByRole("option", { name: "Phaneritic" }).click();
    await expect
      .element(screen.getByRole("combobox", { name: "Texture" }))
      .toHaveTextContent("Phaneritic");

    await screen
      .getByRole("combobox", { name: "Igneous *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Volcanic", exact: true }).click();

    await expect
      .element(screen.getByRole("combobox", { name: "Texture" }))
      .not.toHaveTextContent("Phaneritic");

    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        manualGroupIds: [],
        name: "Rock",
        nature: "thin_section",
        type: null,
        material: "rock.igneous.volcanic",
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: null,
        geologicalContextDescription: null,
        geomorphologicalEnvironment: null,
        location: null,
        existenceStatus: "exists",
        availabilityStatus: "available",
        ...NO_ANSWERS,
      }),
    );
  });

  it("should show and submit a metamorphic facies for a metamorphic material", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(onSubmit)} />,
    );

    await screen.getByLabelText(/name/i).fill("Gneiss");
    await screen.getByRole("combobox", { name: "Nature" }).click();
    await screen.getByText("Thin section").click();
    await screen.getByRole("tab", { name: "Sample type" }).click();

    await screen
      .getByRole("combobox", { name: "Material *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Rock", exact: true }).click();
    await screen.getByRole("combobox", { name: "Rock *", exact: true }).click();
    await screen
      .getByRole("option", { name: "Metamorphic", exact: true })
      .click();
    await screen
      .getByRole("combobox", { name: "Metamorphic *", exact: true })
      .click();
    await screen
      .getByRole("option", { name: "Strongly metamorphosed", exact: true })
      .click();
    await screen
      .getByRole("combobox", { name: "Strongly metamorphosed *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Gneiss", exact: true }).click();

    await screen
      .getByRole("combobox", { name: "Metamorphic facies *" })
      .click();
    await screen.getByRole("option", { name: "Amphibolite facies" }).click();

    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        manualGroupIds: [],
        name: "Gneiss",
        nature: "thin_section",
        type: null,
        material: "rock.metamorphic.strongly_metamorphosed.gneiss",
        metamorphicFacies: "amphibolite",
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: null,
        geologicalContextDescription: null,
        geomorphologicalEnvironment: null,
        location: null,
        existenceStatus: "exists",
        availabilityStatus: "available",
        ...NO_ANSWERS,
      }),
    );
  });

  it("should recurse into the reused igneous subtree under weakly metamorphosed", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(onSubmit)} />,
    );

    await screen.getByLabelText(/name/i).fill("Meta-granite");
    await screen.getByRole("combobox", { name: "Nature" }).click();
    await screen.getByText("Thin section").click();
    await screen.getByRole("tab", { name: "Sample type" }).click();

    await screen
      .getByRole("combobox", { name: "Material *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Rock", exact: true }).click();
    await screen.getByRole("combobox", { name: "Rock *", exact: true }).click();
    await screen
      .getByRole("option", { name: "Metamorphic", exact: true })
      .click();
    await screen
      .getByRole("combobox", { name: "Metamorphic *", exact: true })
      .click();
    await screen
      .getByRole("option", { name: "Weakly metamorphosed", exact: true })
      .click();
    await screen
      .getByRole("combobox", { name: "Weakly metamorphosed *", exact: true })
      .click();
    await screen
      .getByRole("option", { name: "Meta-igneous rock", exact: true })
      .click();
    await screen
      .getByRole("combobox", { name: "Meta-igneous rock *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Plutonic", exact: true }).click();
    await screen
      .getByRole("combobox", { name: "Plutonic *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Felsic", exact: true }).click();
    await screen
      .getByRole("combobox", { name: "Felsic *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Granite", exact: true }).click();

    await screen
      .getByRole("combobox", { name: "Metamorphic facies *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Amphibolite facies" }).click();

    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        manualGroupIds: [],
        name: "Meta-granite",
        nature: "thin_section",
        type: null,
        material:
          "rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.plutonic.felsic.granite",
        metamorphicFacies: "amphibolite",
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: null,
        geologicalContextDescription: null,
        geomorphologicalEnvironment: null,
        location: null,
        existenceStatus: "exists",
        availabilityStatus: "available",
        ...NO_ANSWERS,
      }),
    );
  }, 15000);

  it("should drop the metamorphic facies when the material leaves metamorphic", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(onSubmit)} />,
    );

    await screen.getByLabelText(/name/i).fill("Rock");
    await screen.getByRole("combobox", { name: "Nature" }).click();
    await screen.getByText("Thin section").click();
    await screen.getByRole("tab", { name: "Sample type" }).click();

    await screen
      .getByRole("combobox", { name: "Material *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Rock", exact: true }).click();
    await screen.getByRole("combobox", { name: "Rock *", exact: true }).click();
    await screen
      .getByRole("option", { name: "Metamorphic", exact: true })
      .click();

    await screen
      .getByRole("combobox", { name: "Metamorphic facies *" })
      .click();
    await screen.getByRole("option", { name: "Amphibolite facies" }).click();

    await screen.getByRole("combobox", { name: "Rock *", exact: true }).click();
    await screen.getByRole("option", { name: "Igneous", exact: true }).click();

    await expect
      .element(screen.getByRole("combobox", { name: "Metamorphic facies *" }))
      .not.toBeInTheDocument();

    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        manualGroupIds: [],
        name: "Rock",
        nature: "thin_section",
        type: null,
        material: "rock.igneous",
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: null,
        geologicalContextDescription: null,
        geomorphologicalEnvironment: null,
        location: null,
        existenceStatus: "exists",
        availabilityStatus: "available",
        ...NO_ANSWERS,
      }),
    );
  });

  it("should submit the entered specific name", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(onSubmit)} />,
    );

    await screen.getByLabelText(/^name/i).fill("Basalte du Massif Central");
    await screen.getByRole("combobox", { name: "Nature" }).click();
    await screen.getByText("Thin section").click();
    await screen.getByRole("tab", { name: "Sample type" }).click();
    await screen.getByLabelText(/specific name/i).fill("MC-2026-007");
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
        specificName: "MC-2026-007",
        geologicalContextDescription: null,
        geomorphologicalEnvironment: null,
        location: null,
        existenceStatus: "exists",
        availabilityStatus: "available",
        ...NO_ANSWERS,
      }),
    );
  });

  it("should walk the collection-method levels and submit the deepest path", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(onSubmit)} />,
    );

    await screen.getByLabelText(/name/i).fill("Basalte du Massif Central");
    await screen.getByRole("combobox", { name: "Nature" }).click();
    await screen.getByText("Thin section").click();
    await screen
      .getByRole("combobox", { name: "Collection Method", exact: true })
      .click();
    await screen.getByRole("option", { name: "Coring" }).click();
    await screen.getByRole("combobox", { name: "Coring", exact: true }).click();
    await screen.getByRole("option", { name: "GravityCorer" }).click();
    await screen
      .getByRole("combobox", { name: "GravityCorer", exact: true })
      .click();
    await screen.getByRole("option", { name: "Giant" }).click();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        manualGroupIds: [],
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: null,
        material: null,
        collectionMethod: "coring.gravity_corer.giant",
        collectionMethodDescription: null,
        specificName: null,
        geologicalContextDescription: null,
        geomorphologicalEnvironment: null,
        location: null,
        existenceStatus: "exists",
        availabilityStatus: "available",
        ...NO_ANSWERS,
      }),
    );
  });

  it("should prefill the collection-method levels from a nested path", async () => {
    const screen = await render(
      <SampleForm
        onCancel={noop}
        defaultValues={{
          name: "Basalte du Massif Central",
          nature: "thin_section",
          type: null,
          material: null,
          collectionMethod: "coring.gravity_corer.giant",
          collectionMethodDescription: null,
        }}
        primaryAction={{ kind: "submit", label: "Save", onSubmit: noop }}
      />,
    );

    await expect
      .element(
        screen.getByRole("combobox", {
          name: "Collection Method",
          exact: true,
        }),
      )
      .toHaveTextContent("Coring");
    await expect
      .element(screen.getByRole("combobox", { name: "Coring", exact: true }))
      .toHaveTextContent("GravityCorer");
    await expect
      .element(
        screen.getByRole("combobox", { name: "GravityCorer", exact: true }),
      )
      .toHaveTextContent("Giant");
  });

  it("should submit the entered collection method description", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(onSubmit)} />,
    );

    await screen.getByLabelText(/^name/i).fill("Basalte du Massif Central");
    await screen.getByRole("combobox", { name: "Nature" }).click();
    await screen.getByText("Thin section").click();
    await screen
      .getByLabelText("Collection Method Description")
      .fill("Cored at low tide from the northern outcrop");
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        manualGroupIds: [],
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: null,
        material: null,
        collectionMethod: null,
        collectionMethodDescription:
          "Cored at low tide from the northern outcrop",
        specificName: null,
        geologicalContextDescription: null,
        geomorphologicalEnvironment: null,
        location: null,
        existenceStatus: "exists",
        availabilityStatus: "available",
        ...NO_ANSWERS,
      }),
    );
  });

  it("should submit a blank collection method description as null", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(onSubmit)} />,
    );

    await screen.getByLabelText(/^name/i).fill("Basalte du Massif Central");
    await screen.getByRole("combobox", { name: "Nature" }).click();
    await screen.getByText("Thin section").click();
    await screen.getByLabelText("Collection Method Description").fill("   ");
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
        ...NO_ANSWERS,
      }),
    );
  });

  it("should submit a single numeric age with unit and years unit", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(onSubmit)} />,
    );

    await screen.getByLabelText(/^name/i).fill("Basalte du Massif Central");
    await screen.getByRole("combobox", { name: "Nature" }).click();
    await screen.getByText("Thin section").click();
    await screen.getByRole("tab", { name: "Physical description" }).click();
    await screen.getByRole("switch", { name: "Record a numeric age" }).click();

    await screen
      .getByRole("spinbutton", { name: "Numeric age", exact: true })
      .fill("12000");
    await screen.getByRole("combobox", { name: "Units" }).click();
    await screen.getByRole("option", { name: "a (years)" }).click();
    await screen.getByRole("combobox", { name: "Reference" }).click();
    await screen.getByRole("option", { name: "BP", exact: true }).click();
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
        ...NO_ANSWERS,
        age: {
          numericAgeMin: 12000,
          numericAgeMax: 12000,
          numericAgeUnit: "a",
          numericAgeYearsUnit: "bp",
          geologicalAgeMin: null,
          geologicalAgeMax: null,
          geologicalUnit: null,
        },
      }),
    );
  });

  it("should not keep a numeric age unit the mode switch left without a value", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(onSubmit)} />,
    );

    await screen.getByLabelText(/^name/i).fill("Basalte du Massif Central");
    await screen.getByRole("combobox", { name: "Nature" }).click();
    await screen.getByText("Thin section").click();
    await screen.getByRole("tab", { name: "Physical description" }).click();
    await screen.getByRole("switch", { name: "Record a numeric age" }).click();

    await screen
      .getByRole("spinbutton", { name: "Numeric age", exact: true })
      .fill("12000");
    await screen.getByRole("combobox", { name: "Units *" }).click();
    await screen.getByRole("option", { name: "Ma", exact: true }).click();
    await screen
      .getByRole("radio", { name: "Range (min / max)" })
      .first()
      .click();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.lastCall?.[0]).not.toHaveProperty("age");
  });

  it("should show the unit only once a value is entered and the reference only for annum", async () => {
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(noop)} />,
    );

    await screen.getByRole("tab", { name: "Physical description" }).click();
    await screen.getByRole("switch", { name: "Record a numeric age" }).click();

    await expect
      .element(screen.getByRole("combobox", { name: "Units" }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByRole("combobox", { name: "Reference" }))
      .not.toBeInTheDocument();

    await screen
      .getByRole("spinbutton", { name: "Numeric age", exact: true })
      .fill("120");
    await expect
      .element(screen.getByRole("combobox", { name: "Units *" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("combobox", { name: "Reference" }))
      .not.toBeInTheDocument();

    await screen.getByRole("combobox", { name: "Units *" }).click();
    await screen.getByRole("option", { name: "a (years)" }).click();
    await expect
      .element(screen.getByRole("combobox", { name: "Reference *" }))
      .toBeVisible();
  });

  it("should swap to min/max inputs when Range mode is selected", async () => {
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(noop)} />,
    );

    await screen.getByRole("tab", { name: "Physical description" }).click();
    await screen.getByRole("switch", { name: "Record a numeric age" }).click();

    await expect
      .element(
        screen.getByRole("spinbutton", { name: "Numeric age", exact: true }),
      )
      .toBeInTheDocument();

    await screen
      .getByRole("radio", { name: "Range (min / max)" })
      .first()
      .click();

    await expect
      .element(
        screen.getByRole("spinbutton", { name: "Numeric age", exact: true }),
      )
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByLabelText("Numeric age minimum"))
      .toBeVisible();
    await expect
      .element(screen.getByLabelText("Numeric age maximum"))
      .toBeVisible();
  });

  it("should hide the numeric block by default and reveal it when its toggle is turned on", async () => {
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(noop)} />,
    );

    await screen.getByRole("tab", { name: "Physical description" }).click();
    await expect
      .element(
        screen.getByRole("spinbutton", { name: "Numeric age", exact: true }),
      )
      .not.toBeInTheDocument();

    await screen.getByRole("switch", { name: "Record a numeric age" }).click();

    await expect
      .element(
        screen.getByRole("spinbutton", { name: "Numeric age", exact: true }),
      )
      .toBeInTheDocument();
  });

  it("should save a half-entered numeric range as a draft without erroring", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(onSubmit)} />,
    );

    await screen.getByLabelText(/^name/i).fill("Basalte du Massif Central");
    await screen.getByRole("combobox", { name: "Nature" }).click();
    await screen.getByText("Thin section").click();
    await screen.getByRole("tab", { name: "Physical description" }).click();
    await screen.getByRole("switch", { name: "Record a numeric age" }).click();
    await screen
      .getByRole("radio", { name: "Range (min / max)" })
      .first()
      .click();
    await screen.getByLabelText("Numeric age minimum").fill("100");

    await expect
      .element(
        screen.getByText(
          "A numeric age range needs both a minimum and a maximum.",
        ),
      )
      .not.toBeInTheDocument();

    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          age: expect.objectContaining({
            numericAgeMin: 100,
            numericAgeMax: null,
          }),
        }),
      ),
    );
  });

  it("should drop the reference when the unit leaves annum so the form can submit", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(onSubmit)} />,
    );

    await screen.getByLabelText(/^name/i).fill("Basalte du Massif Central");
    await screen.getByRole("combobox", { name: "Nature" }).click();
    await screen.getByText("Thin section").click();
    await screen.getByRole("tab", { name: "Physical description" }).click();
    await screen.getByRole("switch", { name: "Record a numeric age" }).click();

    await screen
      .getByRole("spinbutton", { name: "Numeric age", exact: true })
      .fill("120");
    await screen.getByRole("combobox", { name: "Units" }).click();
    await screen.getByRole("option", { name: "a (years)" }).click();
    await screen.getByRole("combobox", { name: "Reference" }).click();
    await screen.getByRole("option", { name: "BP", exact: true }).click();
    await screen.getByRole("combobox", { name: "Units" }).click();
    await screen.getByRole("option", { name: "Ma", exact: true }).click();

    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          age: expect.objectContaining({
            numericAgeMin: 120,
            numericAgeMax: 120,
            numericAgeUnit: "ma",
            numericAgeYearsUnit: null,
          }),
        }),
      ),
    );
  });

  it("should prefill the age from defaultValues", async () => {
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
          age: {
            numericAgeMin: 120,
            numericAgeMax: 120,
            numericAgeUnit: "ma",
            numericAgeYearsUnit: null,
            geologicalAgeMin: null,
            geologicalAgeMax: null,
            geologicalUnit: null,
          },
        }}
        primaryAction={{ kind: "submit", label: "Save", onSubmit: noop }}
      />,
    );

    await screen.getByRole("tab", { name: "Physical description" }).click();

    await expect
      .element(
        screen.getByRole("spinbutton", { name: "Numeric age", exact: true }),
      )
      .toHaveValue(120);
  });

  it("should operate no age control on a read-only form", async () => {
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          readOnlyReason="Pierre Martin is editing this sample."
          defaultValues={{
            name: "Basalte du Massif Central",
            nature: "thin_section",
            type: null,
            material: null,
            collectionMethod: null,
            collectionMethodDescription: null,
            age: {
              numericAgeMin: 120,
              numericAgeMax: 120,
              numericAgeUnit: "ma",
              numericAgeYearsUnit: null,
              geologicalAgeMin: 8,
              geologicalAgeMax: 8,
              geologicalUnit: null,
            },
          }}
          primaryAction={{ kind: "submit", label: "Save", onSubmit: noop }}
        />
      </TooltipProvider>,
    );

    await screen.getByRole("tab", { name: "Physical description" }).click();

    await expect
      .element(screen.getByRole("switch", { name: "Record a numeric age" }))
      .toBeDisabled();
    await expect
      .element(
        screen.getByRole("switch", { name: "Record a stratigraphic age" }),
      )
      .toBeDisabled();
    await expect
      .element(
        screen
          .getByRole("radiogroup", { name: "Numeric age entry mode" })
          .getByRole("radio", { name: "Range (min / max)" }),
      )
      .toBeDisabled();
    await expect
      .element(
        screen
          .getByRole("radiogroup", { name: "Stratigraphic age entry mode" })
          .getByRole("radio", { name: "Range (min / max)" }),
      )
      .toBeDisabled();
  });

  it("should call onCancel when Cancel is clicked", async () => {
    const onCancel = vi.fn();
    const screen = await render(
      <SampleForm onCancel={onCancel} primaryAction={createAction(noop)} />,
    );

    await screen.getByRole("button", { name: "Cancel" }).click();

    expect(onCancel).toHaveBeenCalled();
  });

  it("should call the publish action, not the submit action, when Save & Publish is confirmed", async () => {
    const onSubmit = vi.fn();
    const onPublish = vi.fn();
    const screen = await render(
      <SampleForm
        onCancel={noop}
        defaultValues={{
          name: "Basalte du Massif Central",
          nature: "thin_section",
          type: "dredge",
          material: "fossil",
          collectionMethod: null,
          collectionMethodDescription: null,
          specificName: "MC-2026-007",
          location: { position: { type: "point", longitude: 3, latitude: 45 } },
          description: {
            collectionDate: {
              precision: "day",
              start: "2026-01-01",
              end: "2026-01-01",
            },
          },
          existenceStatus: "exists",
          availabilityStatus: "available",
          scientificContext: publishableScientificContext,
          repository: publishableRepository,
        }}
        secondaryAction={{ kind: "submit", label: "Save as draft", onSubmit }}
        primaryAction={{ kind: "publish", label: "Save & Publish", onPublish }}
      />,
    );

    await screen.getByRole("button", { name: "Save & Publish" }).click();
    await screen.getByRole("button", { name: "Confirm" }).click();

    await vi.waitFor(() =>
      expect(onPublish).toHaveBeenCalledWith(
        {
          manualGroupIds: [],
          name: "Basalte du Massif Central",
          nature: "thin_section",
          type: "dredge",
          material: "fossil",
          collectionMethod: null,
          collectionMethodDescription: null,
          specificName: "MC-2026-007",
          geologicalContextDescription: null,
          geomorphologicalEnvironment: null,
          location: { position: { type: "point", longitude: 3, latitude: 45 } },
          description: {
            oriented: false,
            collectionDate: {
              precision: "day",
              start: "2026-01-01",
              end: "2026-01-01",
            },
          },
          existenceStatus: "exists",
          availabilityStatus: "available",
          security: {
            radioactivity: false,
            asbestosRich: false,
            chemicalRisk: false,
          },
          scientificContext: publishableScientificContext,
          repository: publishableRepository,
        },
        "published",
      ),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  const publishGateBase = {
    name: "Basalte du Massif Central",
    nature: "thin_section",
    collectionMethod: null,
    collectionMethodDescription: null,
  } as const;

  it.each<[string, CreateSample, RegExp]>([
    [
      "the material is missing",
      { ...publishGateBase, type: "dredge", material: null },
      /set the material before publishing/i,
    ],
    [
      "the type is missing",
      { ...publishGateBase, type: null, material: "fossil" },
      /set the sample type before publishing/i,
    ],
    [
      "the collection date is missing",
      {
        ...publishGateBase,
        type: "dredge",
        material: "fossil",
        location: { position: { type: "point", longitude: 3, latitude: 45 } },
      },
      /set the collection date before publishing/i,
    ],
    [
      "a required location is missing",
      { ...publishGateBase, type: "dredge", material: "fossil" },
      /set the sample location/i,
    ],
  ])(
    "should disable Save & Publish and explain in a tooltip when %s",
    async (_case, defaultValues, message) => {
      const screen = await render(
        <TooltipProvider>
          <SampleForm
            onCancel={noop}
            defaultValues={defaultValues}
            primaryAction={{
              kind: "publish",
              label: "Save & Publish",
              onPublish: noop,
            }}
          />
        </TooltipProvider>,
      );

      const publish = screen.getByRole("button", { name: "Save & Publish" });
      await expect.element(publish).toBeDisabled();

      publish.element().closest<HTMLElement>("[tabindex]")?.focus();
      await expect
        .element(screen.getByRole("tooltip"))
        .toHaveTextContent(message);
    },
  );

  it("should enable Save & Publish when the specific name is missing", async () => {
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          defaultValues={{
            name: "Basalte du Massif Central",
            nature: "thin_section",
            type: "dredge",
            material: "fossil",
            collectionMethod: null,
            collectionMethodDescription: null,
            location: {
              position: { type: "point", longitude: 3, latitude: 45 },
            },
            description: {
              collectionDate: {
                precision: "day",
                start: "2026-01-01",
                end: "2026-01-01",
              },
            },
            existenceStatus: "exists",
            availabilityStatus: "available",
            scientificContext: publishableScientificContext,
            repository: publishableRepository,
          }}
          secondaryAction={{
            kind: "submit",
            label: "Save as draft",
            onSubmit: noop,
          }}
          primaryAction={{
            kind: "publish",
            label: "Save & Publish",
            onPublish: noop,
          }}
        />
      </TooltipProvider>,
    );

    await expect
      .element(screen.getByRole("button", { name: "Save & Publish" }))
      .toBeEnabled();
  });

  it("should default the curation statuses to Exists and Available and not block publish on them", async () => {
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          defaultValues={{
            name: "Basalte du Massif Central",
            nature: "thin_section",
            type: "dredge",
            material: "fossil",
            collectionMethod: null,
            collectionMethodDescription: null,
            location: {
              position: { type: "point", longitude: 3, latitude: 45 },
            },
            description: {
              collectionDate: {
                precision: "day",
                start: "2026-01-01",
                end: "2026-01-01",
              },
            },
            scientificContext: publishableScientificContext,
            repository: publishableRepository,
          }}
          primaryAction={{
            kind: "publish",
            label: "Save & Publish",
            onPublish: noop,
          }}
        />
      </TooltipProvider>,
    );

    await screen.getByRole("tab", { name: "Physical description" }).click();
    await expect
      .element(screen.getByRole("combobox", { name: /existence status/i }))
      .toHaveTextContent("Exists");
    await expect
      .element(screen.getByRole("combobox", { name: /availability status/i }))
      .toHaveTextContent("Available");
    await expect
      .element(screen.getByRole("button", { name: "Save & Publish" }))
      .toBeEnabled();
  });

  it("should narrow the availability status to the only one an existence status allows", async () => {
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(noop)} />,
    );

    await screen.getByRole("tab", { name: "Physical description" }).click();
    await screen.getByRole("combobox", { name: /existence status/i }).click();
    await screen.getByRole("option", { name: "Consumed", exact: true }).click();

    const availability = screen.getByRole("combobox", {
      name: /availability status/i,
    });
    await expect.element(availability).toHaveTextContent("Not available");
    await availability.click();
    await expect
      .element(screen.getByRole("option", { name: "Not available" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("option", { name: "Available", exact: true }))
      .not.toBeInTheDocument();
  });

  it("should render a link action as an anchor to the public page", async () => {
    const screen = await render(
      <SampleForm
        onCancel={noop}
        defaultValues={{
          name: "Basalte du Massif Central",
          nature: "thin_section",
          type: null,
          material: "fossil",
          collectionMethod: null,
          collectionMethodDescription: null,
        }}
        secondaryAction={{
          kind: "submit",
          label: "Publish updates",
          onSubmit: noop,
        }}
        primaryAction={{
          kind: "link",
          label: "View public page",
          href: "https://example.test/samples/IGSN123",
        }}
      />,
    );

    await expect
      .element(screen.getByRole("link", { name: "View public page" }))
      .toHaveAttribute("href", "https://example.test/samples/IGSN123");
  });

  it.each([
    ["a synthetic material", "synthetic_rock_mineral"],
    ["a returned sample", "extraterrestrial_rock.returned_samples.other"],
  ])("should hide the Location tab for %s", async (_case, material) => {
    const screen = await render(
      <SampleForm
        onCancel={noop}
        defaultValues={{
          name: "Synthetic corundum",
          nature: "thin_section",
          type: "dredge",
          material,
          collectionMethod: null,
          collectionMethodDescription: null,
        }}
        primaryAction={createAction(noop)}
      />,
    );

    await expect
      .element(screen.getByRole("tab", { name: "Physical description" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("tab", { name: "Location" }))
      .not.toBeInTheDocument();
  });

  it("should head the classification and scientific context tabs with a section heading", async () => {
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(noop)} />,
    );

    await expect
      .element(screen.getByRole("heading", { name: "Sample classification" }))
      .toBeVisible();

    await screen.getByRole("tab", { name: "Scientific context" }).click();
    await expect
      .element(screen.getByRole("heading", { name: "Scientific context" }))
      .toBeVisible();
  });

  it("should nest the numeric and stratigraphic age headings under Age", async () => {
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(noop)} />,
    );

    await screen.getByRole("tab", { name: "Physical description" }).click();
    await expect
      .element(screen.getByRole("heading", { level: 2, name: "Age" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("heading", { level: 3, name: "Numeric age" }))
      .toBeVisible();
    await expect
      .element(
        screen.getByRole("heading", {
          level: 3,
          name: "Stratigraphic time scale age",
        }),
      )
      .toBeVisible();
  });

  it("should show the Location tab with no material chosen", async () => {
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(noop)} />,
    );

    await screen.getByRole("tab", { name: "Location" }).click();
    await expect
      .element(screen.getByRole("combobox", { name: "Type *", exact: true }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("heading", { name: "Geological context" }))
      .toBeVisible();
  });

  it.each([
    ["field_sample", "Type *"],
    ["collection_specimen", "Type"],
  ] as const)(
    "marks the location type required to publish under %s as %s",
    async (provenanceStatus, name) => {
      const screen = await render(
        <SampleForm
          onCancel={noop}
          defaultValues={{
            name: "Basalte du Massif Central",
            nature: "thin_section",
            type: "dredge",
            material: "fossil",
            collectionMethod: null,
            collectionMethodDescription: null,
            scientificContext: { provenanceStatus },
          }}
          primaryAction={createAction(noop)}
        />,
      );

      await screen.getByRole("tab", { name: "Location" }).click();
      await expect
        .element(screen.getByRole("combobox", { name, exact: true }))
        .toBeVisible();
    },
  );

  it("should hide the Location tab once the material refuses it", async () => {
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(noop)} />,
    );

    await screen.getByRole("tab", { name: "Sample type" }).click();
    await screen
      .getByRole("combobox", { name: "Material *", exact: true })
      .click();
    await screen
      .getByRole("option", { name: "Synthetic rock / mineral" })
      .click();

    await expect
      .element(screen.getByRole("tab", { name: "Location" }))
      .not.toBeInTheDocument();
  });

  it("should submit a point location entered on the Location tab", async () => {
    const onSubmit = vi.fn();
    const screen = await renderLocation("Point", onSubmit);
    await screen.getByLabelText("Longitude *").fill("3.5");
    await screen.getByLabelText("Latitude *").fill("-45");
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          location: {
            position: { type: "point", longitude: 3.5, latitude: -45 },
          },
        }),
      ),
    );
  });

  it("should save a draft vertical position without its reference or system (publish-only)", async () => {
    const onSubmit = vi.fn();
    const screen = await renderLocation("Point", onSubmit);
    await screen.getByLabelText("Longitude *").fill("3");
    await screen.getByLabelText("Latitude *").fill("45");
    await screen.getByLabelText("Vertical position").fill("1200");

    await expect
      .element(screen.getByLabelText("Vertical reference *"))
      .toBeVisible();
    await expect
      .element(screen.getByLabelText("Vertical reference system"))
      .toBeVisible();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          location: {
            position: {
              type: "point",
              longitude: 3,
              latitude: 45,
              vertical: { position: 1200 },
            },
          },
        }),
      ),
    );
  });

  it("should include the vertical reference and system once selected", async () => {
    const onSubmit = vi.fn();
    const screen = await renderLocation("Point", onSubmit);
    await screen.getByLabelText("Longitude *").fill("3");
    await screen.getByLabelText("Latitude *").fill("45");
    await fillVertical(screen);
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          location: {
            position: {
              type: "point",
              longitude: 3,
              latitude: 45,
              vertical: {
                position: 100,
                reference: "bathymetry",
                system: "msl",
              },
            },
          },
        }),
      ),
    );
  });

  it("should show a field error when a value the schema rejects is submitted", async () => {
    const onSubmit = vi.fn();
    const screen = await renderLocation("Point", onSubmit);
    await screen.getByLabelText("Longitude *").fill("200");
    await screen.getByLabelText("Latitude *").fill("45");
    await screen.getByRole("button", { name: "Create" }).click();

    expect(onSubmit).not.toHaveBeenCalled();
    await expect
      .element(screen.getByText("Longitude must be between -180 and 180."))
      .toBeVisible();

    await screen.getByLabelText("Longitude *").fill("20");
    await expect
      .element(screen.getByText("Longitude must be between -180 and 180."))
      .not.toBeInTheDocument();
    await screen.getByRole("button", { name: "Create" }).click();
    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          location: {
            position: { type: "point", longitude: 20, latitude: 45 },
          },
        }),
      ),
    );
  });

  it("should name the axis and its range on an out-of-range latitude", async () => {
    const screen = await renderLocation("Point");
    await screen.getByLabelText("Latitude *").fill("200");

    await expect
      .element(screen.getByText("Latitude must be between -90 and 90."))
      .toBeVisible();
    expect(screen.getByText("Invalid value.").elements()).toEqual([]);
    expect(
      screen.getByText("Longitude must be between -180 and 180.").elements(),
    ).toEqual([]);
  });

  it("should accept the coordinate bounds and a decimal degree", async () => {
    const onSubmit = vi.fn();
    const screen = await renderLocation("Point", onSubmit);
    for (const [longitude, latitude] of [
      ["-180", "-90"],
      ["180", "90"],
      ["-2.352222", "48.856614"],
    ] as const) {
      await screen.getByLabelText("Longitude *").fill(longitude);
      await screen.getByLabelText("Latitude *").fill(latitude);
      expect(
        screen.getByText("Latitude must be between -90 and 90.").elements(),
      ).toEqual([]);
      expect(
        screen.getByText("Longitude must be between -180 and 180.").elements(),
      ).toEqual([]);
    }
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          location: {
            position: {
              type: "point",
              longitude: -2.352222,
              latitude: 48.856614,
            },
          },
        }),
      ),
    );
  });

  it.each([
    ["Point", 1],
    ["Polygon", 2],
    ["Line", 2],
  ])(
    "should hint the coordinate format on every %s coordinate input",
    async (locationType, perAxis) => {
      const screen = await render(
        <SampleForm
          onCancel={noop}
          defaultValues={{
            name: "Basalte du Massif Central",
            nature: "thin_section",
            type: "dredge",
            material: "fossil",
            collectionMethod: null,
            collectionMethodDescription: null,
          }}
          primaryAction={createAction(noop)}
        />,
      );

      await screen.getByRole("tab", { name: "Location" }).click();
      await screen
        .getByRole("combobox", { name: "Type *", exact: true })
        .click();
      await screen.getByRole("option", { name: locationType }).click();

      await vi.waitFor(() => {
        expect(
          screen
            .getByText(/Decimal degrees, WGS 84, e\.g\. -2\.352222\./)
            .elements(),
        ).toHaveLength(perAxis);
        expect(
          screen
            .getByText(/Decimal degrees, WGS 84, e\.g\. -48\.856614\./)
            .elements(),
        ).toHaveLength(perAxis);
      });
    },
  );

  it("should reject an incomplete point instead of silently dropping it", async () => {
    const onSubmit = vi.fn();
    const screen = await renderLocation("Point", onSubmit);
    await screen.getByLabelText("Longitude *").fill("3");
    await screen.getByRole("button", { name: "Create" }).click();

    expect(onSubmit).not.toHaveBeenCalled();
    await expect.element(screen.getByText("Invalid value.")).toBeVisible();
  });

  it("should accept a decimal vertical position", async () => {
    const onSubmit = vi.fn();
    const screen = await renderLocation("Point", onSubmit);
    await screen.getByLabelText("Longitude *").fill("3");
    await screen.getByLabelText("Latitude *").fill("45");
    await screen.getByLabelText("Vertical position").fill("12.5");
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          location: {
            position: {
              type: "point",
              longitude: 3,
              latitude: 45,
              vertical: { position: 12.5 },
            },
          },
        }),
      ),
    );
  });

  it("should mark the other bound required but still save a half-range draft", async () => {
    const onSubmit = vi.fn();
    const screen = await renderLocation("Polygon", onSubmit);
    await screen.getByLabelText("West longitude *").fill("5");
    await screen.getByLabelText("East longitude *").fill("8");
    await screen.getByLabelText("South latitude *").fill("44");
    await screen.getByLabelText("North latitude *").fill("46");

    await expect
      .element(screen.getByLabelText("Maximum vertical position"))
      .toBeVisible();
    await screen.getByLabelText("Minimum vertical position").fill("200");

    await expect
      .element(screen.getByLabelText("Maximum vertical position *"))
      .toBeVisible();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          location: {
            position: {
              type: "area",
              westLongitude: 5,
              eastLongitude: 8,
              southLatitude: 44,
              northLatitude: 46,
              vertical: { min: 200 },
            },
          },
        }),
      ),
    );
  });

  it("should submit a line with both endpoints, both vertical positions, a reference and a system", async () => {
    const onSubmit = vi.fn();
    const screen = await renderLocation("Line", onSubmit);
    await screen.getByLabelText("Start longitude *").fill("3");
    await screen.getByLabelText("Start latitude *").fill("45");
    await screen.getByLabelText("End longitude *").fill("4");
    await screen.getByLabelText("End latitude *").fill("46");
    await screen.getByLabelText("Start vertical position").fill("10");
    await screen.getByLabelText("End vertical position").fill("90");
    await screen
      .getByRole("combobox", { name: "Vertical reference *" })
      .click();
    await screen.getByRole("option", { name: "Core depth" }).click();
    await screen
      .getByRole("combobox", { name: "Vertical reference system" })
      .click();
    await screen.getByRole("option", { name: MSL_SYSTEM }).click();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          location: {
            position: {
              type: "line",
              startLongitude: 3,
              startLatitude: 45,
              endLongitude: 4,
              endLatitude: 46,
              vertical: {
                start: 10,
                end: 90,
                reference: "core_depth",
                system: "msl",
              },
            },
          },
        }),
      ),
    );
  });

  it("should mark the other line vertical position required once one is filled", async () => {
    const screen = await renderLocation("Line");
    await screen.getByLabelText("Start vertical position").fill("10");

    await expect
      .element(screen.getByLabelText("End vertical position *"))
      .toBeVisible();
    await expect
      .element(screen.getByLabelText("Start vertical position"))
      .toBeVisible();
  });

  it("should show the reference and system only once a vertical position is entered", async () => {
    const screen = await renderLocation("Point");

    await expect
      .element(screen.getByRole("combobox", { name: "Vertical reference" }))
      .not.toBeInTheDocument();

    await fillVertical(screen);

    await screen.getByLabelText("Vertical position").fill("");
    await expect
      .element(screen.getByRole("combobox", { name: "Vertical reference *" }))
      .toHaveTextContent("Bathymetry");
    await expect
      .element(
        screen.getByRole("combobox", { name: "Vertical reference system" }),
      )
      .toHaveTextContent(MSL_SYSTEM);

    await screen.getByLabelText("Vertical position").fill("100");
    await expect
      .element(screen.getByRole("combobox", { name: "Vertical reference *" }))
      .toHaveTextContent("Bathymetry");
  });

  it("should keep the vertical reference and system when the location type changes", async () => {
    const screen = await renderLocation("Point");
    await fillVertical(screen);

    for (const type of ["Polygon", "Line", "Point"]) {
      await screen
        .getByRole("combobox", { name: "Type *", exact: true })
        .click();
      await screen.getByRole("option", { name: type }).click();
      await expect
        .element(screen.getByRole("combobox", { name: "Vertical reference *" }))
        .toHaveTextContent("Bathymetry");
      await expect
        .element(
          screen.getByRole("combobox", { name: "Vertical reference system" }),
        )
        .toHaveTextContent(MSL_SYSTEM);
    }
  });

  it("should clear values the save dropped, keeping only what was submitted", async () => {
    const onSubmit = vi.fn();
    const screen = await renderLocation("Point", onSubmit);
    await screen.getByLabelText("Longitude *").fill("3");
    await screen.getByLabelText("Latitude *").fill("45");
    await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
    await screen.getByRole("option", { name: "Polygon" }).click();
    await screen.getByLabelText("West longitude *").fill("5");
    await screen.getByLabelText("East longitude *").fill("8");
    await screen.getByLabelText("South latitude *").fill("44");
    await screen.getByLabelText("North latitude *").fill("46");
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          location: {
            position: {
              type: "area",
              westLongitude: 5,
              eastLongitude: 8,
              southLatitude: 44,
              northLatitude: 46,
            },
          },
        }),
      ),
    );

    await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
    await screen.getByRole("option", { name: "Point" }).click();
    await expect
      .element(screen.getByLabelText("Longitude *"))
      .toHaveValue(null);
    await expect.element(screen.getByLabelText("Latitude *")).toHaveValue(null);
  });

  it("should gate a published sample's save when an editable required field is cleared", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          status="published"
          defaultValues={publishedFixture}
          primaryAction={{ kind: "submit", label: "Publish updates", onSubmit }}
        />
      </TooltipProvider>,
    );

    const save = screen.getByRole("button", { name: "Publish updates" });
    await expect.element(save).toBeEnabled();

    await screen.getByRole("tab", { name: "Physical description" }).click();
    await screen.getByRole("combobox", { name: /existence status/i }).click();
    await screen.getByRole("option", { name: "Exists", exact: true }).click();

    await expect.element(save).toBeDisabled();
    save.element().closest<HTMLElement>("[tabindex]")?.focus();
    await expect
      .element(screen.getByRole("tooltip"))
      .toHaveTextContent(/whether the sample still exists/i);

    await screen.getByRole("combobox", { name: /existence status/i }).click();
    await screen.getByRole("option", { name: "Exists", exact: true }).click();

    await expect.element(save).toBeEnabled();
    await save.click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Basalte du Massif Central",
          type: "dredge",
          material: "rock.igneous.plutonic.felsic.granite",
          existenceStatus: "exists",
          availabilityStatus: "available",
        }),
      ),
    );
  });

  it("blocks saving a published sample that no longer holds the publishable bar", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          status="published"
          defaultValues={{ ...publishedFixture, material: "rock" }}
          primaryAction={{ kind: "submit", label: "Publish updates", onSubmit }}
        />
      </TooltipProvider>,
    );

    const save = screen.getByRole("button", { name: "Publish updates" });
    await expect.element(save).toBeDisabled();
    save.element().closest<HTMLElement>("[tabindex]")?.focus();
    await expect
      .element(screen.getByRole("tooltip"))
      .toHaveTextContent(/classify the material down to a specific type/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("should show navigation type only after a geometry is chosen", async () => {
    const screen = await render(
      <SampleForm
        onCancel={noop}
        defaultValues={{
          name: "Basalte du Massif Central",
          nature: "thin_section",
          type: "dredge",
          material: "fossil",
          collectionMethod: null,
          collectionMethodDescription: null,
        }}
        primaryAction={createAction(noop)}
      />,
    );

    await screen.getByRole("tab", { name: "Location" }).click();
    await expect
      .element(screen.getByRole("combobox", { name: "Navigation type" }))
      .not.toBeInTheDocument();

    await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
    await screen.getByRole("option", { name: "Point" }).click();

    await expect
      .element(screen.getByRole("combobox", { name: "Navigation type" }))
      .toBeVisible();
  });

  it("should chip the attached manual group and offer the others", async () => {
    const screen = await render(
      <SampleForm
        onCancel={noop}
        manualGroupOptions={MANUAL_GROUPS}
        defaultValues={{
          name: "Basalte du Massif Central",
          nature: "thin_section",
          type: null,
          material: null,
          manualGroupIds: [FOSSIL_TEAM.id],
        }}
        primaryAction={createAction(noop)}
      />,
    );

    await expect
      .element(screen.getByRole("button", { name: "Detach Fossil team" }))
      .toBeVisible();

    await screen
      .getByRole("combobox", { name: "Groups this sample belongs to" })
      .click();

    await expect
      .element(screen.getByRole("option", { name: "Basalt team" }))
      .toBeVisible();
  });
});

const publishedFixture: CreateSample = {
  name: "Basalte du Massif Central",
  nature: "thin_section",
  type: "dredge",
  material: "rock.igneous.plutonic.felsic.granite",
  collectionMethod: null,
  collectionMethodDescription: null,
  specificName: "MC-2026-007",
  location: { position: { type: "point", longitude: 3, latitude: 45 } },
  description: {
    collectionDate: {
      precision: "day",
      start: "2026-01-01",
      end: "2026-01-01",
    },
  },
  existenceStatus: "exists",
  availabilityStatus: "available",
  scientificContext: publishableScientificContext,
  repository: publishableRepository,
};

const publishedFieldSampleFixture: CreateSample = {
  ...publishedFixture,
  location: {
    position: {
      type: "point",
      longitude: 3,
      latitude: 45,
      vertical: { position: 800, reference: "bathymetry", system: "msl" },
    },
    region: { kind: "continent", country: "FR" },
    localityName: "Massif Central",
  },
  scientificContext: {
    provenanceStatus: "field_sample",
    funderOrganizations: ["03fd77x13"],
    researchProgramName: "GEOSAMPLE",
    chiefScientist: "Marie Tharp",
    chiefScientistOrcid: "0000-0002-1825-0097",
    hostInstitution: ["02cte4b68"],
    collectorName: "Alfred Wegener",
  },
};

describe("SampleForm post-publication field lock", () => {
  function renderPublished(
    currentUser?: ComponentProps<typeof SampleForm>["currentUser"],
  ) {
    return render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          status="published"
          currentUser={currentUser}
          defaultValues={publishedFixture}
          primaryAction={{ kind: "submit", label: "Save", onSubmit: noop }}
        />
      </TooltipProvider>,
    );
  }

  it("disables the identity fields on a published sample", async () => {
    const screen = await renderPublished();

    await expect.element(screen.getByLabelText(/name/i)).toBeDisabled();
    await expect
      .element(screen.getByRole("combobox", { name: "Type *", exact: true }))
      .toBeDisabled();
    await expect
      .element(screen.getByRole("combobox", { name: "Nature" }))
      .toBeDisabled();
  });

  it("keeps the identity fields editable for a super admin on a published sample", async () => {
    const screen = await renderPublished({
      status: "accepted",
      superAdmin: true,
    });

    await expect.element(screen.getByLabelText(/name/i)).toBeEnabled();
    await expect
      .element(screen.getByRole("combobox", { name: "Type *", exact: true }))
      .toBeEnabled();
    await expect
      .element(screen.getByRole("combobox", { name: "Nature" }))
      .toBeEnabled();
  });

  it("keeps editable fields interactive on a published sample", async () => {
    const screen = await renderPublished();

    await expect
      .element(screen.getByRole("combobox", { name: "Collection Method" }))
      .toBeEnabled();

    await screen.getByRole("tab", { name: "Sample type" }).click();
    await expect.element(screen.getByLabelText("Specific Name")).toBeEnabled();
    await expect
      .element(
        screen.getByRole("combobox", { name: "Material *", exact: true }),
      )
      .toBeDisabled();
  });

  it.each<{
    name: string;
    status: SampleStatus;
    material: string;
    disabled: string[];
    enabled: string[];
  }>([
    {
      name: "locks the material levels down to the frozen prefix and opens the rest",
      status: "published",
      material: "rock.igneous.plutonic.felsic.granite",
      disabled: ["Material *", "Rock *", "Igneous *", "Plutonic *"],
      enabled: ["Felsic *"],
    },
    {
      name: "opens the next level of a published sample stopped at an unlocked node",
      status: "published",
      material: "sediment.exogenous_detritic",
      disabled: ["Material *", "Sediment *"],
      enabled: ["Exogenous detritic *"],
    },
    {
      name: "locks every material level when nothing in the path unlocks",
      status: "published",
      material: "rock.igneous.plutonic",
      disabled: ["Material *", "Rock *", "Igneous *", "Plutonic *"],
      enabled: [],
    },
    {
      name: "locks a withdrawn sample's material levels like a published one",
      status: "withdrawn",
      material: "rock.igneous.plutonic.felsic.granite",
      disabled: ["Material *", "Rock *", "Igneous *", "Plutonic *"],
      enabled: ["Felsic *"],
    },
    {
      name: "keeps every material level editable on a draft",
      status: "draft",
      material: "rock.igneous.plutonic.felsic.granite",
      disabled: [],
      enabled: ["Material *", "Rock *", "Igneous *", "Plutonic *", "Felsic *"],
    },
  ])("$name", async ({ status, material, disabled, enabled }) => {
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          status={status}
          defaultValues={{ ...publishedFixture, material }}
          primaryAction={{ kind: "submit", label: "Save", onSubmit: noop }}
        />
      </TooltipProvider>,
    );

    await screen.getByRole("tab", { name: "Sample type" }).click();
    for (const level of disabled) {
      await expect
        .element(screen.getByRole("combobox", { name: level, exact: true }))
        .toBeDisabled();
    }
    for (const level of enabled) {
      await expect
        .element(screen.getByRole("combobox", { name: level, exact: true }))
        .toBeEnabled();
    }
  });

  it("saves a material refined at the open level of a published sample", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          status="published"
          defaultValues={publishedFixture}
          primaryAction={{ kind: "submit", label: "Publish updates", onSubmit }}
        />
      </TooltipProvider>,
    );

    await screen.getByRole("tab", { name: "Sample type" }).click();
    await screen
      .getByRole("combobox", { name: "Felsic *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Granodiorite" }).click();

    const save = screen.getByRole("button", { name: "Publish updates" });
    await expect.element(save).toBeEnabled();
    await save.click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          material: "rock.igneous.plutonic.felsic.granodiorite",
        }),
      ),
    );
  });

  it("gates the save when the open material level is cleared", async () => {
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          status="published"
          defaultValues={publishedFixture}
          primaryAction={{
            kind: "submit",
            label: "Publish updates",
            onSubmit: noop,
          }}
        />
      </TooltipProvider>,
    );

    await screen.getByRole("tab", { name: "Sample type" }).click();
    await screen
      .getByRole("combobox", { name: "Felsic *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Granite" }).click();

    const save = screen.getByRole("button", { name: "Publish updates" });
    await expect.element(save).toBeDisabled();
    save.element().closest<HTMLElement>("[tabindex]")?.focus();
    await expect
      .element(screen.getByRole("tooltip"))
      .toHaveTextContent(/classify the material down to a specific type/i);
  });

  it("freezes the collection date, location coordinates and geological context on a published sample", async () => {
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          status="published"
          defaultValues={publishedFixture}
          primaryAction={{ kind: "submit", label: "Save", onSubmit: noop }}
        />
      </TooltipProvider>,
    );

    await screen.getByRole("tab", { name: "Physical description" }).click();
    await expect
      .element(screen.getByLabelText("Date *", { exact: true }))
      .toBeDisabled();
    await expect
      .element(screen.getByRole("switch", { name: "Date range" }))
      .toBeDisabled();
    await expect
      .element(screen.getByRole("combobox", { name: /existence status/i }))
      .toBeEnabled();

    await screen.getByRole("tab", { name: "Location" }).click();
    await expect.element(screen.getByLabelText(/longitude/i)).toBeDisabled();
    await expect.element(screen.getByLabelText(/latitude/i)).toBeDisabled();
    await expect
      .element(screen.getByText(/Decimal degrees, WGS 84, e\.g\. -2\.352222\./))
      .toBeVisible();
    await expect
      .element(screen.getByLabelText("Geological context description"))
      .toBeDisabled();
    await expect
      .element(screen.getByRole("combobox", { name: "Environment" }))
      .toBeDisabled();
  });

  it("freezes the provenance status and branch identity fields on a published sample", async () => {
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          status="published"
          defaultValues={publishedFixture}
          primaryAction={{ kind: "submit", label: "Save", onSubmit: noop }}
        />
      </TooltipProvider>,
    );

    await screen.getByRole("tab", { name: "Scientific context" }).click();
    await expect
      .element(screen.getByRole("combobox", { name: "Provenance status *" }))
      .toBeDisabled();
    await expect
      .element(screen.getByLabelText(/name of the collection curator/i))
      .toBeDisabled();
    await expect
      .element(screen.getByRole("combobox", { name: "Collection origin *" }))
      .toBeDisabled();
  });

  it("submits the frozen field values unchanged from a published sample", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          status="published"
          defaultValues={publishedFixture}
          primaryAction={{ kind: "submit", label: "Save", onSubmit }}
        />
      </TooltipProvider>,
    );

    await screen.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Basalte du Massif Central",
          nature: "thin_section",
          type: "dredge",
          material: "rock.igneous.plutonic.felsic.granite",
        }),
      ),
    );
  });

  it("disables nothing on a draft", async () => {
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          defaultValues={publishedFixture}
          primaryAction={{ kind: "submit", label: "Save", onSubmit: noop }}
        />
      </TooltipProvider>,
    );

    await expect.element(screen.getByLabelText(/name/i)).toBeEnabled();
    await expect
      .element(screen.getByRole("combobox", { name: "Type *", exact: true }))
      .toBeEnabled();
  });

  it("keeps the texture editable on a published igneous sample", async () => {
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          status="published"
          defaultValues={{
            ...publishedFixture,
            material: "rock.igneous.plutonic",
            texture: "phaneritic",
          }}
          primaryAction={{ kind: "submit", label: "Save", onSubmit: noop }}
        />
      </TooltipProvider>,
    );

    await screen.getByRole("tab", { name: "Sample type" }).click();
    await expect
      .element(screen.getByRole("combobox", { name: "Texture" }))
      .toBeEnabled();
    await expect
      .element(
        screen.getByRole("combobox", { name: "Material *", exact: true }),
      )
      .toBeDisabled();
  });

  it("keeps the metamorphic facies editable on a published metamorphic sample", async () => {
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          status="published"
          defaultValues={{
            ...publishedFixture,
            material: "rock.metamorphic.strongly_metamorphosed.gneiss",
            metamorphicFacies: "eclogite",
          }}
          primaryAction={{ kind: "submit", label: "Save", onSubmit: noop }}
        />
      </TooltipProvider>,
    );

    await screen.getByRole("tab", { name: "Sample type" }).click();
    await expect
      .element(screen.getByRole("combobox", { name: "Metamorphic facies *" }))
      .toBeEnabled();
    await expect
      .element(
        screen.getByRole("combobox", { name: "Material *", exact: true }),
      )
      .toBeDisabled();
  });

  it("freezes the field-sample branch fields on a published sample", async () => {
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          status="published"
          defaultValues={publishedFieldSampleFixture}
          primaryAction={{ kind: "submit", label: "Save", onSubmit: noop }}
        />
      </TooltipProvider>,
    );

    await screen.getByRole("tab", { name: "Scientific context" }).click();
    await expect
      .element(screen.getByRole("combobox", { name: "Provenance status *" }))
      .toBeDisabled();
    await expect
      .element(screen.getByRole("combobox", { name: "Funder organizations *" }))
      .toBeDisabled();
    await expect
      .element(screen.getByLabelText("Name of the research programme *"))
      .toBeDisabled();
    await expect
      .element(screen.getByLabelText("Chief scientist / Project leader *"))
      .toBeDisabled();
    await expect
      .element(screen.getByLabelText("Chief scientist ORCID"))
      .toBeEnabled();
    await expect
      .element(screen.getByLabelText("Collector name *"))
      .toBeDisabled();
    await expect
      .element(
        screen.getByRole("combobox", {
          name: "Host institution (project leader) *",
        }),
      )
      .toBeDisabled();
    await expect
      .element(screen.getByLabelText("Collector ORCID"))
      .toBeDisabled();
    await expect
      .element(screen.getByLabelText("Research campaign"))
      .toBeEnabled();
  });

  it("freezes the region but not the locality or vertical position on a published sample", async () => {
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          status="published"
          defaultValues={publishedFieldSampleFixture}
          primaryAction={{ kind: "submit", label: "Save", onSubmit: noop }}
        />
      </TooltipProvider>,
    );

    await expect
      .element(screen.getByRole("combobox", { name: "Collection Method" }))
      .toBeEnabled();

    await screen.getByRole("tab", { name: "Location" }).click();
    await expect
      .element(screen.getByRole("combobox", { name: "Region kind" }))
      .toBeDisabled();
    await expect
      .element(screen.getByRole("combobox", { name: "Country" }))
      .toBeDisabled();
    await expect.element(screen.getByLabelText("Locality name")).toBeEnabled();
    await expect
      .element(screen.getByLabelText("Vertical position"))
      .toBeEnabled();
    await expect
      .element(screen.getByRole("combobox", { name: "Vertical reference *" }))
      .toBeEnabled();

    await screen.getByRole("tab", { name: "Physical description" }).click();
    await expect
      .element(screen.getByRole("combobox", { name: /existence status/i }))
      .toBeEnabled();
  });

  it("should freeze the manual groups on a published sample", async () => {
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          status="published"
          manualGroupOptions={MANUAL_GROUPS}
          defaultValues={{
            ...publishedFixture,
            manualGroupIds: [BASALT_TEAM.id],
          }}
          primaryAction={{ kind: "submit", label: "Save", onSubmit: noop }}
        />
      </TooltipProvider>,
    );

    await expect
      .element(
        screen.getByRole("combobox", { name: "Groups this sample belongs to" }),
      )
      .toBeDisabled();
    await expect
      .element(screen.getByRole("button", { name: "Detach Basalt team" }))
      .toBeDisabled();
    await expect
      .element(screen.getByText("You cannot change these groups."))
      .toBeVisible();
  });

  it("keeps the collector name editable on a published collection specimen", async () => {
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          status="published"
          defaultValues={publishedFixture}
          primaryAction={{ kind: "submit", label: "Save", onSubmit: noop }}
        />
      </TooltipProvider>,
    );

    await screen.getByRole("tab", { name: "Scientific context" }).click();
    await expect.element(screen.getByLabelText("Collector name")).toBeEnabled();
    await expect
      .element(screen.getByLabelText(/name of the collection curator/i))
      .toBeDisabled();
    await expect
      .element(screen.getByRole("combobox", { name: "Collection origin *" }))
      .toBeDisabled();
  });
});
