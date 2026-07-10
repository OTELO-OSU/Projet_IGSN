import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { render } from "vitest-browser-react";

import { SampleList } from "./sample-list.tsx";

const samples = [
  {
    igsn: "0123456789ABCDEFGHJKMNPQRS",
    name: "Basalt 42",
    material: "rock.igneous",
  },
  { igsn: "TVWXYZ0123456789ABCDEFGHJK", name: "Granite 7", material: null },
];

// SampleList navigates with the router <Link>, so it must render inside a
// router. A minimal in-memory tree carrying the sample route is enough to build
// the hrefs; locale prefixing is a router-level concern covered by the e2e.
function renderSampleList() {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <SampleList samples={samples} />,
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

    // "Granite 7" has a null material, so no material badge renders for it.
    await expect
      .element(screen.getByRole("link", { name: /Granite 7/ }))
      .toBeInTheDocument();
    expect(screen.getByText("Sediment").query()).toBeNull();
  });
});
