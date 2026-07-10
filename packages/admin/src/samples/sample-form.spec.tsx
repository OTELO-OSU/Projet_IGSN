import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { TooltipProvider } from "@projet-igsn/design-system/components/ui/tooltip";
import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { SampleForm, sampleTypeFormSchema } from "./sample-form.tsx";

const noop = () => {};

describe("sampleTypeFormSchema", () => {
  it.each([
    { typePath: [] }, // no type chosen yet (draft)
    { typePath: ["dredge"] }, // leaf root type, no sub-values
    { typePath: ["core", "core.piece"] }, // core refined to a leaf
  ])("should accept %o", (value) => {
    expect(sampleTypeFormSchema.safeParse(value).success).toBe(true);
  });

  it.each([
    { typePath: ["core"] }, // core picked, no sub-type
    { typePath: ["core", "core"] }, // bare "core" sub-option is still vague
  ])("should require a sub-type for %o", (value) => {
    const result = sampleTypeFormSchema.safeParse(value);
    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        path: ["typePath", 1],
        message: "Select a sub-type.",
      }),
    ]);
  });
});

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
        specificName: null,
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
        specificName: null,
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
        specificName: null,
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
        specificName: null,
      }),
    );
  });

  it("should reject a bare core type and require a sub-type", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={createAction(onSubmit)} />,
    );

    await screen.getByLabelText(/name/i).fill("Basalte du Massif Central");
    await screen.getByRole("combobox", { name: "Nature" }).click();
    await screen.getByText("Thin section").click();
    await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
    await screen.getByRole("option", { name: "Core" }).click();
    // Pick the bare "Core" option: it is not a specific-enough classification.
    await screen.getByRole("combobox", { name: "Core" }).click();
    await screen.getByRole("option", { name: "Core", exact: true }).click();
    await screen.getByRole("button", { name: "Create" }).click();

    await expect.element(screen.getByText("Select a sub-type.")).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
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
        specificName: null,
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
    await screen.getByLabelText(/^material \*/i).click();
    await screen.getByRole("option", { name: "Rock", exact: true }).click();
    await screen.getByLabelText(/^rock$/i).click();
    await screen.getByRole("option", { name: "Igneous", exact: true }).click();

    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Basalt",
        nature: "thin_section",
        type: null,
        material: "rock.igneous",
        collectionMethod: null,
        specificName: null,
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
        specificName: "MC-2026-007",
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
        specificName: null,
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
        // A leaf type and leaf material are required to publish, so Save &
        // Publish is enabled.
        defaultValues={{
          name: "Basalte du Massif Central",
          nature: "thin_section",
          type: "dredge",
          material: "fossil",
          collectionMethod: null,
          specificName: "MC-2026-007",
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
        specificName: "MC-2026-007",
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
});
