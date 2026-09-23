import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { TooltipProvider } from "@projet-igsn/design-system/components/ui/tooltip";
import { vi } from "vitest";

import { render } from "../../test/render.tsx";
import { SampleForm, type SampleFormParent } from "./sample-form.tsx";

const noop = () => {};

const defaultValues = {
  name: "Lame mince MC-2026-007",
  nature: "thin_section",
  type: null,
  material: "rock_and_sediment.mineral",
  collectionMethod: null,
  collectionMethodDescription: null,
  specificName: null,
  location: null,
} satisfies Partial<CreateSample> as CreateSample;

const parent: SampleFormParent = {
  igsn: "01K072TVWVFK5A1RRZ5MY4PPK9",
  name: "Basalte du Massif Central",
  material: "rock_and_sediment.mineral",
};

const publishableValues = {
  ...defaultValues,
  type: "individual_sample",
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
  scientificContext: {
    provenanceStatus: "field_sample",
    additionalRoles: [],
    collectorFirstname: "Pierre",
    collectorLastname: "Curie",
  },
  repository: { currentArchiveLaboratory: "UMR6112" },
} satisfies Partial<CreateSample> as CreateSample;

type Screen = Awaited<ReturnType<typeof render>>;

const renderSubSampleForm = async (
  onSubmit: (value: CreateSample) => void = noop,
): Promise<Screen> => {
  const screen = await render(
    <SampleForm
      onCancel={noop}
      defaultValues={defaultValues}
      parents={[parent]}
      primaryAction={{ kind: "submit", label: "Save", onSubmit }}
    />,
  );
  return screen;
};

const stepBlock = (screen: Screen, index: number, kind: string) =>
  screen.getByRole("group", { name: `${index}. ${kind} step`, exact: true });

const addStep = async (screen: Screen, kind: string) => {
  await screen.getByRole("button", { name: "Add a process step" }).click();
  await screen.getByRole("menuitem", { name: kind, exact: true }).click();
};

describe("SampleProcessStepsFields", () => {
  it.each([
    { parents: [parent], present: true },
    { parents: [], present: false },
  ])(
    "should offer the process steps on a sub sample only: $present",
    async ({ parents, present }) => {
      const screen = await render(
        <SampleForm
          onCancel={noop}
          defaultValues={defaultValues}
          parents={parents}
          primaryAction={{ kind: "submit", label: "Save", onSubmit: noop }}
        />,
      );

      if (present) {
        await expect
          .element(screen.getByRole("heading", { name: "Process steps" }))
          .toBeVisible();
      } else {
        await expect
          .element(screen.getByRole("heading", { name: "Process steps" }))
          .not.toBeInTheDocument();
      }
    },
  );

  it("should submit the entered process step", async () => {
    const onSubmit = vi.fn();
    const screen = await renderSubSampleForm(onSubmit);

    await addStep(screen, "Preparation");
    const block = stepBlock(screen, 1, "Preparation");
    await block.getByLabelText("Date *", { exact: true }).fill("2026-02-10");
    await block.getByLabelText("Description").fill("Cut into thin sections");
    await screen.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          processSteps: [
            {
              kind: "preparation",
              date: {
                precision: "day",
                start: "2026-02-10",
                end: "2026-02-10",
              },
              description: "Cut into thin sections",
            },
          ],
        }),
      ),
    );
  });

  it("should submit a step carrying its kind alone", async () => {
    const onSubmit = vi.fn();
    const screen = await renderSubSampleForm(onSubmit);

    await addStep(screen, "Preservation");
    await screen.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ processSteps: [{ kind: "preservation" }] }),
      ),
    );
  });

  it("should insert an added step at its rank in the process order", async () => {
    const onSubmit = vi.fn();
    const screen = await renderSubSampleForm(onSubmit);

    await addStep(screen, "Transformation");
    await stepBlock(screen, 1, "Transformation")
      .getByLabelText("Description")
      .fill("Powdered");
    await addStep(screen, "Sub-sampling");
    await stepBlock(screen, 1, "Sub-sampling")
      .getByLabelText("Description")
      .fill("Sawn into three slabs");
    await addStep(screen, "Sub-sampling");
    await stepBlock(screen, 2, "Sub-sampling")
      .getByLabelText("Description")
      .fill("Split with a chisel");
    await screen.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          processSteps: [
            { kind: "subsampling", description: "Sawn into three slabs" },
            { kind: "subsampling", description: "Split with a chisel" },
            { kind: "transformation", description: "Powdered" },
          ],
        }),
      ),
    );
  });

  it("should renumber and submit the steps left once one is removed", async () => {
    const onSubmit = vi.fn();
    const screen = await renderSubSampleForm(onSubmit);

    await addStep(screen, "Preparation");
    await stepBlock(screen, 1, "Preparation")
      .getByLabelText("Description")
      .fill("Broken with a hammer");
    await addStep(screen, "Transformation");
    await stepBlock(screen, 2, "Transformation")
      .getByLabelText("Description")
      .fill("Powdered");
    await stepBlock(screen, 1, "Preparation")
      .getByRole("button", { name: "Remove process step 1" })
      .click();

    await expect.element(stepBlock(screen, 1, "Transformation")).toBeVisible();

    await screen.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          processSteps: [{ kind: "transformation", description: "Powdered" }],
        }),
      ),
    );
  });

  const renderPublishForm = (processSteps: CreateSample["processSteps"]) =>
    render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          parents={[parent]}
          defaultValues={{ ...publishableValues, processSteps }}
          primaryAction={{
            kind: "publish",
            label: "Save & Publish",
            onPublish: noop,
          }}
        />
      </TooltipProvider>,
    );

  it("should disable Save & Publish and explain in a tooltip when a process step carries no date", async () => {
    const screen = await renderPublishForm([{ kind: "preparation" }]);

    const publish = screen.getByRole("button", { name: "Save & Publish" });
    await expect.element(publish).toBeDisabled();

    publish.element().closest<HTMLElement>("[tabindex]")?.focus();
    await expect
      .element(screen.getByRole("tooltip"))
      .toHaveTextContent(/date every process step before publishing/i);
  });

  it("should keep the saved process steps editable on a published sample", async () => {
    const screen = await render(
      <TooltipProvider>
        <SampleForm
          onCancel={noop}
          status="published"
          parents={[parent]}
          defaultValues={{
            ...defaultValues,
            processSteps: [
              { kind: "preparation", description: "Cut into thin sections" },
            ],
          }}
          primaryAction={{ kind: "submit", label: "Save", onSubmit: noop }}
        />
      </TooltipProvider>,
    );

    const description = stepBlock(screen, 1, "Preparation").getByLabelText(
      "Description",
    );
    await expect.element(description).toHaveValue("Cut into thin sections");
    await expect.element(description).toBeEnabled();
    await expect
      .element(screen.getByRole("button", { name: "Add a process step" }))
      .toBeVisible();
  });
});
