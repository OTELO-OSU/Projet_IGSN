import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";
import type { SampleRelation } from "@projet-igsn/domain/sample/relation/model";

import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { RelationsView } from "./relations-view.tsx";

const IGSN = "0123456789ABCDEFGHJKMNPQRS";

const relation = (overrides: Partial<SampleRelation> = {}): SampleRelation => ({
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  relationType: "is_cited_by",
  identifierType: "doi",
  identifier: "https://doi.org/10.1594/IEDA.100252",
  targetTitle: "Companion dataset",
  targetResourceType: "dataset",
  relationTypeInformation: null,
  relatedMetadataScheme: null,
  schemeURI: null,
  schemeType: null,
  description: "Measurements published alongside the sample",
  ...overrides,
});

const attachment = (
  overrides: Partial<SampleAttachment> = {},
): SampleAttachment => ({
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3302",
  name: "measurements.csv",
  mediaType: "text/csv",
  title: null,
  targetResourceType: null,
  description: "Raw XRF measurements",
  ...overrides,
});

const renderRelations = (
  relations: SampleRelation[],
  attachments: SampleAttachment[] = [],
) =>
  renderWithRouter(
    <RelationsView
      igsn={IGSN}
      relations={relations}
      attachments={attachments}
    />,
    ["/samples/$igsn"],
  );

describe("RelationsView", () => {
  it.each([
    {
      identifierType: "doi" as const,
      identifier: "https://doi.org/10.1594/IEDA.100252",
      href: "https://doi.org/10.1594/IEDA.100252",
    },
    {
      identifierType: "doi" as const,
      identifier: "doi:10.1594/IEDA.100252",
      href: "https://doi.org/10.1594/IEDA.100252",
    },
    {
      identifierType: "url" as const,
      identifier: "https://example.org/dataset/42",
      href: "https://example.org/dataset/42",
    },
    {
      identifierType: "handle" as const,
      identifier: "https://hdl.handle.net/2027/x",
      href: "https://hdl.handle.net/2027/x",
    },
  ])(
    "should link a $identifierType relation targeting $identifier to $href",
    async ({ href, ...overrides }) => {
      const screen = await renderRelations([relation(overrides)]);

      const anchor = screen.getByRole("link", { name: "Companion dataset" });
      await expect.element(anchor).toHaveAttribute("href", href);
    },
  );

  it("should link an igsn relation to our own sample page", async () => {
    const screen = await renderRelations([
      relation({
        identifierType: "igsn",
        identifier: "0123456789abcdefghjkmnpqrs",
      }),
    ]);

    const anchor = screen.getByRole("link", { name: "Companion dataset" });
    await expect
      .element(anchor)
      .toHaveAttribute("href", "/samples/0123456789ABCDEFGHJKMNPQRS");
  });

  it.each([
    { identifierType: "isbn" as const, identifier: "978-3-16-148410-0" },
    { identifierType: "igsn" as const, identifier: "not-an-igsn" },
  ])(
    "should render a $identifierType relation targeting $identifier as text, not a link",
    async (overrides) => {
      const screen = await renderRelations([relation(overrides)]);

      await expect.element(screen.getByText("Companion dataset")).toBeVisible();
      await expect
        .element(screen.getByText(overrides.identifier))
        .toBeVisible();
      expect(
        screen.getByRole("link", { name: "Companion dataset" }).query(),
      ).toBeNull();
    },
  );

  it("should describe a relation by its relation type, identifier type and resource type", async () => {
    const screen = await renderRelations([relation()]);

    await expect
      .element(screen.getByText("Is cited by · DOI · Dataset"))
      .toBeVisible();
    await expect
      .element(screen.getByText("Measurements published alongside the sample"))
      .toBeVisible();
  });

  it("should omit the resource type when the relation has none", async () => {
    const screen = await renderRelations([
      relation({ targetResourceType: null }),
    ]);

    await expect.element(screen.getByText("Is cited by · DOI")).toBeVisible();
  });

  it.each([
    { title: null, expected: "measurements.csv" },
    { title: "Analysis table", expected: "Analysis table" },
  ])("should name an attachment $expected", async ({ title, expected }) => {
    const screen = await renderRelations([], [attachment({ title })]);

    await expect.element(screen.getByText(expected)).toBeVisible();
  });

  it("should show the attachment resource type when set", async () => {
    const screen = await renderRelations(
      [],
      [attachment({ targetResourceType: "dataset" })],
    );

    await expect.element(screen.getByText("Dataset")).toBeVisible();
  });

  it("should render a download link per attachment", async () => {
    const item = attachment();
    const screen = await renderRelations([], [item]);

    await expect
      .element(screen.getByText("Raw XRF measurements"))
      .toBeVisible();
    const download = screen.getByRole("link", {
      name: "Download measurements.csv",
    });
    await expect
      .element(download)
      .toHaveAttribute(
        "href",
        expect.stringContaining(`samples/${IGSN}/attachments/${item.id}`),
      );
  });

  it("should head the attachment list only, the section already naming the relations", async () => {
    const screen = await renderRelations([relation()], [attachment()]);

    await expect
      .element(screen.getByRole("heading", { name: "Attached files" }))
      .toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Related resources" }).query(),
    ).toBeNull();
  });

  it("should hide the attachment heading when the sample has no attachment", async () => {
    const screen = await renderRelations([relation()]);

    expect(
      screen.getByRole("heading", { name: "Attached files" }).query(),
    ).toBeNull();
  });
});
