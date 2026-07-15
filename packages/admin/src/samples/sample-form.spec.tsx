import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { TooltipProvider } from "@projet-igsn/design-system/components/ui/tooltip";
import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { SampleForm } from "./sample-form.tsx";

const noop = () => {};

const createAction = (onSubmit: (value: CreateSample) => void) =>
  ({ kind: "submit", label: "Create", onSubmit }) as const;

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
    // Leave the sub-type unset: "core" is a valid, if unrefined, draft. It only
    // blocks publication, not saving.
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

    // Texture is hidden until a plutonic/volcanic branch is chosen.
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

    // Pick a plutonic texture, then refine the branch deeper: it must survive
    // because it is still valid for the (still plutonic) refined path.
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

    // Pick a plutonic texture, then switch the branch: it must be dropped.
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

    await screen.getByRole("combobox", { name: "Metamorphic facies" }).click();
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

    await screen.getByRole("combobox", { name: "Metamorphic facies" }).click();
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

    // Pick a facies, then switch the rock away from metamorphic: it must be
    // dropped and the facies field hidden.
    await screen.getByRole("combobox", { name: "Metamorphic facies" }).click();
    await screen.getByRole("option", { name: "Amphibolite facies" }).click();

    await screen.getByRole("combobox", { name: "Rock *", exact: true }).click();
    await screen.getByRole("option", { name: "Igneous", exact: true }).click();

    await expect
      .element(screen.getByRole("combobox", { name: "Metamorphic facies" }))
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
      }),
    );
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
        // A leaf type and leaf material and a location (a point position) are
        // required to publish, so Save & Publish is enabled.
        defaultValues={{
          name: "Basalte du Massif Central",
          nature: "thin_section",
          type: "dredge",
          material: "fossil",
          collectionMethod: null,
          collectionMethodDescription: null,
          specificName: "MC-2026-007",
          location: { position: { type: "point", longitude: 3, latitude: 45 } },
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

  it("should hide the Location tab for a synthetic material", async () => {
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

    await expect
      .element(screen.getByRole("tab", { name: "Sample type" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("tab", { name: "Location" }))
      .not.toBeInTheDocument();
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

    await screen.getByRole("tab", { name: "Location" }).click();
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

  it("should require a unit and datum once an elevation is entered, even for a draft", async () => {
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

    await screen.getByRole("tab", { name: "Location" }).click();
    await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
    await screen.getByRole("option", { name: "Point" }).click();
    await screen.getByLabelText("Longitude *").fill("3");
    await screen.getByLabelText("Latitude *").fill("45");
    // The label reads "Elevation" until a negative value flips it to "Bathymetry".
    await screen.getByLabelText("Elevation").fill("-1200");
    await expect
      .element(screen.getByLabelText("Bathymetry"))
      .toHaveValue(-1200);

    // Entering a value marks unit and datum required, but the error stays hidden
    // until the user acts on the field.
    await expect.element(screen.getByLabelText("Unit *")).toBeVisible();
    await expect
      .element(screen.getByLabelText("Vertical datum *"))
      .toBeVisible();
    await expect
      .element(screen.getByText("Select a unit for the elevation."))
      .not.toBeInTheDocument();

    // Submitting is blocked and reveals the error (submit touches every field).
    await screen.getByRole("button", { name: "Create" }).click();
    expect(onSubmit).not.toHaveBeenCalled();
    await expect
      .element(screen.getByText("Select a unit for the elevation."))
      .toBeVisible();

    // Providing both clears the block and the elevation is submitted.
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

  it("should require the other bound once one area elevation bound is set", async () => {
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
    await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
    await screen.getByRole("option", { name: "Area" }).click();

    // Neither bound is marked required until one is entered.
    await expect
      .element(screen.getByLabelText("Maximum elevation"))
      .toBeVisible();
    await screen.getByLabelText("Minimum elevation").fill("-200");

    // Setting min marks max required and shows its error.
    await expect
      .element(screen.getByLabelText("Maximum elevation *"))
      .toBeVisible();
    await expect
      .element(screen.getByText("Enter the maximum elevation too."))
      .toBeVisible();
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

    await screen.getByRole("tab", { name: "Location" }).click();
    await expect
      .element(screen.getByRole("combobox", { name: "Type", exact: true }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("combobox", { name: "Type *", exact: true }))
      .not.toBeInTheDocument();
  });

  it("should disable unit and datum until an elevation is set", async () => {
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
    await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
    await screen.getByRole("option", { name: "Point" }).click();

    // No value yet: unit and datum are disabled.
    await expect
      .element(screen.getByRole("combobox", { name: "Unit" }))
      .toBeDisabled();

    // A value enables them; select both.
    await screen.getByLabelText("Elevation").fill("100");
    await screen.getByRole("combobox", { name: "Unit *" }).click();
    await screen.getByRole("option", { name: "m", exact: true }).click();
    await screen.getByRole("combobox", { name: "Vertical datum *" }).click();
    await screen.getByRole("option", { name: "Mean sea level" }).click();

    // Clearing the value disables them again; the selection stays (harmless:
    // composeLocation drops unit/datum without a value) and is restored if the
    // user re-enters an elevation.
    await screen.getByLabelText("Elevation").fill("");
    await expect
      .element(screen.getByRole("combobox", { name: "Unit" }))
      .toBeDisabled();
    await expect
      .element(screen.getByRole("combobox", { name: "Unit" }))
      .toHaveTextContent("m");
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
});
