import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { TooltipProvider } from "@projet-igsn/design-system/components/ui/tooltip";
import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { SampleForm } from "./sample-form.tsx";

const noop = () => {};

const createAction = (onSubmit: (value: CreateSample) => void) =>
  ({ kind: "submit", label: "Create", onSubmit }) as const;

// A complete scientific context (historical branch: the fewest mandatory
// fields), for the fixtures that must be publishable.
const publishableScientificContext = {
  provenanceStatus: "historical_specimen",
  collectionCurator: "Georges Cuvier",
  collectionOrigin: "scientific_expedition",
} as const;

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
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: "core.section",
        material: null,
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: null,
        location: null,
        availability: "exists",
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
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: "dredge",
        material: null,
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: null,
        location: null,
        availability: "exists",
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
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: "core.half_round",
        material: null,
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: null,
        location: null,
        availability: "exists",
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
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: "core",
        material: null,
        specificName: null,
        collectionMethod: null,
        collectionMethodDescription: null,
        location: null,
        availability: "exists",
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
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: "dredge",
        material: null,
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: null,
        location: null,
        availability: "exists",
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
        name: "Basalt",
        nature: "thin_section",
        type: null,
        material: "rock.igneous",
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: null,
        location: null,
        availability: "exists",
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
        name: "Granite",
        nature: "thin_section",
        type: null,
        material: "rock.igneous.plutonic.felsic.granite",
        texture: "phaneritic",
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: null,
        location: null,
        availability: "exists",
      }),
    );
  });

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
        name: "Granite",
        nature: "thin_section",
        type: null,
        material: "rock.igneous.plutonic.felsic.granite",
        texture: "phaneritic",
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: null,
        location: null,
        availability: "exists",
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
        name: "Rock",
        nature: "thin_section",
        type: null,
        material: "rock.igneous.volcanic",
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: null,
        location: null,
        availability: "exists",
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
        name: "Gneiss",
        nature: "thin_section",
        type: null,
        material: "rock.metamorphic.strongly_metamorphosed.gneiss",
        metamorphicFacies: "amphibolite",
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: null,
        location: null,
        availability: "exists",
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
        name: "Meta-granite",
        nature: "thin_section",
        type: null,
        material:
          "rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.plutonic.felsic.granite",
        metamorphicFacies: "amphibolite",
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: null,
        location: null,
        availability: "exists",
      }),
    );
  });

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
        name: "Rock",
        nature: "thin_section",
        type: null,
        material: "rock.igneous",
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: null,
        location: null,
        availability: "exists",
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
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: null,
        material: null,
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: "MC-2026-007",
        location: null,
        availability: "exists",
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
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: null,
        material: null,
        collectionMethod: "coring.gravity_corer.giant",
        collectionMethodDescription: null,
        specificName: null,
        location: null,
        availability: "exists",
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
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: null,
        material: null,
        collectionMethod: null,
        collectionMethodDescription:
          "Cored at low tide from the northern outcrop",
        specificName: null,
        location: null,
        availability: "exists",
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

    await screen.getByLabelText("Numeric age", { exact: true }).fill("12000");
    await screen.getByRole("combobox", { name: "Units" }).click();
    await screen.getByRole("option", { name: "a (years)" }).click();
    await screen.getByRole("combobox", { name: "Reference" }).click();
    await screen.getByRole("option", { name: "BP", exact: true }).click();
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
    // The unit is hidden without a value, and the domain rejects a unit that
    // has none, so a leftover would block the save from an invisible field.
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(onSubmit)} />,
    );

    await screen.getByLabelText(/^name/i).fill("Basalte du Massif Central");
    await screen.getByRole("combobox", { name: "Nature" }).click();
    await screen.getByText("Thin section").click();
    await screen.getByRole("tab", { name: "Physical description" }).click();
    await screen.getByRole("switch", { name: "Record a numeric age" }).click();

    await screen.getByLabelText("Numeric age", { exact: true }).fill("12000");
    await screen.getByRole("combobox", { name: "Units *" }).click();
    await screen.getByRole("option", { name: "Ma", exact: true }).click();
    // Switching mode clears the bounds, so the unit has nothing left to qualify.
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

    await screen.getByLabelText("Numeric age", { exact: true }).fill("120");
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
      .element(screen.getByLabelText("Numeric age", { exact: true }))
      .toBeInTheDocument();

    // The numeric block's Range radio is the first "Range (min / max)" option.
    await screen
      .getByRole("radio", { name: "Range (min / max)" })
      .first()
      .click();

    await expect
      .element(screen.getByLabelText("Numeric age", { exact: true }))
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
      .element(screen.getByLabelText("Numeric age", { exact: true }))
      .not.toBeInTheDocument();

    await screen.getByRole("switch", { name: "Record a numeric age" }).click();

    await expect
      .element(screen.getByLabelText("Numeric age", { exact: true }))
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

    await screen.getByLabelText("Numeric age", { exact: true }).fill("120");
    // Pick annum, choose a reference, then move the unit off annum: the (now
    // unmounted) reference must not be saved, or it would fail validation on a
    // field nobody can see.
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
      .element(screen.getByLabelText("Numeric age", { exact: true }))
      .toHaveValue(120);
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
            collectionDate: { start: "2026-01-01", end: "2026-01-01" },
          },
          availability: "exists",
          scientificContext: publishableScientificContext,
        }}
        secondaryAction={{ kind: "submit", label: "Save as draft", onSubmit }}
        primaryAction={{ kind: "publish", label: "Save & Publish", onPublish }}
      />,
    );

    await screen.getByRole("button", { name: "Save & Publish" }).click();
    await screen.getByRole("button", { name: "Confirm" }).click();

    await vi.waitFor(() =>
      expect(onPublish).toHaveBeenCalledWith({
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: "dredge",
        material: "fossil",
        collectionMethod: null,
        collectionMethodDescription: null,
        specificName: "MC-2026-007",
        location: { position: { type: "point", longitude: 3, latitude: 45 } },
        description: {
          collectionDate: { start: "2026-01-01", end: "2026-01-01" },
        },
        availability: "exists",
        scientificContext: publishableScientificContext,
      }),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("should disable Save & Publish and explain in a tooltip when the material is missing", async () => {
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          defaultValues={{
            name: "Basalte du Massif Central",
            nature: "thin_section",
            type: "dredge",
            material: null,
            collectionMethod: null,
            collectionMethodDescription: null,
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

    const publish = screen.getByRole("button", { name: "Save & Publish" });
    await expect.element(publish).toBeDisabled();

    // The disabled button is not focusable; its tooltip trigger (the wrapping
    // span) reveals the reason on focus, the way a keyboard user would find it.
    publish.element().parentElement?.focus();
    await expect
      .element(screen.getByRole("tooltip"))
      .toHaveTextContent(/set the material before publishing/i);
  });

  it("should disable Save & Publish and explain in a tooltip when the type is missing", async () => {
    const screen = await render(
      <TooltipProvider>
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

    const publish = screen.getByRole("button", { name: "Save & Publish" });
    await expect.element(publish).toBeDisabled();

    publish.element().parentElement?.focus();
    await expect
      .element(screen.getByRole("tooltip"))
      .toHaveTextContent(/set the sample type before publishing/i);
  });

  it("should disable Save & Publish and explain in a tooltip when the collection date is missing", async () => {
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

    const publish = screen.getByRole("button", { name: "Save & Publish" });
    await expect.element(publish).toBeDisabled();

    publish.element().parentElement?.focus();
    await expect
      .element(screen.getByRole("tooltip"))
      .toHaveTextContent(/set the collection date before publishing/i);
  });

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
              collectionDate: { start: "2026-01-01", end: "2026-01-01" },
            },
            availability: "exists",
            scientificContext: publishableScientificContext,
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

  it("should default availability to Exists and not block publish on it", async () => {
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
              collectionDate: { start: "2026-01-01", end: "2026-01-01" },
            },
            scientificContext: publishableScientificContext,
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
      .element(screen.getByRole("combobox", { name: /availability/i }))
      .toHaveTextContent("Exists");
    await expect
      .element(screen.getByRole("button", { name: "Save & Publish" }))
      .toBeEnabled();
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

  it("should hide the Location section for a synthetic material", async () => {
    const screen = await render(
      <SampleForm
        onCancel={noop}
        defaultValues={{
          name: "Synthetic corundum",
          nature: "thin_section",
          type: "dredge",
          material: "synthetic_rock_mineral",
          collectionMethod: null,
          collectionMethodDescription: null,
        }}
        primaryAction={createAction(noop)}
      />,
    );

    await screen.getByRole("tab", { name: "Physical description" }).click();

    await expect
      .element(screen.getByRole("heading", { name: "Description" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("heading", { name: "Location" }))
      .not.toBeInTheDocument();
  });

  it("should hide the Location section until the material determines its requirement", async () => {
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(noop)} />,
    );

    await screen.getByRole("tab", { name: "Physical description" }).click();
    await expect
      .element(screen.getByRole("heading", { name: "Description" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("heading", { name: "Location" }))
      .not.toBeInTheDocument();

    // The first material segment settles it (every rock completion requires
    // a location), so the section appears.
    await screen.getByRole("tab", { name: "Sample type" }).click();
    await screen
      .getByRole("combobox", { name: "Material *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Rock", exact: true }).click();
    await screen.getByRole("tab", { name: "Physical description" }).click();
    await expect
      .element(screen.getByRole("heading", { name: "Location" }))
      .toBeVisible();
  });

  it("should block publish and explain when a required location is missing", async () => {
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
          }}
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

    publish.element().parentElement?.focus();
    await expect
      .element(screen.getByRole("tooltip"))
      .toHaveTextContent(/set the sample location/i);
  });

  it("should submit a point location entered on the Location tab", async () => {
    const onSubmit = vi.fn();
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

    await screen.getByRole("tab", { name: "Physical description" }).click();
    await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
    await screen.getByRole("option", { name: "Point" }).click();
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

  it("should save a draft elevation without its unit or datum (publish-only)", async () => {
    const onSubmit = vi.fn();
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

    await screen.getByRole("tab", { name: "Physical description" }).click();
    await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
    await screen.getByRole("option", { name: "Point" }).click();
    await screen.getByLabelText("Longitude *").fill("3");
    await screen.getByLabelText("Latitude *").fill("45");
    // The label reads "Elevation" until a negative value flips it to "Bathymetry".
    await screen.getByLabelText("Elevation").fill("-1200");
    await expect
      .element(screen.getByLabelText("Bathymetry"))
      .toHaveValue(-1200);

    await expect.element(screen.getByLabelText("Unit *")).toBeVisible();
    await expect
      .element(screen.getByLabelText("Vertical datum *"))
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
              elevation: { min: -1200, max: -1200 },
            },
          },
        }),
      ),
    );
  });

  it("should include the elevation unit and datum once selected", async () => {
    const onSubmit = vi.fn();
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

    await screen.getByRole("tab", { name: "Physical description" }).click();
    await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
    await screen.getByRole("option", { name: "Point" }).click();
    await screen.getByLabelText("Longitude *").fill("3");
    await screen.getByLabelText("Latitude *").fill("45");
    await screen.getByLabelText("Elevation").fill("-1200");

    await screen.getByRole("combobox", { name: "Unit *" }).click();
    await screen.getByRole("option", { name: "m", exact: true }).click();
    await screen.getByRole("combobox", { name: "Vertical datum *" }).click();
    await screen.getByRole("option", { name: "Mean sea level" }).click();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          location: {
            position: {
              type: "point",
              longitude: 3,
              latitude: 45,
              elevation: { min: -1200, max: -1200, unit: "m", datum: "msl" },
            },
          },
        }),
      ),
    );
  });

  it("should show a field error when a value the schema rejects is submitted", async () => {
    const onSubmit = vi.fn();
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

    await screen.getByRole("tab", { name: "Physical description" }).click();
    await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
    await screen.getByRole("option", { name: "Point" }).click();
    // 200 is out of the longitude range; only the domain schema knows that.
    await screen.getByLabelText("Longitude *").fill("200");
    await screen.getByLabelText("Latitude *").fill("45");
    await screen.getByRole("button", { name: "Create" }).click();

    expect(onSubmit).not.toHaveBeenCalled();
    await expect.element(screen.getByText("Invalid value.")).toBeVisible();

    await screen.getByLabelText("Longitude *").fill("20");
    await expect
      .element(screen.getByText("Invalid value."))
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

  it("should reject an incomplete point instead of silently dropping it", async () => {
    const onSubmit = vi.fn();
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

    await screen.getByRole("tab", { name: "Physical description" }).click();
    await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
    await screen.getByRole("option", { name: "Point" }).click();
    await screen.getByLabelText("Longitude *").fill("3");
    await screen.getByRole("button", { name: "Create" }).click();

    expect(onSubmit).not.toHaveBeenCalled();
    await expect.element(screen.getByText("Invalid value.")).toBeVisible();
  });

  it("should reject a non-integer point elevation", async () => {
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

    await screen.getByRole("tab", { name: "Physical description" }).click();
    await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
    await screen.getByRole("option", { name: "Point" }).click();
    await screen.getByLabelText("Elevation").fill("12.5");

    await expect
      .element(screen.getByText("Enter a whole number for the elevation."))
      .toBeVisible();

    await screen.getByLabelText("Elevation").fill("12");
    await expect
      .element(screen.getByText("Enter a whole number for the elevation."))
      .not.toBeInTheDocument();
  });

  it("should reject a non-integer area elevation bound", async () => {
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

    await screen.getByRole("tab", { name: "Physical description" }).click();
    await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
    await screen.getByRole("option", { name: "Area" }).click();
    await screen.getByLabelText("Minimum elevation").fill("-200.5");

    await expect
      .element(screen.getByText("Enter a whole number for the elevation."))
      .toBeVisible();
  });

  it("should mark the other bound required but still save a half-range draft", async () => {
    const onSubmit = vi.fn();
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

    await screen.getByRole("tab", { name: "Physical description" }).click();
    await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
    await screen.getByRole("option", { name: "Area" }).click();
    await screen.getByLabelText("West longitude *").fill("5");
    await screen.getByLabelText("East longitude *").fill("8");
    await screen.getByLabelText("South latitude *").fill("44");
    await screen.getByLabelText("North latitude *").fill("46");

    await expect
      .element(screen.getByLabelText("Maximum elevation"))
      .toBeVisible();
    await screen.getByLabelText("Minimum elevation").fill("-200");

    await expect
      .element(screen.getByLabelText("Maximum elevation *"))
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
              elevation: { min: -200 },
            },
          },
        }),
      ),
    );
  });

  it("should not mark the location required for an exempt material", async () => {
    const screen = await render(
      <SampleForm
        onCancel={noop}
        defaultValues={{
          name: "Lunar regolith",
          nature: "thin_section",
          type: "dredge",
          // Returned extraterrestrial samples may omit an exact location.
          material: "extraterrestrial_rock.returned_samples.other",
          collectionMethod: null,
          collectionMethodDescription: null,
        }}
        primaryAction={createAction(noop)}
      />,
    );

    await screen.getByRole("tab", { name: "Physical description" }).click();
    await expect
      .element(screen.getByRole("combobox", { name: "Type", exact: true }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("combobox", { name: "Type *", exact: true }))
      .not.toBeInTheDocument();
  });

  it("should show unit and datum only once an elevation part is entered", async () => {
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

    await screen.getByRole("tab", { name: "Physical description" }).click();
    await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
    await screen.getByRole("option", { name: "Point" }).click();

    await expect
      .element(screen.getByRole("combobox", { name: "Unit", exact: true }))
      .not.toBeInTheDocument();

    await screen.getByLabelText("Elevation").fill("100");
    await screen.getByRole("combobox", { name: "Unit *" }).click();
    await screen.getByRole("option", { name: "m", exact: true }).click();
    await screen.getByRole("combobox", { name: "Vertical datum *" }).click();
    await screen.getByRole("option", { name: "Mean sea level" }).click();

    await screen.getByLabelText("Elevation").fill("");
    await expect
      .element(screen.getByRole("combobox", { name: "Unit *", exact: true }))
      .toHaveTextContent("m");
    await expect
      .element(screen.getByRole("combobox", { name: "Vertical datum *" }))
      .toHaveTextContent("Mean sea level");

    await screen.getByLabelText("Elevation").fill("100");
    await expect
      .element(screen.getByRole("combobox", { name: "Unit *", exact: true }))
      .toHaveTextContent("m");
  });

  it("should clear values the save dropped, keeping only what was submitted", async () => {
    const onSubmit = vi.fn();
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

    await screen.getByRole("tab", { name: "Physical description" }).click();
    await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
    await screen.getByRole("option", { name: "Point" }).click();
    await screen.getByLabelText("Longitude *").fill("3");
    await screen.getByLabelText("Latitude *").fill("45");
    await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
    await screen.getByRole("option", { name: "Area" }).click();
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
    // A published sample's frozen fields cannot be edited, so the save can only
    // be made unpublishable through an EDITABLE required field.
    const onSubmit = vi.fn();
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          published
          defaultValues={publishedFixture}
          primaryAction={{ kind: "submit", label: "Publish updates", onSubmit }}
        />
      </TooltipProvider>,
    );

    const save = screen.getByRole("button", { name: "Publish updates" });
    await expect.element(save).toBeEnabled();

    // Clear availability (re-picking the selected option deselects it).
    await screen.getByRole("tab", { name: "Physical description" }).click();
    await screen.getByRole("combobox", { name: /availability/i }).click();
    await screen.getByRole("option", { name: "Exists", exact: true }).click();

    await expect.element(save).toBeDisabled();
    save.element().parentElement?.focus();
    await expect
      .element(screen.getByRole("tooltip"))
      .toHaveTextContent(/whether the sample still exists/i);

    await screen.getByRole("combobox", { name: /availability/i }).click();
    await screen.getByRole("option", { name: "Exists", exact: true }).click();

    await expect.element(save).toBeEnabled();
    await save.click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Basalte du Massif Central",
          type: "dredge",
          material: "rock.igneous.plutonic.felsic.granite",
          availability: "exists",
        }),
      ),
    );
  });

  it("blocks saving a published sample that no longer holds the publishable bar", async () => {
    // A published sample must stay publishable, so a blocker gates the save
    // whatever field raises it, here an incomplete material ("rock", an
    // internal node) on a sample published before the constraint existed.
    const onSubmit = vi.fn();
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          published
          defaultValues={{ ...publishedFixture, material: "rock" }}
          primaryAction={{ kind: "submit", label: "Publish updates", onSubmit }}
        />
      </TooltipProvider>,
    );

    const save = screen.getByRole("button", { name: "Publish updates" });
    await expect.element(save).toBeDisabled();
    save.element().parentElement?.focus();
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

    await screen.getByRole("tab", { name: "Physical description" }).click();
    await expect
      .element(screen.getByRole("combobox", { name: "Navigation type" }))
      .not.toBeInTheDocument();

    await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
    await screen.getByRole("option", { name: "Point" }).click();

    await expect
      .element(screen.getByRole("combobox", { name: "Navigation type" }))
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
  description: { collectionDate: { start: "2026-01-01", end: "2026-01-01" } },
  availability: "exists",
  scientificContext: publishableScientificContext,
};

// The recent-collection branch freezes other leaves than the historical one, and
// carries a region the historical fixture has no reason to hold.
const publishedRecentFixture: CreateSample = {
  ...publishedFixture,
  location: {
    position: {
      type: "point",
      longitude: 3,
      latitude: 45,
      elevation: { min: 800, max: 800, unit: "m", datum: "msl" },
    },
    region: { kind: "continent", country: "FR" },
    localityName: "Massif Central",
  },
  scientificContext: {
    provenanceStatus: "recent_collection",
    funderOrganization: "03fd77x13",
    researchProgramName: "GEOSAMPLE",
    researchProgramChief: "Marie Tharp",
    researchProgramChiefOrcid: "0000-0002-1825-0097",
    researchStructure: ["02cte4b68"],
    collectorName: "Alfred Wegener",
  },
};

describe("SampleForm post-publication field lock", () => {
  it("disables the identity fields on a published sample", async () => {
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          published
          defaultValues={publishedFixture}
          primaryAction={{ kind: "submit", label: "Save", onSubmit: noop }}
        />
      </TooltipProvider>,
    );

    await expect.element(screen.getByLabelText(/name/i)).toBeDisabled();
    await expect
      .element(screen.getByRole("combobox", { name: "Type *", exact: true }))
      .toBeDisabled();
    await expect
      .element(screen.getByRole("combobox", { name: "Nature" }))
      .toBeDisabled();
  });

  it("keeps editable fields interactive on a published sample", async () => {
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          published
          defaultValues={publishedFixture}
          primaryAction={{ kind: "submit", label: "Save", onSubmit: noop }}
        />
      </TooltipProvider>,
    );

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

  it.each([
    {
      name: "locks the material levels down to the frozen prefix and opens the rest",
      published: true,
      material: "rock.igneous.plutonic.felsic.granite",
      disabled: ["Material *", "Rock *", "Igneous *", "Plutonic *"],
      enabled: ["Felsic *"],
    },
    {
      name: "opens the next level of a published sample stopped at an unlocked node",
      published: true,
      material: "sediment.exogenous_detritic",
      disabled: ["Material *", "Sediment *"],
      enabled: ["Exogenous detritic *"],
    },
    {
      name: "locks every material level when nothing in the path unlocks",
      published: true,
      material: "rock.igneous.plutonic",
      disabled: ["Material *", "Rock *", "Igneous *", "Plutonic *"],
      enabled: [],
    },
    {
      name: "keeps every material level editable on a draft",
      published: false,
      material: "rock.igneous.plutonic.felsic.granite",
      disabled: [],
      enabled: ["Material *", "Rock *", "Igneous *", "Plutonic *", "Felsic *"],
    },
  ])("$name", async ({ published, material, disabled, enabled }) => {
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          published={published}
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
          published
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
          published
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
    // Re-picking the selected option deselects it, leaving an incomplete path.
    await screen
      .getByRole("combobox", { name: "Felsic *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Granite" }).click();

    const save = screen.getByRole("button", { name: "Publish updates" });
    await expect.element(save).toBeDisabled();
    save.element().parentElement?.focus();
    await expect
      .element(screen.getByRole("tooltip"))
      .toHaveTextContent(/classify the material down to a specific type/i);
  });

  it("freezes the collection date and location coordinates on a published sample", async () => {
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          published
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
    await expect.element(screen.getByLabelText(/longitude/i)).toBeDisabled();
    await expect.element(screen.getByLabelText(/latitude/i)).toBeDisabled();
    await expect
      .element(screen.getByRole("combobox", { name: /availability/i }))
      .toBeEnabled();
  });

  it("freezes the provenance status and branch identity fields on a published sample", async () => {
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          published
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
          published
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
          published
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
          published
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

  it("freezes the recent-collection branch fields on a published sample", async () => {
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          published
          defaultValues={publishedRecentFixture}
          primaryAction={{ kind: "submit", label: "Save", onSubmit: noop }}
        />
      </TooltipProvider>,
    );

    await screen.getByRole("tab", { name: "Scientific context" }).click();
    await expect
      .element(screen.getByRole("combobox", { name: "Provenance status *" }))
      .toBeDisabled();
    await expect
      .element(screen.getByRole("combobox", { name: "Funder organization *" }))
      .toBeDisabled();
    await expect
      .element(screen.getByLabelText("Name of the research programme *"))
      .toBeDisabled();
    await expect
      .element(screen.getByLabelText("Research programme chief *"))
      .toBeDisabled();
    await expect
      .element(screen.getByLabelText("Research programme chief ORCID"))
      .toBeDisabled();
    await expect
      .element(screen.getByLabelText("Collector name *"))
      .toBeDisabled();
    await expect
      .element(
        screen.getByRole("combobox", {
          name: "Research structure of the programme chief *",
        }),
      )
      .toBeEnabled();
    await expect
      .element(screen.getByLabelText("Collector ORCID"))
      .toBeEnabled();
    await expect
      .element(screen.getByLabelText("Research campaign"))
      .toBeEnabled();
  });

  it("freezes the region but not the locality or elevation on a published sample", async () => {
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          published
          defaultValues={publishedRecentFixture}
          primaryAction={{ kind: "submit", label: "Save", onSubmit: noop }}
        />
      </TooltipProvider>,
    );

    await expect
      .element(screen.getByRole("combobox", { name: "Collection Method" }))
      .toBeEnabled();

    await screen.getByRole("tab", { name: "Physical description" }).click();
    await expect
      .element(screen.getByRole("combobox", { name: "Region kind" }))
      .toBeDisabled();
    await expect
      .element(screen.getByRole("combobox", { name: "Country" }))
      .toBeDisabled();
    await expect.element(screen.getByLabelText("Locality name")).toBeEnabled();
    await expect.element(screen.getByLabelText("Elevation")).toBeEnabled();
    await expect
      .element(screen.getByRole("combobox", { name: /availability/i }))
      .toBeEnabled();
  });

  it("keeps the collector name editable on a published historical specimen", async () => {
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          published
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
