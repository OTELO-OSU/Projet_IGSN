import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { HttpResponse, http } from "msw";
import { vi } from "vitest";

import { fakeSample } from "../../test/fake-sample.ts";
import { worker } from "../../test/msw.ts";
import { render } from "../../test/render.tsx";
import { SampleForm } from "./sample-form.tsx";

const SAMPLE_ID = fakeSample.id;

beforeAll(() => {
  worker.use(
    http.get("*/samples/:id", () =>
      HttpResponse.json({ data: fakeSample, role: "owner" }),
    ),
  );
});

const noop = () => {};

const saveAction = (onSubmit: (value: CreateSample) => void) =>
  ({ kind: "submit", label: "Save", onSubmit }) as const;

const defaultValues: CreateSample = {
  name: "Basalte du Massif Central",
  nature: "thin_section",
  type: null,
  material: null,
  collectionMethod: null,
  collectionMethodDescription: null,
  specificName: null,
  location: null,
};

const renderEditForm = (onSubmit: (value: CreateSample) => void) =>
  render(
    <SampleForm
      onCancel={noop}
      defaultValues={defaultValues}
      primaryAction={saveAction(onSubmit)}
      sampleId={SAMPLE_ID}
    />,
  );

type Screen = Awaited<ReturnType<typeof renderEditForm>>;

const relationBlock = (screen: Screen, index: number) =>
  screen.getByRole("group", { name: `Relation ${index}`, exact: true });

const select = async (
  screen: Screen,
  block: ReturnType<typeof relationBlock>,
  field: string,
  option: string,
) => {
  await block.getByRole("combobox", { name: field }).click();
  await screen.getByRole("option", { name: option }).click();
};

describe("SampleForm related resources tab", () => {
  it("should offer the relations but no attachments during creation", async () => {
    const screen = await render(
      <SampleForm onCancel={noop} primaryAction={saveAction(vi.fn())} />,
    );

    await screen.getByRole("tab", { name: "Related URL or document" }).click();

    await expect
      .element(screen.getByRole("heading", { name: "Related resources" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("heading", { name: "Attached files" }))
      .not.toBeInTheDocument();
  });

  it("should title one block per relation", async () => {
    const screen = await renderEditForm(vi.fn());

    await screen.getByRole("tab", { name: "Related URL or document" }).click();
    await screen.getByRole("button", { name: "Add a relation" }).click();
    await screen.getByRole("button", { name: "Add a relation" }).click();

    await expect.element(relationBlock(screen, 1)).toBeVisible();
    await expect.element(relationBlock(screen, 2)).toBeVisible();
  });

  it("should add a relation and submit it", async () => {
    const onSubmit = vi.fn();
    const screen = await renderEditForm(onSubmit);

    await screen.getByRole("tab", { name: "Related URL or document" }).click();
    await screen.getByRole("button", { name: "Add a relation" }).click();
    const block = relationBlock(screen, 1);
    await select(screen, block, "Relation type", "Is cited by");
    await select(screen, block, "Identifier type", "DOI");
    await block
      .getByRole("textbox", { name: "Identifier" })
      .fill("https://doi.org/10.1594/IEDA.100252");
    await block.getByLabelText("Title").fill("Companion dataset");
    await select(screen, block, "Resource type", "Journal article");
    await block.getByLabelText("Relation information").fill("Table 2");
    await block.getByLabelText("Description").fill("Cites this sample");
    await screen.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: [
            {
              relationType: "is_cited_by",
              identifierType: "doi",
              identifier: "https://doi.org/10.1594/IEDA.100252",
              targetTitle: "Companion dataset",
              targetResourceType: "journal_article",
              relationTypeInformation: "Table 2",
              description: "Cites this sample",
            },
          ],
        }),
      ),
    );
  });

  it("should remove a relation row before saving", async () => {
    const onSubmit = vi.fn();
    const screen = await renderEditForm(onSubmit);

    await screen.getByRole("tab", { name: "Related URL or document" }).click();
    await screen.getByRole("button", { name: "Add a relation" }).click();
    const block = relationBlock(screen, 1);
    await block
      .getByRole("textbox", { name: "Identifier" })
      .fill("https://doi.org/10.1594/IEDA.100252");
    await block.getByRole("button", { name: "Remove relation 1" }).click();
    await screen.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0]).not.toHaveProperty("relations");
  });

  it("should offer the metadata scheme fields only while the relation has metadata", async () => {
    const screen = await renderEditForm(vi.fn());

    await screen.getByRole("tab", { name: "Related URL or document" }).click();
    await screen.getByRole("button", { name: "Add a relation" }).click();
    const block = relationBlock(screen, 1);

    expect(block.getByLabelText("Metadata scheme").query()).toBeNull();

    await select(screen, block, "Relation type", "Has metadata");

    await expect.element(block.getByLabelText("Metadata scheme")).toBeVisible();
    await expect.element(block.getByLabelText("Scheme URI")).toBeVisible();
    await expect.element(block.getByLabelText("Scheme type")).toBeVisible();

    await select(screen, block, "Relation type", "Documents");

    expect(block.getByLabelText("Metadata scheme").query()).toBeNull();
    expect(block.getByLabelText("Scheme URI").query()).toBeNull();
    expect(block.getByLabelText("Scheme type").query()).toBeNull();
  });

  it("should show the target URI format example of the selected identifier type", async () => {
    const screen = await renderEditForm(vi.fn());

    await screen.getByRole("tab", { name: "Related URL or document" }).click();
    await screen.getByRole("button", { name: "Add a relation" }).click();
    const block = relationBlock(screen, 1);

    await expect
      .element(block.getByRole("textbox", { name: "Identifier" }))
      .not.toHaveAttribute("placeholder");

    await select(screen, block, "Identifier type", "DOI");

    await expect
      .element(block.getByRole("textbox", { name: "Identifier" }))
      .toHaveAttribute("placeholder", "https://doi.org/10.1594/IEDA.100252");
  });

  it("should refuse to save a blank relation row and flag its required fields", async () => {
    const onSubmit = vi.fn();
    const screen = await renderEditForm(onSubmit);

    await screen.getByRole("tab", { name: "Related URL or document" }).click();
    await screen.getByRole("button", { name: "Add a relation" }).click();
    await screen.getByRole("button", { name: "Save" }).click();

    const block = relationBlock(screen, 1);
    await expect
      .element(block.getByRole("textbox", { name: "Identifier" }))
      .toHaveAccessibleDescription("Required.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("should not flag untouched sibling fields when the identifier type is set", async () => {
    const screen = await renderEditForm(vi.fn());

    await screen.getByRole("tab", { name: "Related URL or document" }).click();
    await screen.getByRole("button", { name: "Add a relation" }).click();
    const block = relationBlock(screen, 1);

    await select(screen, block, "Identifier type", "DOI");

    await expect
      .element(block.getByRole("textbox", { name: "Identifier" }))
      .not.toHaveAccessibleDescription("Required.");
    await expect
      .element(block.getByLabelText("Title"))
      .not.toHaveAccessibleDescription("Required.");
  });

  it("should show the target URI format error before submit", async () => {
    const screen = await renderEditForm(vi.fn());

    await screen.getByRole("tab", { name: "Related URL or document" }).click();
    await screen.getByRole("button", { name: "Add a relation" }).click();
    const block = relationBlock(screen, 1);

    await select(screen, block, "Relation type", "Is cited by");
    await select(screen, block, "Identifier type", "DOI");
    await block.getByLabelText("Title").fill("Companion dataset");
    await block
      .getByRole("textbox", { name: "Identifier" })
      .fill("10.1594/IEDA.100252");

    await expect
      .element(
        block.getByText(
          "Enter a DOI (https://doi.org/10.xxxx/... or doi:10.xxxx/...).",
        ),
      )
      .toBeVisible();
  });

  it("should prefill saved relations", async () => {
    const screen = await render(
      <SampleForm
        onCancel={noop}
        defaultValues={{
          ...defaultValues,
          relations: [
            {
              relationType: "has_metadata",
              identifierType: "doi",
              identifier: "https://doi.org/10.1594/IEDA.100252",
              targetTitle: "IEDA companion dataset",
              targetResourceType: null,
              relationTypeInformation: null,
              relatedMetadataScheme: "DataCite",
              schemeURI: null,
              schemeType: null,
              description: null,
            },
          ],
        }}
        primaryAction={saveAction(vi.fn())}
        sampleId={SAMPLE_ID}
      />,
    );

    await screen.getByRole("tab", { name: "Related URL or document" }).click();

    const block = relationBlock(screen, 1);
    await expect
      .element(block.getByRole("textbox", { name: "Identifier" }))
      .toHaveValue("https://doi.org/10.1594/IEDA.100252");
    await expect
      .element(block.getByLabelText("Metadata scheme"))
      .toHaveValue("DataCite");
  });
});
