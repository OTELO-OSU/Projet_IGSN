import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { render } from "vitest-browser-react";

import type { CardSample } from "./card-fields.ts";

import { SampleList } from "./sample-list.tsx";

function sampleItem(overrides: Partial<CardSample> = {}): CardSample {
  return {
    igsn: "0123456789ABCDEFGHJKMNPQRS",
    name: "Basalt 42",
    nature: "rock_powder",
    type: null,
    material: "rock.igneous",
    specificName: null,
    location: null,
    scientificContext: null,
    collectionMethod: null,
    texture: null,
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
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <SampleList samples={items} fields={fields} />,
  });
  const sampleRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/samples/$igsn",
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, sampleRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
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

  it("should show the fixed card fields in the designed order", async () => {
    const screen = await renderSampleList([
      sampleItem({
        type: "core.half_round",
        specificName: "Fresh basalt",
        location: {
          localityName: "Piton de la Fournaise",
          region: { kind: "continent", country: "FR" },
        },
        scientificContext: {
          provenanceStatus: "recent_collection",
          collectorName: "Marie Curie",
        },
      }),
    ]);

    const card = screen.getByRole("link", { name: /Basalt 42/ }).element();
    expect(cardLines(card)).toEqual([
      "Basalt 42",
      "0123456789ABCDEFGHJKMNPQRS",
      "Core > Core Half round / Rock powder",
      "Rock > Igneous > Fresh basalt",
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
      "Rock powder",
    ]);
  });

  it.each([
    [
      "no trailing separator when the specific name is missing",
      { material: "rock.igneous" },
      "Rock > Igneous",
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
      "Rock powder",
      "Rock > Igneous",
    ]);
  });

  it.each([
    ["a recent collection", "recent_collection"],
    ["a historical specimen", "historical_specimen"],
  ] as const)("should show the collector of %s", async (_case, status) => {
    const screen = await renderSampleList([
      sampleItem({
        scientificContext: {
          provenanceStatus: status,
          collectorName: "Marie Curie",
        },
      }),
    ]);

    await expect
      .element(screen.getByText("Collector name: Marie Curie"))
      .toBeInTheDocument();
  });
});
