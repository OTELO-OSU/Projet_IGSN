import type { Sample } from "@projet-igsn/domain/sample/sample";

import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { render } from "vitest-browser-react";

import { SampleTable } from "./sample-table.tsx";

const samples: Sample[] = [
  {
    id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    name: "Basalte du Massif Central",
    nature: "thin_section",
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T10:00:00.000Z"),
  },
];

// The table links to the edit route, so render it inside a minimal router
// with a stub edit page to observe navigation.
function renderTable(data: Sample[]) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <SampleTable samples={data} />,
  });
  const editRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/samples/$sampleId",
    component: () => <p>Edit page stub</p>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, editRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
}

describe("SampleTable", () => {
  it("should render the column headers", async () => {
    const screen = await renderTable(samples);
    await expect.element(screen.getByText("Name")).toBeInTheDocument();
    await expect.element(screen.getByText("Nature")).toBeInTheDocument();
    await expect.element(screen.getByText("Last modified")).toBeInTheDocument();
  });

  it("should render a sample row with the last-modified date as yyyy-mm-dd", async () => {
    const screen = await renderTable(samples);
    await expect
      .element(screen.getByText("Basalte du Massif Central"))
      .toBeInTheDocument();
    await expect.element(screen.getByText("Thin section")).toBeInTheDocument();
    await expect.element(screen.getByText("2026-07-01")).toBeInTheDocument();
  });

  it("should show an empty state when there are no samples", async () => {
    const screen = await renderTable([]);
    await expect.element(screen.getByText("No results")).toBeInTheDocument();
  });

  it("should link the sample name to its edit page", async () => {
    const screen = await renderTable(samples);
    await expect
      .element(screen.getByRole("link", { name: "Basalte du Massif Central" }))
      .toHaveAttribute("href", "/samples/3f2504e0-4f89-41d3-9a0c-0305e82c3301");
  });

  it("should navigate to the edit page when the row is clicked", async () => {
    const screen = await renderTable(samples);
    // Click a non-link cell to prove the whole row is clickable.
    await screen.getByText("Thin section").click();
    await expect.element(screen.getByText("Edit page stub")).toBeVisible();
  });
});
