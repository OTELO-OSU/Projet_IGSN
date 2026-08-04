import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { render } from "vitest-browser-react";

import type { SampleListItem } from "./sample-list.tsx";

import { SampleList } from "./sample-list.tsx";

function sampleItem(overrides: Partial<SampleListItem> = {}): SampleListItem {
  return {
    igsn: "0123456789ABCDEFGHJKMNPQRS",
    name: "Basalt 42",
    material: "rock.igneous",
    location: null,
    scientificContext: null,
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

// SampleList navigates with the router <Link>, so it must render inside a
// router.
function renderSampleList(items: SampleListItem[] = samples) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <SampleList samples={items} />,
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

describe("SampleList", () => {
  it("should show each sample's name and igsn linking to its page", async () => {
    const screen = await renderSampleList();

    const link = screen.getByRole("link", { name: /Basalt 42/ });
    await expect
      .element(link)
      .toHaveAttribute("href", "/samples/0123456789ABCDEFGHJKMNPQRS");
    await expect
      .element(screen.getByText("0123456789ABCDEFGHJKMNPQRS"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("link", { name: /Granite 7/ }))
      .toBeInTheDocument();
  });

  it("should label a classified sample with its material root", async () => {
    const screen = await renderSampleList();

    await expect.element(screen.getByText("Rock")).toBeInTheDocument();
  });

  it("should show no material badge when the sample is unclassified", async () => {
    const screen = await renderSampleList();

    await expect
      .element(screen.getByRole("link", { name: /Granite 7/ }))
      .toBeInTheDocument();
    expect(screen.getByText("Sediment").query()).toBeNull();
  });

  it("should show the locality and the country name", async () => {
    const screen = await renderSampleList([
      sampleItem({
        location: {
          localityName: "Piton de la Fournaise",
          region: { kind: "continent", country: "FR" },
        },
      }),
    ]);

    await expect
      .element(
        screen.getByText("Piton de la Fournaise, France", { exact: true }),
      )
      .toBeInTheDocument();
  });

  it("should show the ocean name of a sample collected at sea", async () => {
    const screen = await renderSampleList([
      sampleItem({
        location: { region: { kind: "ocean", oceanSea: "atlantic_ocean" } },
      }),
    ]);

    await expect
      .element(screen.getByText("Atlantic Ocean", { exact: true }))
      .toBeInTheDocument();
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
      .element(screen.getByText("Collected by Marie Curie"))
      .toBeInTheDocument();
  });

  it("should show the locality alone when the sample has no region", async () => {
    const screen = await renderSampleList([
      sampleItem({ location: { localityName: "Piton de la Fournaise" } }),
    ]);

    await expect
      .element(screen.getByText("Piton de la Fournaise", { exact: true }))
      .toBeInTheDocument();
  });

  it("should show nothing for a region without its leaf", async () => {
    const screen = await renderSampleList([
      sampleItem({ location: { region: { kind: "ocean" } } }),
    ]);

    expect(screen.getByText(/ocean/i).query()).toBeNull();
  });

  it("should show no location or collector line when the sample has neither", async () => {
    const screen = await renderSampleList();

    expect(screen.getByText(/Collected by/).query()).toBeNull();
    expect(screen.getByText(",", { exact: true }).query()).toBeNull();
  });
});
