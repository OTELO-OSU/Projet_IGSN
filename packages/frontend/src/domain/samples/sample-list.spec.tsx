import { vi } from "vitest";

import type { CardSample } from "./card-fields.ts";

import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { SampleList } from "./sample-list.tsx";

function sampleItem(overrides: Partial<CardSample> = {}): CardSample {
  return {
    igsn: "0123456789ABCDEFGHJKMNPQRS",
    internalNumber: null,
    name: "Basalt 42",
    nature: "powder",
    type: null,
    material: "rock_and_sediment.rock.igneous",
    specificName: null,
    location: null,
    scientificContext: null,
    collectionMethod: null,
    age: null,
    ...overrides,
  };
}

const samples = [
  sampleItem(),
  sampleItem({
    igsn: "TVWXYZ0123456789ABCDEFGHJK",
    name: "Granite 7",
    material: null,
  }),
];

function renderSampleList(items: CardSample[] = samples, fields?: string[]) {
  return renderWithRouter(<SampleList samples={items} fields={fields} />, [
    "/samples/$igsn",
  ]);
}

function cardLines(card: Element): (string | null)[] {
  return [...card.children].map((line) => line.textContent);
}

describe("SampleList", () => {
  it("should show each sample's name and igsn linking to its page", async () => {
    const screen = await renderSampleList();

    const link = screen.getByRole("link", { name: /Basalt 42/ });
    await expect
      .element(link)
      .toHaveAttribute("href", "/samples/0123456789ABCDEFGHJKMNPQRS");
    await expect
      .element(screen.getByRole("link", { name: /Granite 7/ }))
      .toBeInTheDocument();
  });

  it("should show the internal id beside the igsn when the sample has one", async () => {
    const screen = await renderSampleList([sampleItem({ internalNumber: 42 })]);

    await expect
      .element(
        screen.getByRole("link", { name: /Basalt 42/ }).getByText("sample-42"),
      )
      .toBeInTheDocument();
  });

  it("should show the fixed card fields in the designed order", async () => {
    const screen = await renderSampleList([
      sampleItem({
        type: "core.half_round",
        specificName: "Fresh basalt",
        location: {
          localityName: "Piton de la Fournaise",
          region: { kind: "country", country: "FR" },
        },
        scientificContext: {
          provenanceStatus: "field_sample",
          collectorFirstname: "Marie",
          collectorLastname: "Curie",
          additionalRoles: [],
        },
      }),
    ]);

    const card = screen.getByRole("link", { name: /Basalt 42/ }).element();
    expect(cardLines(card)).toEqual([
      "Basalt 42",
      "0123456789ABCDEFGHJKMNPQRS",
      "Core > Core Half round / Powder",
      "Rock and sediment > Rock > Igneous > Fresh basalt",
      "France > Piton de la Fournaise",
      "Collector name: Marie Curie",
    ]);
  });

  it("should show no line for a field the sample lacks", async () => {
    const screen = await renderSampleList([sampleItem({ material: null })]);

    const card = screen.getByRole("link", { name: /Basalt 42/ }).element();
    expect(cardLines(card)).toEqual([
      "Basalt 42",
      "0123456789ABCDEFGHJKMNPQRS",
      "Powder",
    ]);
  });

  it.each([
    [
      "no trailing separator when the specific name is missing",
      { material: "rock_and_sediment.rock.igneous" },
      "Rock and sediment > Rock > Igneous",
    ],
    [
      "the specific name alone when the sample is unclassified",
      { material: null, specificName: "Fresh basalt" },
      "Fresh basalt",
    ],
  ])("should show %s", async (_case, overrides, expected) => {
    const screen = await renderSampleList([sampleItem(overrides)]);

    await expect
      .element(screen.getByText(expected, { exact: true }))
      .toBeInTheDocument();
  });

  it.each([
    [
      "the ocean before the locality",
      {
        localityName: "Mid-Atlantic Ridge",
        region: { kind: "ocean", oceanSea: "atlantic_ocean" },
      },
      "Atlantic Ocean > Mid-Atlantic Ridge",
    ],
    [
      "the region alone when there is no locality",
      { region: { kind: "ocean", oceanSea: "atlantic_ocean" } },
      "Atlantic Ocean",
    ],
    [
      "the locality alone when there is no region",
      { localityName: "Piton de la Fournaise" },
      "Piton de la Fournaise",
    ],
  ] as const)("should show %s", async (_case, location, expected) => {
    const screen = await renderSampleList([sampleItem({ location })]);

    await expect
      .element(screen.getByText(expected, { exact: true }))
      .toBeInTheDocument();
  });

  it("should show nothing for a region without its leaf", async () => {
    const screen = await renderSampleList([
      sampleItem({ location: { region: { kind: "ocean" } } }),
    ]);

    expect(screen.getByText(/ocean/i).query()).toBeNull();
  });

  it("should show a picked field as a labelled line", async () => {
    const screen = await renderSampleList(
      [sampleItem({ collectionMethod: "blasting" })],
      ["collectionMethod"],
    );

    await expect
      .element(screen.getByText("Collection method: Blasting", { exact: true }))
      .toBeInTheDocument();
  });

  it("should show no line for a picked field the sample lacks", async () => {
    const screen = await renderSampleList([sampleItem()], ["collectionMethod"]);

    const card = screen.getByRole("link", { name: /Basalt 42/ }).element();
    expect(cardLines(card)).toEqual([
      "Basalt 42",
      "0123456789ABCDEFGHJKMNPQRS",
      "Powder",
      "Rock and sediment > Rock > Igneous",
    ]);
  });

  it("should show the collector of a collection specimen", async () => {
    const screen = await renderSampleList([
      sampleItem({
        scientificContext: {
          provenanceStatus: "collection_specimen",
          collectorFirstname: "Marie",
          collectorLastname: "Curie",
        },
      }),
    ]);

    await expect
      .element(screen.getByText("Collector name: Marie Curie"))
      .toBeInTheDocument();
  });

  it("should show a collector without a firstname as the lastname alone", async () => {
    const screen = await renderSampleList([
      sampleItem({
        scientificContext: {
          provenanceStatus: "field_sample",
          collectorLastname: "Curie",
          additionalRoles: [],
        },
      }),
    ]);

    await expect
      .element(screen.getByText("Collector name: Curie", { exact: true }))
      .toBeInTheDocument();
  });

  it("should show the picked chief scientist as one name", async () => {
    const screen = await renderSampleList(
      [
        sampleItem({
          scientificContext: {
            provenanceStatus: "field_sample",
            chiefScientistFirstname: "Marie",
            chiefScientistLastname: "Curie",
            additionalRoles: [],
          },
        }),
      ],
      ["chiefScientist"],
    );

    await expect
      .element(
        screen.getByText("Chief scientist: Marie Curie", { exact: true }),
      )
      .toBeInTheDocument();
  });

  it("should report the hovered sample, then none once the pointer leaves", async () => {
    const onHoverSample = vi.fn();
    const screen = await renderWithRouter(
      <SampleList samples={samples} onHoverSample={onHoverSample} />,
      ["/samples/$igsn"],
    );

    await screen.getByRole("link", { name: /Granite 7/ }).hover();
    await screen.getByRole("link", { name: /Basalt 42/ }).hover();

    expect(
      onHoverSample.mock.calls.slice(-3).map(([sample]) => sample?.igsn),
    ).toEqual([
      "TVWXYZ0123456789ABCDEFGHJK",
      undefined,
      "0123456789ABCDEFGHJKMNPQRS",
    ]);
  });
});
